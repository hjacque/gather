import { connect } from "puppeteer-real-browser";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { SetPerformancesUsecase } from "./setPerformances.usecase";
import { PerformanceRepositoryPort } from "repository/ports/performance.repository.port";
import { PriceSourcePort, RawPrices } from "./sources/priceSource.port";
import { aggregatePrices } from "./priceAggregator";
import { getEurToUsdRate } from "./helper";
import type { SyncProductResponse } from "@gather/api-contract";

export class SyncSingleProductCardMarketUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
    private readonly setPerformancesUsecase: SetPerformancesUsecase,
    private readonly cardmarketPriceSources: PriceSourcePort[],
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort
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
    const prices = aggregatePrices(product, raw);
    for (const [key, value] of prices) {
      // Upsert null PSA grades so a no-listings sync still produces a dated data point.
      const isPsaGrade = key.startsWith('cardmarketPsa');
      if (value !== undefined || (isPsaGrade && !!product.cardMarketLink)) {
        await this.priceRepository.upsertPrice(product.id, value, key, today);
      }
    }
    await this.setPerformancesUsecase.execute({ productIds: [product.id] });

    await page.close();
    await browser.close();

    const pricesByProduct = await this.priceRepository.getProductsPricesByDate([product.id], today);
    const currentPrices = pricesByProduct.get(product.id)!;

    const performances = await this.performanceRepository.getPerformances([product.id], today);
    const performance = performances.get(product.id)!;

    const psaReport = await this.psaPopReportRepository.findByProductId(product.id);

    return {
      ...product,
      ...currentPrices,
      cardmarketPsa9Yesterday: null,
      cardmarketPsa10Yesterday: null,
      performance,
      psaTotal: psaReport?.total ?? null,
    };
  }
}
