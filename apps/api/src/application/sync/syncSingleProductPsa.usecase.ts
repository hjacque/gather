import { connect } from "puppeteer-real-browser";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { PerformanceRepositoryPort } from "repository/ports/performance.repository.port";
import { scrapePsaPopReport } from "./sources/psa.source";
import type { SyncProductResponse } from "@gather/api-contract";

export class SyncSingleProductPsaUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort
  ) {}

  async execute(productId: string): Promise<SyncProductResponse> {
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

    if (product.psaLink) {
      try {
        const grades = await scrapePsaPopReport(product.psaLink, product.name, product.number, page);
        await this.psaPopReportRepository.upsert(product.id, grades, new Date());
      } catch (error) {
        console.error(`[Sync] Failed to sync PSA pop report for product ${product.id}:`, error);
      }
    }

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
      psaGrade10Pop: psaReport?.grade10 ?? null,
      collectionEntry: null,
    };
  }
}
