import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import { CardmarketArticles, PriceSourcePort } from "./priceSource.port";

const BANNED_DESCRIPTION_KEYWORDS = ["contendent", "Probably", "Sealed", "maybe", "possible", "like"];

export class CardMarketGradedSource implements PriceSourcePort {
  appliesTo(product: CardEntity): boolean {
    return !!product.cardMarketLink;
  }

  async fetch(
    product: CardEntity,
    page: Page,
    _usdToEur: number,
    retry = 0
  ): Promise<CardmarketArticles> {
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
          return [];
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

      // Click "Show more results" until all listings are loaded
      let loadMoreAttempts = 0;
      const MAX_LOAD_MORE = 20;
      while (loadMoreAttempts < MAX_LOAD_MORE) {
        const canLoadMore = await page.evaluate(() => {
          const button = document.querySelector("#loadMoreButton");
          if (!button) return false;
          const notice = document.querySelector("#MaxResultsReachedNotice");
          if (notice && !notice.classList.contains("d-none")) return false;
          return true;
        });
        if (!canLoadMore) break;

        const rowsBefore = await page.$$eval(".article-row", (rows) => rows.length);
        await page.evaluate(() => {
          (document.querySelector("#loadMoreButton") as HTMLButtonElement | null)?.click();
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const rowsAfter = await page.$$eval(".article-row", (rows) => rows.length);
        if (rowsAfter === rowsBefore) break;
        loadMoreAttempts++;
      }
      if (loadMoreAttempts > 0) {
        console.log(`[GradedSource] Clicked "Show more results" ${loadMoreAttempts} time(s)`);
      }

      const articles: CardmarketArticles = await page.$$eval(
        ".article-row",
        (rows) => {
          const banned = ["contendent", "Probably", "Sealed", "maybe", "possible", "like"];
          const result: {
            articleId: string | null;
            psaGrade: number;
            price: number;
            seller: string | null;
            comment: string | null;
          }[] = [];

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

            const rowId = row.getAttribute("id") ?? "";
            const articleId = rowId.startsWith("articleRow")
              ? rowId.slice("articleRow".length)
              : null;

            const sellerEl = row.querySelector(".seller-name a");
            const seller = sellerEl?.textContent?.trim() || null;

            result.push({
              articleId: articleId || null,
              psaGrade: grade,
              price,
              seller,
              comment: desc.trim() || null,
            });
          }

          return result;
        }
      );

      console.log(
        `[GradedSource] ${articles.length} PSA article(s)`,
        articles.map((a) => `PSA ${a.psaGrade} @ ${a.price}`)
      );

      return articles;
    } catch (error) {
      console.log("[GradedSource] Failed to scrape graded prices for", product.name, error);
      return [];
    }
  }
}
