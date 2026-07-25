import { mkdirSync } from "node:fs";
import { connect } from "puppeteer-real-browser";
import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../entities/card.entity";
import { CardRepositoryPort, GetCardsFilter } from "../../repository/ports/card.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { EbaySalesSource } from "./sources/ebaySales.source";
import {
  TerapeakSalesSource,
  TerapeakAuthError,
  TERAPEAK_REAUTH_CMD,
} from "./sources/terapeakSales.source";
import { parseListingTitle } from "./sources/listingTitleParser";
import { classifyReverification } from "./sources/reverificationClassifier";
import { MarketSalePriceSnapshotService } from "../sale/marketSalePriceSnapshot";

// Trailing window re-fetched on every run; sales older than this are ignored so
// re-running is idempotent over a fixed recent window (see #84).
const WINDOW_DAYS = 30;

// Trailing window the real-time public completed-listings search backfills:
// just the most recent days Terapeak hasn't indexed yet (~3-day lag). Kept
// narrow so this source covers the freshest sales without broadly re-introducing
// Best-Offer asking-price bias on days Terapeak already reports accurately.
// See ADR 0008.
const EBAY_SEARCH_GAP_DAYS = 4;

// Counters accumulated over one or many Cards in a single Sale Sync run.
export type SaleSyncCounters = {
  scraped: number; // Terapeak sale rows returned by the source
  withinWindow: number; // sales inside the trailing 30-day window
  upserted: number; // sales accepted by the parser and persisted
  skipped: number; // candidates rejected by the parser (bundle / foreign / etc.)
  autoValidated: number; // upserted Sales auto-validated by trusted seller
  autoInvalidated: number; // upserted Sales auto-invalidated for a 0-activity seller
  reverified: number; // pending Sales revisited at a checkpoint this run
  confirmed: number; // reverified Sales that survived to 30 days
  invalidated: number; // reverified Sales found gone / relisted
  ebayScraped: number; // public completed-listings candidates returned
  ebayIngested: number; // in-gap, parsed candidates upserted as ebay_search
};

export type SyncSalesResult = SaleSyncCounters & { cardId: string };

export type BatchSyncSalesResult = SaleSyncCounters & {
  cardsSynced: number; // Cards with an ebayLink that were synced
  cardsSkipped: number; // Cards skipped for having no ebayLink
};

const emptyCounters = (): SaleSyncCounters => ({
  scraped: 0,
  withinWindow: 0,
  upserted: 0,
  skipped: 0,
  autoValidated: 0,
  autoInvalidated: 0,
  reverified: 0,
  confirmed: 0,
  invalidated: 0,
  ebayScraped: 0,
  ebayIngested: 0,
});

// A Terapeak sale persisted (as pending) in the authenticated Phase 1, carried
// into the no-auth Phase 2 for seller verification. Grade is already parsed.
type IngestedSale = {
  itemId: string;
  grade: number;
  price: number;
  currency: string;
  title: string;
  soldAt: Date;
  isNew: boolean; // first time this (listing, card) was scraped this run
};

// Per-Card outcome of Phase 2, for progress logging.
type VerifyResult = {
  checked: number; // ingested sales seller-verified (not already decided)
  confirmed: number; // auto-confirmed this Card
  invalid: number; // auto-invalidated this Card
  reverified: number; // due sales revisited at their 7d/30d checkpoint
};

