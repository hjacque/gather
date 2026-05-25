import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../../entities/product.entity";
import { PriceSourcePort, RawPrices } from "./priceSource.port";
import { ProductType } from "@prisma/client";

export class CardMarketSource implements PriceSourcePort {
  appliesTo(product: ProductEntity): boolean {
    return (
      !!product.cardMarketLink &&
      !product.psaLink &&
      product.type !== ProductType.minifigure
    );
  }

  async fetch(
    product: ProductEntity,
    page: Page,
    _usdToEur: number,
    retry = 0
  ): Promise<RawPrices> {
    try {
      await page.goto(
        product.cardMarketLink! +
          "?language=1&minCondition=2&isSigned=N&isAltered=N",
        { waitUntil: "networkidle2" }
      );

      const isInLine = await page.evaluate(() =>
        document.body.innerText.includes("You are now in line.")
      );
      if (isInLine) {
        console.log("In line detected");
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }

      const isRateLimited = await page.evaluate(() =>
        document.body.innerText.includes("You are being rate limited")
      );
      if (isRateLimited) {
        console.log("Rate limit detected");
        if (retry > 3) {
          console.log("Max retries reached for rate limiting");
          return {};
        }
        console.log("Retrying... ", retry + 1);
        await new Promise((resolve) => setTimeout(resolve, 60000 * retry));
        return this.fetch(product, page, _usdToEur, retry + 1);
      }

      const isTurnTile = await page.evaluate(() =>
        document.body.innerText.includes(
          "Verify you are human by completing the action below."
        )
      );
      if (isTurnTile) {
        console.log("Cloudflare turntile detected");
        await new Promise((resolve) => setTimeout(resolve, 5500));
      }

      const { keyword, blocked } = product;

      let data: (string | undefined)[] | undefined;
      if (keyword) {
        const kw = keyword; // narrowed to string
        data = await page.$eval(
          "div.table-body",
          (table, { kw, blocked }) => {
            const textContent = (table as HTMLElement).innerText.trim();
            const elements = textContent.split("\n");

            for (let i = 0; i < elements.length; i += 5) {
              const isKSeller = elements[i + 1] === "K";
              const isDescriptionEmpty = isKSeller
                ? elements[i + 4].trim().includes("€")
                : elements[i + 3].trim().includes("€");
              if (isDescriptionEmpty) {
                if (isKSeller) i++;
                continue;
              }
              const line = elements.slice(i, i + (isKSeller ? 7 : 6));
              const description = line[line.length - 3].toLowerCase();
              if (description.includes(kw.toLowerCase())) {
                return line;
              }
            }
            return undefined;
          },
          { kw, blocked }
        );
      } else {
        await page.waitForSelector("div.article-row", {
          visible: true,
          timeout: 3000,
        });
        data = await page.$eval("div.article-row", (firstRow) => {
          const textContent = (firstRow as HTMLElement).innerText.trim();
          return textContent.split("\n");
        });
      }

      console.log("CardMarket data", data);

      const listingCount =
        (await page.evaluate(() => {
          const dtElements = document.querySelectorAll("dl.labeled dt");
          for (const dt of dtElements) {
            if (dt.textContent?.trim() === "Available items") {
              const dd = dt.nextElementSibling;
              return dd ? dd.textContent?.trim() : undefined;
            }
          }
          return undefined;
        })) || undefined;

      const price =
        data && data.length
          ? parseFloat(
              parseFloat(
                data[data.length - 2]!.replace(".", "").replace(",", ".")
              ).toFixed(2)
            )
          : undefined;

      return {
        cardmarket: price,
        cardmarketListingCount: listingCount
          ? parseInt(listingCount)
          : undefined,
      };
    } catch (error) {
      console.log("No CardMarket listing", product.name);
      return {};
    }
  }
}
