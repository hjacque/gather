import { connect } from "puppeteer-real-browser";
import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../entities/card.entity";
import { CardRepositoryPort, GetCardsFilter } from "../../repository/ports/card.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { EbaySalesSource } from "./sources/ebaySales.source";
import { parseListingTitle } from "./sources/listingTitleParser";
import { classifyReverification } from "./sources/reverificationClassifier";

// Trailing window re-fetched on every run; sales older than this are ignored so
// re-running is idempotent over a fixed recent window (see #84).
const WINDOW_DAYS = 30;

// Counters accumulated over one or many Cards in a single Sale Sync run.
export type SaleSyncCounters = {
  scraped: number; // candidates returned by the source
  withinWindow: number; // candidates inside the trailing 30-day window
  upserted: number; // candidates accepted by the parser and persisted
  skipped: number; // candidates rejected by the parser (bundle / foreign / etc.)
  reverified: number; // pending Sales revisited at a checkpoint this run
  confirmed: number; // reverified Sales that survived to 30 days
  cancelled: number; // reverified Sales found gone / relisted
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
  reverified: 0,
  confirmed: 0,
  cancelled: 0,
});

export class SyncSalesUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort,
    private readonly ebaySalesSource: EbaySalesSource
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
      await this.processCard(card, page, counters);
    } finally {
      await page.close();
      await browser.close();
    }

    const result = { cardId, ...counters };
    console.log(`[SyncSales] ${card.name}:`, result);
    return result;
  }

  // Batch across Cards in one browser session, filterable like the price Sync.
  async executeBatch(filter: GetCardsFilter = {}): Promise<BatchSyncSalesResult> {
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
          if (!this.ebaySalesSource.appliesTo(card)) {
            cardsSkipped++;
            continue;
          }
          await this.processCard(card, page, counters);
          cardsSynced++;
          await new Promise((resolve) =>
            setTimeout(resolve, 4000 + Math.random() * 4000)
          );
        }
      }
    } finally {
      await page.close();
      await browser.close();
    }

    const result = { cardsSynced, cardsSkipped, ...counters };
    console.log("[SyncSales] batch:", result);
    return result;
  }

  // Scrape pass + folded-in re-verification pass for one Card on a shared page.
  private async processCard(
    card: CardEntity,
    page: Page,
    counters: SaleSyncCounters
  ): Promise<void> {
    const candidates = await this.ebaySalesSource.fetch(card, page);
    counters.scraped += candidates.length;

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - WINDOW_DAYS);

    for (const candidate of candidates) {
      if (candidate.soldAt < cutoff) continue;
      counters.withinWindow++;

      const parsed = parseListingTitle(candidate.title, {
        number: card.number,
      });
      if (parsed.kind === "skipped") {
        counters.skipped++;
        continue;
      }

      await this.saleRepository.upsert({
        cardId: card.id,
        platform: "ebay",
        itemId: candidate.itemId,
        psaGrade: parsed.grade,
        price: candidate.price,
        currency: candidate.currency,
        title: candidate.title,
        isBestOffer: candidate.isBestOffer,
        soldAt: candidate.soldAt,
      });
      counters.upserted++;
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
      if (outcome.status === "confirmed") counters.confirmed++;
      if (outcome.status === "cancelled") counters.cancelled++;

      await new Promise((resolve) =>
        setTimeout(resolve, 2000 + Math.random() * 2000)
      );
    }
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
