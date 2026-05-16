import { connect } from "puppeteer-real-browser";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { SetPerformancesUsecase } from "./setPerformances.usecase";
import { PerformanceRepositoryPort } from "repository/ports/performance.repository.port";
import { PriceSourcePort } from "./sources/priceSource.port";
import { getEurToUsdRate } from "./helper";
import { syncProduct } from "./syncProduct";

export class SyncSingleProductUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
    private readonly setPerformancesUsecase: SetPerformancesUsecase,
    private readonly priceSources: PriceSourcePort[]
  ) {}

  async execute(productId: string) {
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

    return { ...product, ...Object.fromEntries(prices), performance };
  }
}
