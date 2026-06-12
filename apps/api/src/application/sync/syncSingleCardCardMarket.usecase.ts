import { connect } from "puppeteer-real-browser";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { PriceSourcePort, RawPrices } from "./sources/priceSource.port";
import { aggregatePrices } from "./priceAggregator";
import { mirrorCardmarketListings } from "./cardmarketListings";
import { getEurToUsdRate } from "./helper";
import { psa10MarketPriceWithPrior } from "../sale/cardMarketPrice";
import type { SyncCardResponse } from "@gather/api-contract";

export class SyncSingleCardCardMarketUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly cardmarketPriceSources: PriceSourcePort[],
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort,
    private readonly listingRepository: ListingRepositoryPort
  ) {}

  async execute(cardId: string): Promise<SyncCardResponse> {
    const usdToEur = await getEurToUsdRate();
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

    const raw: RawPrices = {};
    for (const source of this.cardmarketPriceSources) {
      if (source.appliesTo(card)) {
        const result = await source.fetch(card, page, usdToEur);
        Object.assign(raw, result);
      }
    }
    const prices = aggregatePrices(raw);
    for (const [key, value] of prices) {
      // Upsert null PSA grades so a no-listings sync still produces a dated data point.
      const isPsaGrade = key.startsWith('cardmarketPsa');
      if (value !== undefined || (isPsaGrade && !!card.cardMarketLink)) {
        await this.priceRepository.upsertPrice(card.id, value, key, today);
      }
    }

    // The same grade prices are also the card's live CardMarket asks: mirror
    // them into the unified Listing model so the buy side reads one source for
    // both eBay and CardMarket. Dated price points above stay for trend/history.
    await mirrorCardmarketListings(this.listingRepository, card.id, prices, today);

    await page.close();
    await browser.close();

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const [pricesByCard, yesterdayPricesByCard, psaReport, collectionEntry, cardSales] = await Promise.all([
      this.priceRepository.getCardsPricesByDate([card.id], today),
      this.priceRepository.getCardsPricesByDate([card.id], yesterday),
      this.psaPopReportRepository.findByCardId(card.id),
      this.collectionRepository.findByCardId(card.id),
      this.saleRepository.getCardSales(card.id),
    ]);
    const currentPrices = pricesByCard.get(card.id)!;
    const yesterdayPrices = yesterdayPricesByCard.get(card.id);
    const market = psa10MarketPriceWithPrior(cardSales, usdToEur);

    return {
      ...card,
      ...currentPrices,
      cardmarketPsa9Yesterday: yesterdayPrices?.cardmarketPsa9 ?? null,
      cardmarketPsa10Yesterday: yesterdayPrices?.cardmarketPsa10 ?? null,
      marketPsa10: market.today,
      marketPsa10Prior7d: market.prior,
      psaTotal: psaReport?.total ?? null,
      psaGrade10Pop: psaReport?.grade10 ?? null,
      collectionEntry: collectionEntry ?? null,
    };
  }
}
