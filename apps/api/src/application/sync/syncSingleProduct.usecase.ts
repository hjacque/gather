import { connect } from "puppeteer-real-browser";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { SetPerformancesUsecase } from "./setPerformances.usecase";
import { PerformanceRepositoryPort } from "repository/ports/performance.repository.port";
import { PriceSourcePort } from "./sources/priceSource.port";
import { getEurToUsdRate } from "./helper";
import { syncProduct } from "./syncProduct";
import type { SyncProductResponse } from "@gather/api-contract";
import type { PriceType } from "@gather/types";

export class SyncSingleProductUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
    private readonly setPerformancesUsecase: SetPerformancesUsecase,
    private readonly priceSources: PriceSourcePort[]
  ) {}

  async execute(productId: string): Promise<SyncProductResponse> {
    const usdToEur = await getEurToUsdRate();
    console.log("Using USD to EUR rate:", usdToEur);

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

    const prices = await syncProduct(
      product,
      today,
      page,
      usdToEur,
      this.priceSources,
      this.priceRepository,
      this.setPerformancesUsecase
    );

    const performances = await this.performanceRepository.getPerformances(
      [product.id],
      today
    );
    const performance = performances.get(product.id)!;

    await page.close();
    await browser.close();

    const toPrice = (key: PriceType) => prices.get(key) ?? null;
    return {
      ...product,
      market: toPrice("market"),
      buylist: toPrice("buylist"),
      ratio: toPrice("ratio"),
      perBooster: toPrice("perBooster"),
      cardmarketListingCount: toPrice("cardmarketListingCount"),
      fullSet: toPrice("fullSet"),
      tcgp: toPrice("tcgp"),
      bricklinkAverage: toPrice("bricklinkAverage"),
      performance,
    };
  }
}
