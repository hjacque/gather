import { connect } from "puppeteer-real-browser";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { scrapePsaPopReport, psaProfileDir } from "./sources/psa.source";
import { getUsdToEurRate } from "./helper";
import { psa10MarketPriceWithPrior } from "../sale/cardMarketPrice";
import type { SyncCardResponse } from "@gather/api-contract";

export class SyncSingleCardPsaUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort
  ) {}

  async execute(cardId: string): Promise<SyncCardResponse> {
    const { browser, page } = await connect({
      headless: false,
      disableXvfb: false,
      args: [],
      customConfig: { userDataDir: psaProfileDir() },
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

    const [psaReport, collectionEntry, cardSales, usdToEur] = await Promise.all([
      this.psaPopReportRepository.findByCardId(card.id),
      this.collectionRepository.findByCardId(card.id),
      this.saleRepository.getCardSales(card.id),
      getUsdToEurRate(),
    ]);
    const market = psa10MarketPriceWithPrior(cardSales, usdToEur);

    return {
      ...card,
      marketPsa10: market.today,
      marketPsa10Prior7d: market.prior,
      psaTotal: psaReport?.total ?? null,
      psaGrade10Pop: psaReport?.grade10 ?? null,
      collectionEntry: collectionEntry ?? null,
    };
  }
}
