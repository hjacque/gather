import type { Page } from "rebrowser-puppeteer-core";
import { connect } from "puppeteer-real-browser";
import {
  Franchise,
  ProductEntity,
  ProductType,
  Set,
} from "../../entities/product.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { DEFAULT_USD_TO_EUR } from "../../constants";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { SetPerformancesUsecase } from "./setPerformances.usecase";
import { PriceType } from "../../types/priceType";
import { getEurToUsdRate } from "./helper";

export type SyncUsecaseInputDto = {
  filter: {
    set?: Set;
    franchise?: Franchise;
    type?: ProductType | ProductType[];
    tags?: string | string[];
  };
  mode: {
    headless: boolean;
  };
};
export class SyncUsecase {
  private USD_TO_EUR: number = DEFAULT_USD_TO_EUR;

  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly setPerformancesUsecase: SetPerformancesUsecase
  ) {}

  async execute({ filter, mode }: SyncUsecaseInputDto) {
    console.log("start");

    this.USD_TO_EUR = await getEurToUsdRate();

    let paginationPage = 1;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { browser, page } = await connect({
      headless: false,
      disableXvfb: !mode.headless,
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: {
        defaultViewport: null,
      },
      ignoreAllFlags: false,
      plugins: [require("puppeteer-extra-plugin-stealth")()],
    });
    await page.setViewport({
      width: Math.floor(1024 + Math.random() * 100),
      height: Math.floor(768 + Math.random() * 100),
    });
    // await page.setRequestInterception(true);
    // page.on("request", (req) => {
    //   const type = req.resourceType();
    //   if (["image", "stylesheet", "font", "media"].includes(type)) {
    //     req.abort();
    //   } else {
    //     req.continue();
    //   }
    // });

    while (true) {
      const take = 4;
      const products = await this.productRepository.getProducts(filter, {
        take,
        page: paginationPage,
      });
      if (!products?.length) {
        console.log("No products found");
        paginationPage = 1;
        break;
      }
      paginationPage++;

      for (const product of products) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await this.syncProduct(product, today, page);
      }
    }

    await page.close();
    await browser.close();

    console.log("end");
  }

  async syncProduct(product: ProductEntity, today: Date, page: Page) {
    // prices
    const [
      cardMarket,
      ckBuyListPrice,
      abugamesBuyListPrice,
      fullSetPrice,
      tcgpPrice,
    ] = [
      await this.syncCardMarket(product, page),
      await this.syncCardkingdomBuyList(product, page),
      await this.syncAbugamesBuyList(product, page),
      product.type !== "single"
        ? await this.syncFullSet(product, page)
        : undefined,
      await this.syncTCGP(product, page),
    ];

    const prices = await this.computePrices({
      product,
      cardMarketPrice: cardMarket?.price,
      ckBuyListPrice,
      abugamesBuyListPrice,
      cardMarketListingCount: cardMarket?.listingCount,
      fullSetPrice,
      tcgpPrice,
    });
    for (const key of prices.keys()) {
      await this.priceRepository.upsertPrice(
        product.id,
        prices.get(key),
        key,
        today
      );
    }

    // performances
    await this.setPerformancesUsecase.execute({ productIds: [product.id] });

    console.debug(product, prices);
  }

  // todo - implement factory pattern
  async syncCardMarket(
    product: ProductEntity,
    page: Page
  ): Promise<
    { price: number | undefined; listingCount: number | undefined } | undefined
  > {
    try {
      await page.goto(
        product.cardMarketLink +
          "?language=1&minCondition=2&isSigned=N&isAltered=N",
        {
          waitUntil: "networkidle2",
        }
      );

      const isTurnTile = await page.evaluate(() => {
        return document.body.innerText.includes(
          "Verify you are human by completing the action below."
        );
      });
      if (isTurnTile) {
        console.log("Cloudflare turntile detected");
        await new Promise((resolve) => setTimeout(resolve, 5500));
      }

      await page.waitForSelector("div.article-row", {
        visible: true,
        timeout: 3000,
      });

      const data = await page.$eval("div.article-row", (fristRow) => {
        const textContent = fristRow.innerText.trim();
        const elements = textContent.split("\n"); // Split by line and take the first line
        return elements;
      });
      const listingCount =
        (await page.evaluate(() => {
          const dtElements = document.querySelectorAll("dl.labeled dt");
          for (let dt of dtElements) {
            if (dt.textContent?.trim() === "Available items") {
              const dd = dt.nextElementSibling;
              return dd ? dd.textContent?.trim() : undefined;
            }
          }
          return undefined;
        })) || undefined;

      // console.log("data", data); // exemple: [ '3', 'K', 'menor-com', 'NM', 'nm+', '420,00 €', '1' ]

      const price = parseFloat(
        parseFloat(
          data[data.length - 2].replace(".", "").replace(",", ".")
        ).toFixed(2)
      );

      return {
        price,
        listingCount: listingCount ? parseInt(listingCount) : undefined,
      };
    } catch (error) {
      console.log("No CardMarket listing", product.name);
      return undefined;
    }
  }

  async syncCardkingdomBuyList(product: ProductEntity, page: Page) {
    if (!product.cardkingdomBuyListLink) {
      return;
    }

    try {
      await page.goto(product.cardkingdomBuyListLink);
      await page.waitForSelector("span.sellDollarAmount", {
        visible: true,
        timeout: 3000,
      });

      const data = await page.$eval("span.sellDollarAmount", (fristRow) => {
        const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
        const elements = textContent.split("\n"); // Split by line and take the first line
        return elements;
      });

      const price =
        parseFloat(
          data[0].replace("$", "").replace(",", "").replace(".", ",")
        ) * this.USD_TO_EUR;

      return price;
    } catch (error) {
      console.log("Not in Cardkingdom BuyList", product.name);
      return undefined;
    }
  }

  async syncAbugamesBuyList(product: ProductEntity, page: Page) {
    if (!product.abugamesBuyListLink) {
      return;
    }

    try {
      await page.goto(product.abugamesBuyListLink);
      await page.waitForSelector("div.buylist span.ng-star-inserted", {
        visible: true,
        timeout: 3000,
      });

      const data = await page.evaluate(() => {
        // Find all product panels
        const panels = Array.from(
          document.querySelectorAll(".row.panel.panel-default")
        );
        for (const panel of panels) {
          const cols = Array.from(panel.children).filter(
            (ch) => ch.classList && ch.classList.contains("col-md-2")
          );

          // try to find the column that contains the NM label
          let nmCol = cols.find((c) => {
            const tb = c.querySelector(".titleBox");
            if (tb?.textContent && tb.textContent.trim() === "NM") return true;
            // fallback: check text content for 'NM'
            return /\bNM\b/.test((c.textContent || "").trim());
          });

          // fallback: if we couldn't find by label, assume the second col-md-2 is NM (based on your markup)
          if (!nmCol) nmCol = cols[1] || null;
          if (!nmCol) return null;

          // find the first $ price inside that column
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
            ) * this.USD_TO_EUR
          : undefined;

      return price;
    } catch (error) {
      console.log("Not in Abugames BuyList", product.name);
      return undefined;
    }
  }

  async syncFullSet(product: ProductEntity, page: Page) {
    if (!product.fullSetLink) {
      return;
    }

    try {
      await page.goto(product.fullSetLink, { waitUntil: "networkidle2" });
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
              ) * this.USD_TO_EUR
            ).toFixed(2)
          )
        : undefined;

      return price;
    } catch (error) {
      console.log("Not in Full Set Link", product.name);
      return undefined;
    }
  }

  async syncTCGP(product: ProductEntity, page: Page) {
    if (!product.tcgpLink) {
      return;
    }

    try {
      await page.goto(product.tcgpLink, { waitUntil: "networkidle0" });
      const el = await page.waitForSelector(".price-points__upper__price", {
        timeout: 3000,
      });
      if (!el) return undefined;

      const spotlightPrice = await page.evaluate((el) => el.textContent, el);
      if (!spotlightPrice) return undefined;

      const price = spotlightPrice
        ? parseFloat(
            (
              parseFloat(
                spotlightPrice
                  .replace("$", "")
                  .replace(",", "")
                  .replace(".", ",")
              ) * this.USD_TO_EUR
            ).toFixed(2)
          )
        : undefined;

      return price;
    } catch (error) {
      console.log("Not in Full Set Link", product.name);
      return undefined;
    }
  }

  async computePrices({
    product,
    cardMarketPrice,
    ckBuyListPrice,
    abugamesBuyListPrice,
    cardMarketListingCount,
    fullSetPrice,
    tcgpPrice,
  }: {
    product: ProductEntity;
    cardMarketPrice: number | undefined;
    ckBuyListPrice: number | undefined;
    abugamesBuyListPrice: number | undefined;
    cardMarketListingCount: number | undefined;
    fullSetPrice: number | undefined;
    tcgpPrice?: number | undefined;
  }) {
    const pricesMap: Map<PriceType, number | undefined> = new Map([
      ["cardmarket", cardMarketPrice],
      ["cardkingdom", ckBuyListPrice],
      ["abugames", abugamesBuyListPrice],
      ["cardmarketListingCount", cardMarketListingCount],
      ["fullSet", fullSetPrice],
      ["tcgp", tcgpPrice],
    ]);

    const marketPrice = Math.min(cardMarketPrice || 0) || undefined;
    pricesMap.set("market", marketPrice);

    const buylistPrice =
      ckBuyListPrice || abugamesBuyListPrice
        ? Math.max(ckBuyListPrice || 0, abugamesBuyListPrice || 0)
        : undefined;
    pricesMap.set("buylist", buylistPrice);

    const ratio =
      marketPrice &&
      buylistPrice &&
      Math.round((marketPrice / buylistPrice) * 100) - 100;
    pricesMap.set("ratio", ratio);

    if (product.type !== "single" && typeof product.boosterCount === "number") {
      const pricePerBooster =
        typeof marketPrice === "number"
          ? parseFloat((marketPrice / product.boosterCount).toFixed(2))
          : undefined;
      pricesMap.set("perBooster", pricePerBooster);
    }

    return pricesMap;
  }
}
