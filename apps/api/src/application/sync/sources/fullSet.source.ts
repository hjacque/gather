import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../../entities/product.entity";
import { PriceSourcePort, RawPrices } from "./priceSource.port";
import { ProductType } from "@prisma/client";

export class FullSetSource implements PriceSourcePort {
  appliesTo(product: ProductEntity): boolean {
    return !!product.fullSetLink && product.type !== ProductType.single;
  }

  async fetch(
    product: ProductEntity,
    page: Page,
    usdToEur: number
  ): Promise<RawPrices> {
    try {
      await page.goto(product.fullSetLink!, { waitUntil: "networkidle2" });
      const totalValue = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("span"));
        const label = elements.find(
          (el) => el.textContent?.trim() === "TOTAL VALUE"
        );
        if (label && label.nextElementSibling) {
          return label.nextElementSibling.textContent?.trim();
        }
        return null;
      });

      const price = totalValue
        ? parseFloat(
            (
              parseFloat(
                totalValue.replace("$", "").replace(",", "").replace(".", ",")
              ) * usdToEur
            ).toFixed(2)
          )
        : undefined;

      return { fullSet: price };
    } catch {
      console.log("Not in Full Set Link", product.name);
      return {};
    }
  }
}
