import { connect } from "puppeteer-real-browser";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { CardmarketArticles, PriceSourcePort } from "./sources/priceSource.port";
import { mirrorCardmarketListings } from "./cardmarketListings";
import { getUsdToEurRate } from "./helper";
import { psa10MarketPriceWithPrior } from "../sale/cardMarketPrice";
import type { SyncCardResponse } from "@gather/api-contract";

export class SyncSingleCardCardMarketUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly cardmarketPriceSources: PriceSourcePort[],
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort,
    private readonly listingRepository: ListingRepositoryPort
  ) {}

  async execute(cardId: string): Promise<SyncCardResponse> {
    const usdToEur = await getUsdToEurRate();
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

    const articles: CardmarketArticles = [];
    for (const source of this.cardmarketPriceSources) {
      if (source.appliesTo(card)) {
        articles.push(...(await source.fetch(card, page, usdToEur)));
      }
    }

    await mirrorCardmarketListings(this.listingRepository, card.id, articles, today);

    await page.close();
    await browser.close();

    const [psaReport, collectionEntry, cardSales] = await Promise.all([
      this.psaPopReportRepository.findByCardId(card.id),
      this.collectionRepository.findByCardId(card.id),
      this.saleRepository.getCardSales(card.id),
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
