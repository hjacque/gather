import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../../entities/product.entity";
import { PriceSourcePort, RawPrices } from "./priceSource.port";

export class TcgpSource implements PriceSourcePort {
  appliesTo(product: ProductEntity): boolean {
    return !!product.tcgpLink;
  }

  async fetch(
    product: ProductEntity,
    page: Page,
    usdToEur: number
  ): Promise<RawPrices> {
    try {
      await page.goto(product.tcgpLink!, { waitUntil: "networkidle0" });
      const el = await page.waitForSelector(".price-points__upper__price", {
        timeout: 3000,
      });
      if (!el) return {};

      const spotlightPrice = await page.evaluate(
        (el) => el.textContent,
        el
      );
      if (!spotlightPrice) return {};

      console.log("TCGP spotlightPrice:", spotlightPrice);

      const price = parseFloat(
        (
          parseFloat(
            spotlightPrice.replace("$", "").replace(",", "").replace(".", ",")
          ) * usdToEur
        ).toFixed(2)
      );

      return { tcgp: price };
    } catch {
      console.log("Not in TCG Link", product.name);
      return {};
    }
  }
}
