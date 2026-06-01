import { connect } from "puppeteer-real-browser";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { EbaySalesSource } from "./sources/ebaySales.source";
import { parseListingTitle } from "./sources/listingTitleParser";
import { classifyReverification } from "./sources/reverificationClassifier";

// Trailing window re-fetched on every run; sales older than this are ignored so
// re-running is idempotent over a fixed recent window (see #84).
const WINDOW_DAYS = 30;

export type SyncSalesResult = {
  cardId: string;
  scraped: number; // candidates returned by the source
  withinWindow: number; // candidates inside the trailing 30-day window
  upserted: number; // candidates accepted by the parser and persisted
  skipped: number; // candidates rejected by the parser (bundle / foreign / etc.)
  reverified: number; // pending Sales revisited at a checkpoint this run
  confirmed: number; // reverified Sales that survived to 30 days
  cancelled: number; // reverified Sales found gone / relisted
};

export class SyncSalesUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort,
    private readonly ebaySalesSource: EbaySalesSource
  ) {}

  async execute(cardId: string): Promise<SyncSalesResult> {
    const card = await this.cardRepository.getCard(cardId);

    const result: SyncSalesResult = {
      cardId,
      scraped: 0,
      withinWindow: 0,
      upserted: 0,
      skipped: 0,
      reverified: 0,
      confirmed: 0,
      cancelled: 0,
    };

    if (!this.ebaySalesSource.appliesTo(card)) {
      console.log(`[SyncSales] ${card.name} has no ebayLink — skipping`);
      return result;
    }

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

    try {
      const candidates = await this.ebaySalesSource.fetch(card, page);
      result.scraped = candidates.length;

      const cutoff = new Date();
      cutoff.setUTCDate(cutoff.getUTCDate() - WINDOW_DAYS);

      for (const candidate of candidates) {
        if (candidate.soldAt < cutoff) continue;
        result.withinWindow++;

        const parsed = parseListingTitle(candidate.title, {
          number: card.number,
        });
        if (parsed.kind === "skipped") {
          result.skipped++;
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
        result.upserted++;
      }

      // Re-verification pass: revisit this Card's due pending Sales at their
      // 7-day / 30-day checkpoint and resolve their status.
      const due = await this.saleRepository.getSalesDueForVerification(
        new Date(),
        card.id
      );
      for (const sale of due) {
        const checkpoint =
          sale.verificationStage === "unverified" ? "7d" : "30d";
        const state = await this.ebaySalesSource.revisitItem(sale.itemId, page);
        const outcome = classifyReverification(state, checkpoint);
        await this.saleRepository.updateVerification(sale.id, outcome);

        result.reverified++;
        if (outcome.status === "confirmed") result.confirmed++;
        if (outcome.status === "cancelled") result.cancelled++;

        await new Promise((resolve) =>
          setTimeout(resolve, 2000 + Math.random() * 2000)
        );
      }
    } finally {
      await page.close();
      await browser.close();
    }

    console.log(`[SyncSales] ${card.name}:`, result);
    return result;
  }
}