export class SyncSalesUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort,
    private readonly ebaySalesSource: EbaySalesSource,
    private readonly terapeakSource: TerapeakSalesSource,
    private readonly snapshotService: MarketSalePriceSnapshotService
  ) {}

  // Single Card on demand.
  async execute(cardId: string): Promise<SyncSalesResult> {
    const card = await this.cardRepository.getCard(cardId);
    const counters = emptyCounters();

    if (!this.ebaySalesSource.appliesTo(card)) {
      console.log(`[SyncSales] ${card.name} has no ebayLink — skipping`);
      return { cardId, ...counters };
    }

    const { browser, page } = await this.openBrowser();
    try {
      await this.prepareTerapeakSession(page);
      await this.processCard(card, page, counters);
    } catch (error) {
      if (!(error instanceof TerapeakAuthError)) throw error;
      console.error(
        `[SyncSales] Terapeak session expired — could not sync ${card.name}. ` +
          `Re-authenticate and retry:\n  ${TERAPEAK_REAUTH_CMD}`
      );
    } finally {
      await page.close();
      await browser.close();
    }

    const result = { cardId, ...counters };
    console.log(`[SyncSales] ${card.name}:`, result);
    return result;
  }

  // Batch across Cards in one browser session, filterable like the price Sync.
  //
  // Split into two phases so a full all-Cards run survives eBay's short seller
  // session: Phase 1 does only the *authenticated* Terapeak fetches (fast — ~1
  // page/Card), persisting sales as pending; Phase 2 does the *slow, public*
  // eBay seller verification + re-verification, which needs no login. The
  // authenticated window is therefore bounded to Phase 1. If the session expires
  // mid-Phase-1 we stop fetching but still finalize everything ingested so far.
  async executeBatch(filter: GetCardsFilter = {}): Promise<BatchSyncSalesResult> {
    const counters = emptyCounters();
    let cardsSynced = 0;
    let cardsSkipped = 0;

    const { browser, page } = await this.openBrowser();
    try {
      const cards = await this.collectCards(filter);
      const applicable = cards.filter((c) => this.ebaySalesSource.appliesTo(c));
      cardsSkipped = cards.length - applicable.length;

      // Phase 1 — authenticated Terapeak ingest. Persist each Card's sales as
      // pending. A session expiry aborts the loop (no point fetching more), but
      // whatever was ingested still flows to Phase 2.
      const ingestedByCard = new Map<string, IngestedSale[]>();
      const ingestOrder: CardEntity[] = [];
      try {
        await this.prepareTerapeakSession(page);
        for (const card of applicable) {
          ingestedByCard.set(
            card.id,
            await this.ingestTerapeakSales(card, page, counters)
          );
          ingestOrder.push(card);
          await this.sleep(4000 + Math.random() * 4000);
        }
      } catch (error) {
        if (!(error instanceof TerapeakAuthError)) throw error;
        console.error(
          `[SyncSales] Terapeak session expired after ${ingestOrder.length}/${applicable.length} Cards — ` +
            `finalizing what was ingested. Re-authenticate and re-run:\n  ${TERAPEAK_REAUTH_CMD}`
        );
      }

      // Phase 2 — public eBay work (no auth): backfill the fresh-gap sales from
      // the real-time completed-listings search, then seller-verify +
      // re-verify. This is the slow stretch with no per-sale source output, so
      // log a per-Card progress line to make it visibly advance rather than look
      // stalled.
      for (const card of ingestOrder) {
        await this.ingestEbaySearchSales(card, page, counters);
        const r = await this.verifyIngestedSales(
          card,
          ingestedByCard.get(card.id) ?? [],
          page,
          counters
        );
        cardsSynced++;
        console.log(
          `[SyncSales] verify ${cardsSynced}/${ingestOrder.length} ${card.name}: ` +
            `${r.checked} checked → ${r.confirmed} confirmed, ${r.invalid} invalid` +
            (r.reverified ? `, ${r.reverified} re-verified` : "")
        );
      }
    } finally {
      await page.close();
      await browser.close();
    }

    const result = { cardsSynced, cardsSkipped, ...counters };
    console.log("[SyncSales] batch:", result);
    return result;
  }

  // Scrape + re-verify one Card's eBay Sales on a page the caller already owns
  // (e.g. the full price Sync, which holds its own browser session). No-ops for
  // Cards without an ebayLink. Counters accumulate into `into` when provided.
  async syncCardOnPage(
    card: CardEntity,
    page: Page,
    into: SaleSyncCounters = emptyCounters()
  ): Promise<SaleSyncCounters> {
    if (!this.ebaySalesSource.appliesTo(card)) return into;
    try {
      await this.processCard(card, page, into);
    } catch (error) {
      // The Sale Sync is folded into the larger price Sync here, so a lapsed
      // Terapeak session must not crash the run — skip this Card's sales and let
      // prices / listings continue. Re-throw anything else.
      if (!(error instanceof TerapeakAuthError)) throw error;
      console.warn(
        `[SyncSales] Terapeak session expired — skipping sales for ${card.name}. ` +
          `Re-authenticate:\n  ${TERAPEAK_REAUTH_CMD}`
      );
    }
    return into;
  }

  // Page through the Card repository into a single list, so the two phases can
  // each iterate the full set.
  private async collectCards(filter: GetCardsFilter): Promise<CardEntity[]> {
    const all: CardEntity[] = [];
    for (let paginationPage = 1; ; paginationPage++) {
      const cards = await this.cardRepository.getCards(filter, {
        take: 4,
        page: paginationPage,
      });
      if (!cards?.length) break;
      all.push(...cards);
    }
    return all;
  }

  // Both phases for one Card (single-Card paths, where one Card always fits in a
  // session). Phase 1's Terapeak fetch may throw TerapeakAuthError.
  private async processCard(
    card: CardEntity,
    page: Page,
    counters: SaleSyncCounters
  ): Promise<void> {
    const ingested = await this.ingestTerapeakSales(card, page, counters);
    // Backfill the fresh days Terapeak lags behind from the real-time public
    // search. Runs before verify so the re-verification pass sees these too.
    await this.ingestEbaySearchSales(card, page, counters);
    await this.verifyIngestedSales(card, ingested, page, counters);
  }

  // Phase 1 (authenticated): fetch the Card's Terapeak sales — the authoritative
  // transaction prices the public completed-search hides — parse grade + card
  // attribution from each title, and persist the in-window ones as pending.
  // Returns them for Phase 2. Throws TerapeakAuthError if the session has lapsed.
  private async ingestTerapeakSales(
    card: CardEntity,
    page: Page,
    counters: SaleSyncCounters
  ): Promise<IngestedSale[]> {
    const sales = await this.terapeakSource.fetch(card, page);
    counters.scraped += sales.length;

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - WINDOW_DAYS);

    const ingested: IngestedSale[] = [];
    for (const sale of sales) {
      if (sale.soldAt < cutoff) continue;
      counters.withinWindow++;

      const parsed = parseListingTitle(sale.title, { number: card.number });
      if (parsed.kind === "skipped") {
        counters.skipped++;
        continue;
      }

      // Persist as pending; seller is filled in by Phase 2. Terapeak's price is
      // the true accepted price, never an unresolved asking price.
      const isNew = await this.saleRepository.upsert({
        cardId: card.id,
        platform: "ebay",
        itemId: sale.itemId,
        psaGrade: parsed.grade,
        price: sale.price,
        currency: sale.currency,
        title: sale.title,
        // Terapeak reports the realized price, never a Best-Offer ask.
        isBestOffer: false,
        seller: null,
        source: "terapeak",
        soldAt: sale.soldAt,
        reviewedAt: null,
      });
      counters.upserted++;
      ingested.push({
        itemId: sale.itemId,
        grade: parsed.grade,
        price: sale.price,
        currency: sale.currency,
        title: sale.title,
        soldAt: sale.soldAt,
        isNew,
      });
    }
    return ingested;
  }

  // Fresh-gap backfill (public, no auth): pull the most recent sales from the
  // real-time eBay completed-listings search for the days Terapeak hasn't
  // indexed yet. Each public row carries its own seller / trust / activity, so
  // these are seller-decided here at ingest (no extra item-page visit) — unlike
  // Terapeak rows, which have no seller and need Phase 2's item page.
  //
  // Stored with source `ebay_search`: the repository will not let this price
  // overwrite a Terapeak one, and Terapeak upgrades the row (and corrects any
  // Best-Offer asking-price overstatement) once it catches up. Only sales inside
  // the trailing gap are kept; older ones are Terapeak's to report.
  private async ingestEbaySearchSales(
    card: CardEntity,
    page: Page,
    counters: SaleSyncCounters
  ): Promise<void> {
    const candidates = await this.ebaySalesSource.fetch(card, page);
    counters.ebayScraped += candidates.length;

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - EBAY_SEARCH_GAP_DAYS);

    for (const candidate of candidates) {
      if (candidate.soldAt < cutoff) continue;

      const parsed = parseListingTitle(candidate.title, { number: card.number });
      if (parsed.kind === "skipped") continue;

      // Same trust gate as Terapeak's Phase 2, but the verdict is already in the
      // row: trusted seller (or PSA's store) auto-confirms; a zero-activity
      // seller auto-invalidates; everything else stays pending for review.
      const autoConfirm = candidate.seller === "psa" || candidate.trustedSeller;
      const autoInvalidate = !autoConfirm && !candidate.sellerHasActivity;
      const decided = autoConfirm || autoInvalidate;

      await this.saleRepository.upsert({
        cardId: card.id,
        platform: "ebay",
        itemId: candidate.itemId,
        psaGrade: parsed.grade,
        price: candidate.price,
        currency: candidate.currency,
        title: candidate.title,
        // A Best-Offer row's price is the ask, not the realized amount; flag it
        // so pricing excludes it until Terapeak upgrades the row (ADR 0009).
        isBestOffer: candidate.isBestOffer,
        seller: candidate.seller,
        source: "ebay_search",
        soldAt: candidate.soldAt,
        reviewedAt: decided ? new Date() : null,
        status: autoConfirm ? "confirmed" : autoInvalidate ? "invalid" : undefined,
        verificationStage: decided ? "complete" : undefined,
      });
      counters.ebayIngested++;
    }
  }

  // Phase 2 (no auth): for each ingested sale not already decided, read seller
  // quality from the public eBay item page and auto-confirm / auto-invalidate
  // (undecided ones stay pending for human review). Then run the 7d/30d re-
  // verification pass (catches cancellations / refunds) and recompute the
  // Card's snapshot.
  private async verifyIngestedSales(
    card: CardEntity,
    ingested: IngestedSale[],
    page: Page,
    counters: SaleSyncCounters
  ): Promise<VerifyResult> {
    const result: VerifyResult = {
      checked: 0,
      confirmed: 0,
      invalid: 0,
      reverified: 0,
    };

    for (const sale of ingested) {
      // Only verify the seller for first-time scrapes. A sale already in the DB
      // had its seller checked when it was first scraped; the seller's standing
      // won't have meaningfully shifted, and the sale's lifecycle from here is
      // owned by the re-verification pass below. Re-checking it every run is the
      // costliest no-op in this Sync (one eBay item-page load per known sale).
      if (!sale.isNew) continue;

      // Seller quality from the listing's eBay item page (Terapeak has none).
      const sellerQ = await this.ebaySalesSource.fetchSellerQuality(
        sale.itemId,
        page
      );

      // Auto-confirm (skip review) sales from sellers we trust: PSA's own store
      // as the grading authority, plus any seller clearing the reputation bar
      // (5000+ feedback at 99.5%+ positive). A zero-activity seller is a fake-
      // listing signal — auto-invalidate. Undecided sales enter the review queue.
      const autoConfirm = sellerQ.seller === "psa" || sellerQ.trustedSeller;
      const autoInvalidate = !autoConfirm && !sellerQ.sellerHasActivity;
      const decided = autoConfirm || autoInvalidate;

      await this.saleRepository.upsert({
        cardId: card.id,
        platform: "ebay",
        itemId: sale.itemId,
        psaGrade: sale.grade,
        price: sale.price,
        currency: sale.currency,
        title: sale.title,
        // Terapeak-sourced realized price (this re-upsert carries the verified
        // seller), never a Best-Offer ask.
        isBestOffer: false,
        seller: sellerQ.seller,
        source: "terapeak",
        soldAt: sale.soldAt,
        reviewedAt: decided ? new Date() : null,
        status: autoConfirm ? "confirmed" : autoInvalidate ? "invalid" : undefined,
        verificationStage: decided ? "complete" : undefined,
      });
      result.checked++;
      if (autoConfirm) {
        counters.autoValidated++;
        result.confirmed++;
      }
      if (autoInvalidate) {
        counters.autoInvalidated++;
        result.invalid++;
      }

      await this.sleep(2000 + Math.random() * 2000);
    }

    // Re-verification pass: revisit this Card's due pending Sales at their
    // 7-day / 30-day checkpoint and resolve their status.
    const due = await this.saleRepository.getSalesDueForVerification(
      new Date(),
      card.id
    );
    for (const sale of due) {
      const checkpoint = sale.verificationStage === "unverified" ? "7d" : "30d";
      const state = await this.ebaySalesSource.revisitItem(sale.itemId, page);
      const outcome = classifyReverification(state, checkpoint);
      await this.saleRepository.updateVerification(sale.id, outcome);

      counters.reverified++;
      result.reverified++;
      if (outcome.status === "confirmed") counters.confirmed++;
      if (outcome.status === "invalid") counters.invalidated++;

      await this.sleep(2000 + Math.random() * 2000);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await this.snapshotService.recompute(card.id, today, today);
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Set Terapeak's Listing Site to "All sites" once per browser session so the
  // recurring ingest counts non-US marketplaces (.fr/.de/.co.uk/…) too, matching
  // the historical backfill; Terapeak normalizes every price to USD. Must run
  // before the first fetch (it is session state, not a URL param — see
  // TerapeakSalesSource.selectAllSites). Degrades to US-only if the selector
  // isn't found; a lapsed session surfaces as TerapeakAuthError for the caller to
  // handle like any other Terapeak auth failure.
  async prepareTerapeakSession(page: Page): Promise<void> {
    const all = await this.terapeakSource.selectAllSites(page);
    if (!all) console.warn("[SyncSales] proceeding US-only (All sites not set)");
  }

  private async openBrowser() {
    // Persistent Chrome profile: Terapeak is seller-only, so the eBay login
    // cookie must survive between runs. Log in by hand once in this profile and
    // every later session reuses it. Override the location with EBAY_PROFILE_DIR.
    const userDataDir =
      process.env.EBAY_PROFILE_DIR ??
      `${process.env.HOME ?? "."}/.gather/ebay-profile`;
    // chrome-launcher writes chrome-out.log into the profile dir on launch and
    // does not create it, so ensure it exists first.
    mkdirSync(userDataDir, { recursive: true });
    const { browser, page } = await connect({
      headless: false,
      disableXvfb: false,
      args: [],
      customConfig: { userDataDir },
      turnstile: true,
      connectOption: { defaultViewport: null },
      ignoreAllFlags: false,
      plugins: [require("puppeteer-extra-plugin-stealth")()],
    });
    await page.setViewport({
      width: Math.floor(1024 + Math.random() * 100),
      height: Math.floor(768 + Math.random() * 100),
    });
    return { browser, page };
  }
}
