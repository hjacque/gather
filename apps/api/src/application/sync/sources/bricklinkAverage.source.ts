import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../../entities/product.entity";
import { PriceSourcePort, RawPrices } from "./priceSource.port";
import { ProductType } from "@prisma/client";

export class BricklinkAverageSource implements PriceSourcePort {
  appliesTo(product: ProductEntity): boolean {
    return !!product.bricklinkLink && product.type === ProductType.minifigure;
  }

  async fetch(
    product: ProductEntity,
    page: Page,
    _usdToEur: number
  ): Promise<RawPrices> {
    try {
      const newPage = await page.browser().newPage();
      await newPage.goto(`${product.bricklinkLink}#T=P`, {
        waitUntil: "networkidle2",
      });

      const rows = await newPage.evaluate(() => {
        const rows = document.querySelectorAll(".pcipgSummaryTable tr");
        return Array.from(rows, (row) => {
          const columns = row.querySelectorAll("td");
          return Array.from(columns, (column) => (column as HTMLElement).innerText);
        });
      });
      if (!rows) return {};

      const averagePrice = rows[3][1];
      const price = parseFloat(
        parseFloat(averagePrice.replace(",", "").replace("EUR ", "")).toFixed(2)
      );

      return { bricklinkAverage: price };
    } catch (error) {
      console.error("BricklinkAverage error:", product.name, error);
      return {};
    }
  }
}
