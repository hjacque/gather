import { connect } from "puppeteer-real-browser";
import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../entities/card.entity";
import { NewAuction } from "../../entities/auction.entity";
import {
  CardRepositoryPort,
  GetCardsFilter,
} from "../../repository/ports/card.repository.port";
import { AuctionRepositoryPort } from "../../repository/ports/auction.repository.port";
import { EbayAuctionsSource } from "./sources/ebayAuctions.source";
import { EbayItemPageSource } from "./sources/ebayItemPage.source";
import { parseItemPageSellerFeedback } from "./sources/listingItemPage";
import { parseAuctionItemPage } from "./sources/auctionItemPage";
import { parseListingTitle } from "./sources/listingTitleParser";

// Counters accumulated over one or many Cards in a single Auction Sync run.
export type AuctionSyncCounters = {
  scraped: number; // candidates returned by the source
  stored: number; // candidates accepted by the parser and persisted
  skippedTitle: number; // candidates rejected by the parser (bundle / foreign / etc.)
  skippedLocation: number; // candidates dropped for non-EU / unknown provenance
  skippedSeller: number; // candidates dropped for a zero-feedback seller
  skippedEnded: number; // candidates that ended between search and item-page visit
};

export type BatchSyncAuctionsResult = AuctionSyncCounters & {
  cardsSynced: number; // Cards with an ebayLink that were synced
  cardsSkipped: number; // Cards skipped for having no ebayLink
};

const emptyCounters = (): AuctionSyncCounters => ({
  scraped: 0,
  stored: 0,
  skippedTitle: 0,
  skippedLocation: 0,
  skippedSeller: 0,
  skippedEnded: 0,
});

