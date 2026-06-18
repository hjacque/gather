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
import { parseListingTitle } from "./sources/listingTitleParser";

// Counters accumulated over one or many Cards in a single Auction Sync run.
export type AuctionSyncCounters = {
  scraped: number; // candidates returned by the source
  stored: number; // candidates accepted by the parser and persisted
  skippedTitle: number; // candidates rejected by the parser (bundle / foreign / etc.)
  skippedLocation: number; // candidates dropped for non-EU / unknown provenance
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
});

// The auction sibling of the Listings Sync: walk each Card's ongoing-auction
// search, classify every auction's PSA grade with the same card-aware title
// parser the listings/sales pipelines use, enforce EU provenance per row, and
// persist the survivors as the Card's full set of live Auctions (full per-card
// replacement — disappeared/ended auctions are pruned). The current bid + bid
// count come straight off the search row here; the per-item seller gate and the
// item-page bid capture are added by a later slice.
export class SyncAuctionsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly auctionRepository: AuctionRepositoryPort,
    private readonly ebayAuctionsSource: EbayAuctionsSource,
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

    const result = { cardsSynced, cardsSkipped, ...counters };
    console.log("[SyncAuctions] batch:", result);
    return result;
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

      // eBay's EU search filter (LH_PrefLoc=3) leaks Japan/US/UK items, so trust
      // the per-row location instead: drop anything that isn't a confirmed EU
      // member state (unknown provenance included).
      if (!candidate.isEuLocation) {
        counters.skippedLocation++;
        continue;
      }

      auctions.push({
        cardId: card.id,
        platform: "ebay",
        itemId: candidate.itemId,
        psaGrade: parsed.grade,
        currentBid: candidate.currentBid,
        currency: candidate.currency,
        bidCount: candidate.bidCount,
        endTime: candidate.endTime,
        title: candidate.title,
        seller: candidate.seller,
        location: candidate.location,
        bidCheckedAt: seenAt,
        seenAt,
      });
    }

    await this.auctionRepository.replaceCardAuctions(card.id, "ebay", auctions);
    counters.stored += auctions.length;
    console.log(
      `[SyncAuctions] ${card.name}: stored ${auctions.length} auction(s)`,
    );
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
