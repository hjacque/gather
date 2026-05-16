import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../../entities/product.entity";
import { PriceSourcePort, RawPrices } from "./priceSource.port";
import { ProductType } from "@prisma/client";

export class BricklinkSource implements PriceSourcePort {
  appliesTo(product: ProductEntity): boolean {
    return !!product.bricklinkLink && product.type === ProductType.minifigure;
  }

  async fetch(
    product: ProductEntity,
    page: Page,
    _usdToEur: number
  ): Promise<RawPrices> {
    try {
      await page.goto(
        `${product.bricklinkLink}#T=S&O={"ss":"FR","cond":"N","reg":"-1","ca":"2","rpp":"500","iconly":0}`,
        { waitUntil: "networkidle2" }
      );

      const rows = await page.evaluate(() => {
        const rows = document.querySelectorAll(".pciItemTable tr");
        return Array.from(rows, (row) => {
          const columns = row.querySelectorAll("td");
          return Array.from(columns, (column) => (column as HTMLElement).innerText);
        });
      });
      if (!rows) return {};

      const lowestPrice = rows[2][4]?.replace("\n", " ").split(" ")[1];
      const price = parseFloat(
        parseFloat(lowestPrice.replace(",", "")).toFixed(2)
      );

      const listingCount = await page.evaluate(() => {
        const el = document.querySelector("span#_idtxtTotalFound");
        if (el) {
          const text = el.textContent?.trim() || "";
          return parseInt(text.replace(" Items Found", ""));
        }
        return undefined;
      });

      // Bricklink is the market-price source for minifigures; stored under "cardmarket"
      // so the PriceAggregator can compute Market Price and Ratio identically for all types.
      return {
        cardmarket: price,
        cardmarketListingCount: listingCount,
      };
    } catch (error) {
      console.error("Not in Bricklink Link", product.name, error);
      return {};
    }
  }
}
