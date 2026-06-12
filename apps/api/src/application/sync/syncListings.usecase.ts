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

// Counters accumulated over one or many Cards in a single Listings Sync run.
export type ListingSyncCounters = {
  scraped: number; // candidates returned by the source
  stored: number; // candidates accepted by the parser and persisted
  skippedTitle: number; // candidates rejected by the parser (bundle / foreign / etc.)
  skippedSeller: number; // candidates dropped for a zero-activity seller
  skippedLocation: number; // candidates dropped for non-EU / unknown provenance
};

export type BatchSyncListingsResult = ListingSyncCounters & {
  cardsSynced: number; // Cards with an ebayLink that were synced
  cardsSkipped: number; // Cards skipped for having no ebayLink
};

const emptyCounters = (): ListingSyncCounters => ({
  scraped: 0,
  stored: 0,
  skippedTitle: 0,
  skippedSeller: 0,
  skippedLocation: 0,
});

// The buy-side sibling of the Sale Sync: walk each Card's active Buy-It-Now
// search, classify every ask's PSA grade with the same card-aware title parser
// the sales pipeline uses, and persist the survivors as the Card's full set of
// live Listings (full per-card replacement — disappeared asks are pruned).
export class SyncListingsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly listingRepository: ListingRepositoryPort,
    private readonly ebayListingsSource: EbayListingsSource,
    private readonly ebayItemPageSource: EbayItemPageSource,
  ) {}

  // Batch across Cards in one browser session, filterable like the price Sync.
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

  // Sync one card's listings in its own browser session (the panel's
  // "Sync listings" action). Mirrors executeBatch for a single card.
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

  // Scrape one Card's active eBay asks on a page the caller already owns (e.g.
  // the full price Sync, which holds its own browser session). No-ops for Cards
  // without an ebayLink. Counters accumulate into `into` when provided.
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

      // A seller with zero feedback is a fake-listing signal (same bar the Sale
      // Sync auto-invalidates on). An ask nobody can safely buy must not set
      // the per-grade minimum. The row-level guard is inert on the EU walk
      // (ebay.fr search rows carry no seller line), so the real check is the
      // item-page one below; this stays as a cheap backstop for any row that
      // does carry feedback.
      if (!candidate.sellerHasActivity) {
        counters.skippedSeller++;
        continue;
      }

      // eBay's EU search filter (LH_PrefLoc=3) renders as applied but leaks
      // Japan/US/UK items, so trust the per-row location instead: drop anything
      // that isn't a confirmed EU member state (unknown provenance included).
      if (!candidate.isEuLocation) {
        counters.skippedLocation++;
        continue;
      }

      // ebay.fr search rows expose no seller feedback, so confirm the seller off
      // the listing's own item page — the buy-side analogue of the Sale Sync's
      // zero-activity auto-invalidate. Only survivors of the title + EU filters
      // are visited, to keep the extra page loads bounded. An unreadable page
      // leaves the count null (never invalidating on a miss).
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

  // True only when the listing's item page confirms a zero-feedback seller. A
  // failed / unreadable page yields a null count, which is treated as "not
  // zero" so a transient miss never drops a real ask. A small jitter between
  // visits mirrors the search walk's anti-rate-limit pacing.
  private async sellerHasZeroFeedback(
    itemId: string,
    page: Page,
  ): Promise<boolean> {
    let feedbackCount: number | null = null;
    try {
      const raw = await this.ebayItemPageSource.fetchState(itemId, page);
      feedbackCount = parseItemPageSellerFeedback(raw.sellerInfoText);
    } catch (error) {
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
