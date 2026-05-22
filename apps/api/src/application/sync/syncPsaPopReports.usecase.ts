import { connect } from "puppeteer-real-browser";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { scrapePsaPopReport } from "./sources/psa.source";

export class SyncPsaPopReportsUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort
  ) {}

  async execute(): Promise<void> {
    console.log("[PSA Sync] Starting PSA pop report sync");

    const products = await this.productRepository.getProducts({
      franchise: "pokemon",
      type: "single",
    });

    const promoProducts = products.filter(
      (p) => p.rarity === "promo" && p.psaLink != null
    );

    console.log(
      `[PSA Sync] Found ${promoProducts.length} promo products with PSA links`
    );

    if (promoProducts.length === 0) {
      console.log("[PSA Sync] No products to sync, done");
      return;
    }

    const { browser, page } = await connect({
      headless: false,
      disableXvfb: true,
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: { defaultViewport: null },
      ignoreAllFlags: false,
      plugins: [require("puppeteer-extra-plugin-stealth")()],
    });

    try {
      const syncedAt = new Date();

      for (const product of promoProducts) {
        try {
          console.log(
            `[PSA Sync] Scraping pop report for product ${product.id} (${product.name})`
          );
          const grades = await scrapePsaPopReport(product.psaLink!, product.name, product.number, page);
          await this.psaPopReportRepository.upsert(product.id, grades, syncedAt);
          console.log(
            `[PSA Sync] Successfully upserted pop report for product ${product.id}`
          );
        } catch (error) {
          console.error(
            `[PSA Sync] Failed to sync product ${product.id} (${product.name}):`,
            error
          );
          // Continue processing remaining products
        }
      }
    } finally {
      await page.close();
      await browser.close();
    }

    console.log("[PSA Sync] PSA pop report sync complete");
  }
}
