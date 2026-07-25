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
import { RateLimitError } from "./sources/rateLimit";

export type AuctionSyncCounters = {
  scraped: number;
  stored: number;
  skippedTitle: number;
  skippedLocation: number;
  skippedSeller: number;
  skippedEnded: number;
};

export type BatchSyncAuctionsResult = AuctionSyncCounters & {
  cardsSynced: number;
  cardsSkipped: number;
};

const emptyCounters = (): AuctionSyncCounters => ({
  scraped: 0,
  stored: 0,
  skippedTitle: 0,
  skippedLocation: 0,
  skippedSeller: 0,
  skippedEnded: 0,
});

export class SyncAuctionsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly auctionRepository: AuctionRepositoryPort,
    private readonly ebayAuctionsSource: EbayAuctionsSource,
    private readonly ebayItemPageSource: EbayItemPageSource,
  ) {}

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

      if (!candidate.isEuLocation) {
        counters.skippedLocation++;
        continue;
      }

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
      if (error instanceof RateLimitError) throw error;
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
