import { connect } from "puppeteer-real-browser";
import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../entities/card.entity";
import { NewListing } from "../../entities/listing.entity";
import {
  CardRepositoryPort,
  GetCardsFilter,
} from "../../repository/ports/card.repository.port";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { EbayListingsSource } from "./sources/ebayListings.source";
import { EbayItemPageSource } from "./sources/ebayItemPage.source";
import { parseItemPageSellerFeedback } from "./sources/listingItemPage";
import { parseListingTitle } from "./sources/listingTitleParser";
import { RateLimitError } from "./sources/rateLimit";

export type ListingSyncCounters = {
  scraped: number;
  stored: number;
  skippedTitle: number;
  skippedSeller: number;
  skippedLocation: number;
};

export type BatchSyncListingsResult = ListingSyncCounters & {
  cardsSynced: number;
  cardsSkipped: number;
};

const emptyCounters = (): ListingSyncCounters => ({
  scraped: 0,
  stored: 0,
  skippedTitle: 0,
  skippedSeller: 0,
  skippedLocation: 0,
});

export class SyncListingsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly listingRepository: ListingRepositoryPort,
    private readonly ebayListingsSource: EbayListingsSource,
    private readonly ebayItemPageSource: EbayItemPageSource,
  ) {}

  async executeBatch(
    filter: GetCardsFilter = {},
  ): Promise<BatchSyncListingsResult> {
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
          if (!this.ebayListingsSource.appliesTo(card)) {
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
    console.log("[SyncListings] batch:", result);
    return result;
  }

  async executeForCard(cardId: string): Promise<BatchSyncListingsResult> {
    const card = await this.cardRepository.getCard(cardId);
    const counters = emptyCounters();
    if (!this.ebayListingsSource.appliesTo(card)) {
      return { cardsSynced: 0, cardsSkipped: 1, ...counters };
    }
    const { browser, page } = await this.openBrowser();
    try {
      await this.processCard(card, page, counters);
    } finally {
      await page.close();
      await browser.close();
    }
    return { cardsSynced: 1, cardsSkipped: 0, ...counters };
  }

  async syncCardOnPage(
    card: CardEntity,
    page: Page,
    into: ListingSyncCounters = emptyCounters(),
  ): Promise<ListingSyncCounters> {
    if (!this.ebayListingsSource.appliesTo(card)) return into;
    await this.processCard(card, page, into);
    return into;
  }

  private async processCard(
    card: CardEntity,
    page: Page,
    counters: ListingSyncCounters,
  ): Promise<void> {
    const candidates = await this.ebayListingsSource.fetch(card, page);
    counters.scraped += candidates.length;

    const seenAt = new Date();
    const listings: NewListing[] = [];

    for (const candidate of candidates) {
      const parsed = parseListingTitle(candidate.title, {
        number: card.number,
      });
      if (parsed.kind === "skipped") {
        counters.skippedTitle++;
        continue;
      }

      if (!candidate.sellerHasActivity) {
        counters.skippedSeller++;
        continue;
      }

      if (!candidate.isEuLocation) {
        counters.skippedLocation++;
        continue;
      }

      if (await this.sellerHasZeroFeedback(candidate.itemId, page)) {
        counters.skippedSeller++;
        continue;
      }

      listings.push({
        cardId: card.id,
        platform: "ebay",
        itemId: candidate.itemId,
        psaGrade: parsed.grade,
        price: candidate.price,
        currency: candidate.currency,
        title: candidate.title,
        isBestOffer: candidate.isBestOffer,
        seller: candidate.seller,
        location: candidate.location,
        seenAt,
      });
    }

    await this.listingRepository.replaceCardListings(card.id, "ebay", listings);
    counters.stored += listings.length;
    console.log(
      `[SyncListings] ${card.name}: stored ${listings.length} listing(s)`,
    );
  }

  private async sellerHasZeroFeedback(
    itemId: string,
    page: Page,
  ): Promise<boolean> {
    let feedbackCount: number | null = null;
    try {
      const raw = await this.ebayItemPageSource.fetchState(itemId, page);
      feedbackCount = parseItemPageSellerFeedback(raw.sellerInfoText);
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      console.log(`[SyncListings] seller check failed for ${itemId}`, error);
    }
    await new Promise((resolve) =>
      setTimeout(resolve, 1500 + Math.random() * 1500),
    );
    return feedbackCount === 0;
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
