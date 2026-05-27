import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../../entities/product.entity";
import { PriceSourcePort, RawPrices } from "./priceSource.port";

const BANNED_DESCRIPTION_KEYWORDS = ["contendent", "Probably", "Sealed", "maybe", "possible", "like"];

const PSA_GRADE_TYPES = [
  "cardmarketPsa1",
  "cardmarketPsa2",
  "cardmarketPsa3",
  "cardmarketPsa4",
  "cardmarketPsa5",
  "cardmarketPsa6",
  "cardmarketPsa7",
  "cardmarketPsa8",
  "cardmarketPsa9",
  "cardmarketPsa10",
] as const;

export class CardMarketGradedSource implements PriceSourcePort {
  appliesTo(product: ProductEntity): boolean {
    return !!product.cardMarketLink;
  }

  async fetch(
    product: ProductEntity,
    page: Page,
    _usdToEur: number,
    retry = 0
  ): Promise<RawPrices> {
    try {
      await page.goto(product.cardMarketLink!, { waitUntil: "networkidle2" });
      await new Promise((resolve) => setTimeout(resolve, 2000));


      const isInLine = await page.evaluate(() =>
        document.body.innerText.includes("You are now in line.")
      );
      if (isInLine) {
        console.log("[GradedSource] In line detected");
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }

      const isRateLimited = await page.evaluate(() =>
        document.body.innerText.includes("You are being rate limited")
      );
      if (isRateLimited) {
        console.log("[GradedSource] Rate limit detected");
        if (retry > 3) {
          console.log("[GradedSource] Max retries reached");
          return {};
        }
        await new Promise((resolve) => setTimeout(resolve, 60000 * retry));
        return this.fetch(product, page, _usdToEur, retry + 1);
      }

      const isTurnTile = await page.evaluate(() =>
        document.body.innerText.includes(
          "Verify you are human by completing the action below."
        )
      );
      if (isTurnTile) {
        console.log("[GradedSource] Cloudflare turntile detected");
        await new Promise((resolve) => setTimeout(resolve, 5500));
      }

      // Parse all rows and find the minimum price per PSA grade
      const gradeMinPrices = await page.$$eval(".article-row", (rows) => {
        const banned = ["contendent", "Probably", "Sealed", "maybe", "possible", "like"];
        const result: Record<number, number> = {};

        for (const row of rows) {
          const descEl = row.querySelector(
            ".product-comments .d-block.text-truncate"
          );
          const priceEl = row.querySelector(
            ".price-container .color-primary"
          );

          if (!descEl || !priceEl) continue;

          const desc = descEl.textContent || "";
          if (banned.some((kw) => desc.toLowerCase().includes(kw.toLowerCase()))) continue;

          const gradeMatch = desc.match(/psa\s*(\d+)/i);
          if (!gradeMatch) continue;

          const grade = parseInt(gradeMatch[1], 10);
          if (grade < 1 || grade > 10) continue;

          const priceText = priceEl.textContent ?? "";
          const price = parseFloat(
            priceText.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "")
          );
          if (isNaN(price) || price <= 0) continue;

          if (result[grade] === undefined || price < result[grade]) {
            result[grade] = price;
          }
        }

        return result;
      });

      console.log("[GradedSource] PSA grade prices", gradeMinPrices);

      const raw: RawPrices = {};
      for (let grade = 1; grade <= 10; grade++) {
        if (gradeMinPrices[grade] !== undefined) {
          const key = `cardmarketPsa${grade}` as keyof RawPrices;
          raw[key] = gradeMinPrices[grade];
        }
      }

      return raw;
    } catch (error) {
      console.log("[GradedSource] Failed to scrape graded prices for", product.name);
      return {};
    }
  }
}
