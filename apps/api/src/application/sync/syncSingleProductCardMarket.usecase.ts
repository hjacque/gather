import { connect } from "puppeteer-real-browser";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { PriceSourcePort, RawPrices } from "./sources/priceSource.port";
import { aggregatePrices } from "./priceAggregator";
import { getEurToUsdRate } from "./helper";
import type { SyncProductResponse } from "@gather/api-contract";

export class SyncSingleProductCardMarketUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly cardmarketPriceSources: PriceSourcePort[],
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort
  ) {}

  async execute(productId: string): Promise<SyncProductResponse> {
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

    const product = await this.productRepository.getProduct(productId);

    const raw: RawPrices = {};
    for (const source of this.cardmarketPriceSources) {
      if (source.appliesTo(product)) {
        const result = await source.fetch(product, page, usdToEur);
        Object.assign(raw, result);
      }
    }
    const prices = aggregatePrices(raw);
    for (const [key, value] of prices) {
      // Upsert null PSA grades so a no-listings sync still produces a dated data point.
      const isPsaGrade = key.startsWith('cardmarketPsa');
      if (value !== undefined || (isPsaGrade && !!product.cardMarketLink)) {
        await this.priceRepository.upsertPrice(product.id, value, key, today);
      }
    }

    await page.close();
    await browser.close();

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const [pricesByProduct, yesterdayPricesByProduct, psaReport, collectionEntry] = await Promise.all([
      this.priceRepository.getProductsPricesByDate([product.id], today),
      this.priceRepository.getProductsPricesByDate([product.id], yesterday),
      this.psaPopReportRepository.findByProductId(product.id),
      this.collectionRepository.findByProductId(product.id),
    ]);
    const currentPrices = pricesByProduct.get(product.id)!;
    const yesterdayPrices = yesterdayPricesByProduct.get(product.id);

    return {
      ...product,
      ...currentPrices,
      cardmarketPsa9Yesterday: yesterdayPrices?.cardmarketPsa9 ?? null,
      cardmarketPsa10Yesterday: yesterdayPrices?.cardmarketPsa10 ?? null,
      psaTotal: psaReport?.total ?? null,
      psaGrade10Pop: psaReport?.grade10 ?? null,
      collectionEntry: collectionEntry ?? null,
    };
  }
}
