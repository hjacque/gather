import { connect } from "puppeteer-real-browser";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { scrapePsaPopReport } from "./sources/psa.source";
import type { SyncProductResponse } from "@gather/api-contract";

export class SyncSingleProductPsaUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort
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

    const [pricesByProduct, psaReport, collectionEntry] = await Promise.all([
      this.priceRepository.getProductsPricesByDate([product.id], today),
      this.psaPopReportRepository.findByProductId(product.id),
      this.collectionRepository.findByProductId(product.id),
    ]);
    const currentPrices = pricesByProduct.get(product.id)!;

    return {
      ...product,
      ...currentPrices,
      cardmarketPsa9Yesterday: null,
      cardmarketPsa10Yesterday: null,
      psaTotal: psaReport?.total ?? null,
      psaGrade10Pop: psaReport?.grade10 ?? null,
      collectionEntry: collectionEntry ?? null,
    };
  }
}
