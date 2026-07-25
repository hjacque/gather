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

const WINDOW_DAYS = 30;

const EBAY_SEARCH_GAP_DAYS = 4;

export type SaleSyncCounters = {
  scraped: number;
  withinWindow: number;
  upserted: number;
  skipped: number;
  autoValidated: number;
  autoInvalidated: number;
  reverified: number;
  confirmed: number;
  invalidated: number;
  ebayScraped: number;
  ebayIngested: number;
};

export type SyncSalesResult = SaleSyncCounters & { cardId: string };

export type BatchSyncSalesResult = SaleSyncCounters & {
  cardsSynced: number;
  cardsSkipped: number;
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

type IngestedSale = {
  itemId: string;
  grade: number;
  price: number;
  currency: string;
  title: string;
  soldAt: Date;
  isNew: boolean;
};

type VerifyResult = {
  checked: number;
  confirmed: number;
  invalid: number;
  reverified: number;
};

export class SyncSalesUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort,
    private readonly ebaySalesSource: EbaySalesSource,
    private readonly terapeakSource: TerapeakSalesSource,
    private readonly snapshotService: MarketSalePriceSnapshotService
  ) {}

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

  async executeBatch(filter: GetCardsFilter = {}): Promise<BatchSyncSalesResult> {
    const counters = emptyCounters();
    let cardsSynced = 0;
    let cardsSkipped = 0;

    const { browser, page } = await this.openBrowser();
    try {
      const cards = await this.collectCards(filter);
      const applicable = cards.filter((c) => this.ebaySalesSource.appliesTo(c));
      cardsSkipped = cards.length - applicable.length;

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

  async syncCardOnPage(
    card: CardEntity,
    page: Page,
    into: SaleSyncCounters = emptyCounters()
  ): Promise<SaleSyncCounters> {
    if (!this.ebaySalesSource.appliesTo(card)) return into;
    try {
      await this.processCard(card, page, into);
    } catch (error) {
      if (!(error instanceof TerapeakAuthError)) throw error;
      console.warn(
        `[SyncSales] Terapeak session expired — skipping sales for ${card.name}. ` +
          `Re-authenticate:\n  ${TERAPEAK_REAUTH_CMD}`
      );
    }
    return into;
  }

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

  private async processCard(
    card: CardEntity,
    page: Page,
    counters: SaleSyncCounters
  ): Promise<void> {
    const ingested = await this.ingestTerapeakSales(card, page, counters);
    await this.ingestEbaySearchSales(card, page, counters);
    await this.verifyIngestedSales(card, ingested, page, counters);
  }

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

      const isNew = await this.saleRepository.upsert({
        cardId: card.id,
        platform: "ebay",
        itemId: sale.itemId,
        psaGrade: parsed.grade,
        price: sale.price,
        currency: sale.currency,
        title: sale.title,
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
      if (!sale.isNew) continue;

      const sellerQ = await this.ebaySalesSource.fetchSellerQuality(
        sale.itemId,
        page
      );

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

  async prepareTerapeakSession(page: Page): Promise<void> {
    const all = await this.terapeakSource.selectAllSites(page);
    if (!all) console.warn("[SyncSales] proceeding US-only (All sites not set)");
  }

  private async openBrowser() {
    const userDataDir =
      process.env.EBAY_PROFILE_DIR ??
      `${process.env.HOME ?? "."}/.gather/ebay-profile`;
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
