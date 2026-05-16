import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../../entities/product.entity";
import { PriceSourcePort, RawPrices } from "./priceSource.port";

export class AbugamesSource implements PriceSourcePort {
  appliesTo(product: ProductEntity): boolean {
    return !!product.abugamesBuyListLink;
  }

  async fetch(
    product: ProductEntity,
    page: Page,
    usdToEur: number
  ): Promise<RawPrices> {
    try {
      await page.goto(product.abugamesBuyListLink!);
      await page.waitForSelector("div.buylist span.ng-star-inserted", {
        visible: true,
        timeout: 3000,
      });

      const data = await page.evaluate(() => {
        const panels = Array.from(
          document.querySelectorAll(".row.panel.panel-default")
        );
        for (const panel of panels) {
          const cols = Array.from(panel.children).filter(
            (ch) => ch.classList && ch.classList.contains("col-md-2")
          );

          let nmCol = cols.find((c) => {
            const tb = c.querySelector(".titleBox");
            if (tb?.textContent && tb.textContent.trim() === "NM") return true;
            return /\bNM\b/.test((c.textContent || "").trim());
          });

          if (!nmCol) nmCol = cols[1] || null;
          if (!nmCol) return null;

          const match = (nmCol.textContent || "").match(
            /\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/
          );
          return match ? match[0].replace(/\s+/g, "") : null;
        }
        return null;
      });

      const price =
        data !== null
          ? parseFloat(
              data.replace("$", "").replace(",", "").replace(".", ",")
            ) * usdToEur
          : undefined;

      console.log("abugamesBuyListLink", data, price);

      return { abugames: price };
    } catch {
      console.log("Not in Abugames BuyList", product.name);
      return {};
    }
  }
}
