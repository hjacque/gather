import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../../entities/product.entity";
import { PriceSourcePort, RawPrices } from "./priceSource.port";

export class CardKingdomSource implements PriceSourcePort {
  appliesTo(product: ProductEntity): boolean {
    return !!product.cardkingdomBuyListLink;
  }

  async fetch(
    product: ProductEntity,
    page: Page,
    usdToEur: number
  ): Promise<RawPrices> {
    try {
      await page.goto(product.cardkingdomBuyListLink!);
      await page.waitForSelector("span.sellDollarAmount", {
        visible: true,
        timeout: 3000,
      });

      const data = await page.$eval("span.sellDollarAmount", (el) => {
        return (el as HTMLElement).innerText.trim().split("\n");
      });

      const price =
        parseFloat(
          data[0].replace("$", "").replace(",", "").replace(".", ",")
        ) * usdToEur;

      return { cardkingdom: price };
    } catch {
      console.log("Not in Cardkingdom BuyList", product.name);
      return {};
    }
  }
}
