import { connect } from "puppeteer-real-browser";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { scrapePsaPopReport } from "./sources/psa.source";

export class SyncPsaPopReportsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort
  ) {}

  async execute(): Promise<void> {
    console.log("[PSA Sync] Starting PSA pop report sync");

    const cards = await this.cardRepository.getCards({});

    const cardsWithPsaLink = cards.filter((c) => c.psaLink != null);

    console.log(
      `[PSA Sync] Found ${cardsWithPsaLink.length} cards with PSA links`
    );

    if (cardsWithPsaLink.length === 0) {
      console.log("[PSA Sync] No cards to sync, done");
      return;
    }

    const { browser, page } = await connect({
      headless: false,
      disableXvfb: true,
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: { defaultViewport: null },
      ignoreAllFlags: false,
      plugins: [require("puppeteer-extra-plugin-stealth")()],
    });

    try {
      const syncedAt = new Date();

      for (const card of cardsWithPsaLink) {
        try {
          console.log(
            `[PSA Sync] Scraping pop report for card ${card.id} (${card.name})`
          );
          const grades = await scrapePsaPopReport(card.psaLink!, card.name, card.number, page);
          await this.psaPopReportRepository.upsert(card.id, grades, syncedAt);
          console.log(
            `[PSA Sync] Successfully upserted pop report for card ${card.id}`
          );
        } catch (error) {
          console.error(
            `[PSA Sync] Failed to sync card ${card.id} (${card.name}):`,
            error
          );
        }
      }
    } finally {
      await page.close();
      await browser.close();
    }

    console.log("[PSA Sync] PSA pop report sync complete");
  }
}
