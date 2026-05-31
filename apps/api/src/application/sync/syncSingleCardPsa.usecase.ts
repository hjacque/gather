import { connect } from "puppeteer-real-browser";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { scrapePsaPopReport } from "./sources/psa.source";
import type { SyncCardResponse } from "@gather/api-contract";

export class SyncSingleCardPsaUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort
  ) {}

  async execute(cardId: string): Promise<SyncCardResponse> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

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

    const card = await this.cardRepository.getCard(cardId);

    if (card.psaLink) {
      try {
        const grades = await scrapePsaPopReport(card.psaLink, card.name, card.number, page);
        await this.psaPopReportRepository.upsert(card.id, grades, new Date());
      } catch (error) {
        console.error(`[Sync] Failed to sync PSA pop report for card ${card.id}:`, error);
      }
    }

    await page.close();
    await browser.close();

    const [pricesByCard, psaReport, collectionEntry] = await Promise.all([
      this.priceRepository.getCardsPricesByDate([card.id], today),
      this.psaPopReportRepository.findByCardId(card.id),
      this.collectionRepository.findByCardId(card.id),
    ]);
    const currentPrices = pricesByCard.get(card.id)!;

    return {
      ...card,
      ...currentPrices,
      cardmarketPsa9Yesterday: null,
      cardmarketPsa10Yesterday: null,
      psaTotal: psaReport?.total ?? null,
      psaGrade10Pop: psaReport?.grade10 ?? null,
      collectionEntry: collectionEntry ?? null,
    };
  }
}