// The auction sibling of the Listings Sync: walk each Card's ongoing-auction
// search restricted to the allowlisted sellers (auctionSellers.ts; the search's
// `_ssn` filter so only known cards from known sellers are scraped), classify
// every auction's PSA grade with the same card-aware title parser the
// listings/sales pipelines use, enforce EU provenance per row, and persist the
// survivors as the Card's full set of live Auctions (full per-card replacement —
// disappeared/ended auctions are pruned). Each survivor's eBay item page is then
// visited for the true current bid + bid count in EUR (so every Auction lands
// with a bid as of this sync) and the live ended/gone check; the zero-feedback
// seller guard from the Listings Sync is kept but is inert for vetted sellers.
export class SyncAuctionsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly auctionRepository: AuctionRepositoryPort,
    private readonly ebayAuctionsSource: EbayAuctionsSource,
    private readonly ebayItemPageSource: EbayItemPageSource,
  ) {}

  // Batch across Cards in one browser session, filterable like the price Sync.
  async executeBatch(
    filter: GetCardsFilter = {},
  ): Promise<BatchSyncAuctionsResult> {
    const counters = emptyCounters();
    let cardsSynced = 0;
    let cardsSkipped = 0;

    const { browser, page } = await this.openBrowser();
    try {
      let paginationPage = 1;
      while (true) {
        const cards = await this.cardRepository.getCards(filter, {
          take: 4,
          page: paginationPage,
        });
        if (!cards?.length) break;
        paginationPage++;

        for (const card of cards) {
          if (!this.ebayAuctionsSource.appliesTo(card)) {
            cardsSkipped++;
            continue;
          }
          await this.processCard(card, page, counters);
          cardsSynced++;
          await new Promise((resolve) =>
            setTimeout(resolve, 4000 + Math.random() * 4000),
          );
        }
      }
    } finally {
      await page.close();
      await browser.close();
    }

    const pruned = await this.auctionRepository.pruneEndedAuctions(new Date());
    const result = { cardsSynced, cardsSkipped, ...counters };
    console.log("[SyncAuctions] batch:", result, `pruned ${pruned} ended`);
    return result;
  }

  // Re-walk one card's ongoing auctions in its own browser session (the panel's
  // "Sync auctions" action). Mirrors executeBatch for a single card; full
  // per-card replacement plus a global prune of ended rows.
  async executeForCard(cardId: string): Promise<BatchSyncAuctionsResult> {
    const card = await this.cardRepository.getCard(cardId);
    const counters = emptyCounters();
    if (!this.ebayAuctionsSource.appliesTo(card)) {
      return { cardsSynced: 0, cardsSkipped: 1, ...counters };
    }
    const { browser, page } = await this.openBrowser();
    try {
      await this.processCard(card, page, counters);
    } finally {
      await page.close();
      await browser.close();
    }
    await this.auctionRepository.pruneEndedAuctions(new Date());
    return { cardsSynced: 1, cardsSkipped: 0, ...counters };
  }

  private async processCard(
    card: CardEntity,
    page: Page,
    counters: AuctionSyncCounters,
  ): Promise<void> {
    const candidates = await this.ebayAuctionsSource.fetch(card, page);
    counters.scraped += candidates.length;

    const seenAt = new Date();
    const auctions: NewAuction[] = [];

    for (const candidate of candidates) {
      const parsed = parseListingTitle(candidate.title, {
        number: card.number,
      });
      if (parsed.kind === "skipped") {
        counters.skippedTitle++;
        continue;
      }

      // Zero-bid auctions are excluded server-side by the search sort
      // (_sop=44, "ending soonest + with bids"; see auctionsLink.ts), so no
      // per-row bid gate is needed here — the feed tracks bid auctions only.

      // eBay's EU search filter (LH_PrefLoc=3) leaks Japan/US/UK items, so trust
      // the per-row location instead: drop anything that isn't a confirmed EU
      // member state (unknown provenance included).
      if (!candidate.isEuLocation) {
        counters.skippedLocation++;
        continue;
      }

      // Visit the item page: confirm the seller off its own card (ebay.fr search
      // rows expose no seller line, like the Listings Sync), drop zero-feedback
      // (fake-listing) sellers, and capture the true current bid + bid count
      // while we're there. A small jitter between visits mirrors the search
      // walk's anti-rate-limit pacing.
      const { feedback, itemState } = await this.readItemPage(
        candidate.itemId,
        page,
      );
      if (feedback === 0) {
        counters.skippedSeller++;
        continue;
      }
      if (itemState.status === "gone") {
        counters.skippedEnded++;
        continue;
      }

      // Prefer the item-page bid (EUR, authoritative) over the search-row value;
      // fall back to the search row when the page couldn't be read.
      let currentBid = candidate.currentBid;
      let currency = candidate.currency;
      let bidCount = candidate.bidCount;
      let bidCheckedAt = seenAt;
      if (itemState.status === "active") {
        currentBid = itemState.currentBidEur;
        currency = "EUR";
        bidCount = itemState.bidCount ?? candidate.bidCount;
        bidCheckedAt = new Date();
      }

      auctions.push({
        cardId: card.id,
        platform: "ebay",
        itemId: candidate.itemId,
        psaGrade: parsed.grade,
        currentBid,
        currency,
        bidCount,
        endTime: candidate.endTime,
        title: candidate.title,
        seller: candidate.seller,
        location: candidate.location,
        bidCheckedAt,
        seenAt,
      });
    }

    await this.auctionRepository.replaceCardAuctions(card.id, "ebay", auctions);
    counters.stored += auctions.length;
    console.log(
      `[SyncAuctions] ${card.name}: stored ${auctions.length} auction(s)`,
    );
  }

  // Read one auction's item page for its seller feedback and live state. A
  // failed / unreadable page yields a null feedback (never invalidating on a
  // miss) and an "unknown" state (keeps the search-row bid). Paces visits with a
  // small jitter, like the search walk.
  private async readItemPage(itemId: string, page: Page) {
    let feedback: number | null = null;
    let itemState = { status: "unknown" } as ReturnType<
      typeof parseAuctionItemPage
    >;
    try {
      const raw = await this.ebayItemPageSource.fetchState(itemId, page);
      feedback = parseItemPageSellerFeedback(raw.sellerInfoText);
      itemState = parseAuctionItemPage(raw);
    } catch (error) {
      console.log(`[SyncAuctions] item-page read failed for ${itemId}`, error);
    }
    await new Promise((resolve) =>
      setTimeout(resolve, 1500 + Math.random() * 1500),
    );
    return { feedback, itemState };
  }

  private async openBrowser() {
    const { browser, page } = await connect({
      headless: false,
      disableXvfb: false,
      args: [],
      customConfig: {},
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
