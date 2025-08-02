import type { Page } from "rebrowser-puppeteer-core";
import { connect } from "puppeteer-real-browser";
import {
  ProductEntity,
} from "../../entities/product.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { USD_TO_EUR } from "../../constants";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { SetPerformancesUsecase } from "./setPerformances.usecase";
import { PerformanceRepositoryPort } from "repository/ports/performance.repository.port";
import { PriceType } from "../../types/priceType";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export type SyncUsecaseInputDto = {
  productId: string;
};
export class SyncSingleProductUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
    private readonly setPerformancesUsecase: SetPerformancesUsecase,
  ) {}

  async execute(productId: string) {

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { browser, page } = await connect({
      headless: false,
      disableXvfb: false, // set to true to go headless
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: {
        defaultViewport: null // uncomment in headful
      },
      ignoreAllFlags: false,
      plugins: [require("puppeteer-extra-plugin-stealth")()]
    });

    const product = await this.productRepository.getProduct(productId);

    const res = await this.syncProduct(product, today, page);

    await page.close();
    await browser.close();
    return res;
  }

  async syncProduct(product: ProductEntity, today: Date, page: Page): Promise<ProductEntity & {performance: {
    oneDayMarketPricePerformance: number | null;
    oneDayBuylistPricePerformance: number | null;
    oneWeekMarketPricePerformance: number | null;
    oneWeekBuylistPricePerformance: number | null;
    oneMonthMarketPricePerformance: number | null;
    oneMonthBuylistPricePerformance: number | null;
}}> {
    // prices
    const [
      cardMarket,
      ckBuyListPrice,
      abugamesBuyListPrice,
      fullSetPrice,
      tcgpPrice
    ] = [
      await this.syncCardMarket(product, page),
      await this.syncCardkingdomBuyList(product, page),
      await this.syncAbugamesBuyList(product, page),
      product.type !== "single" ? await this.syncFullSet(product, page) : undefined,
      await this.syncTCGP(product, page)
    ];
    const prices = await this.computePrices({
      product,
      cardMarketPrice: cardMarket?.price,
      ckBuyListPrice,
      abugamesBuyListPrice,
      cardMarketListingCount: cardMarket?.listingCount,
      fullSetPrice,
      tcgpPrice
      }
    );
    for (const key of prices.keys()) {
      await this.priceRepository.upsertPrice(
        product.id,
        prices.get(key),
        key,
        today,
      );
    }

    // performances
    await this.setPerformancesUsecase.execute({productIds: [product.id]});
    const performances = await this.performanceRepository.getPerformances(
      [product.id],
      today,
    );
    const performance = performances.get(product.id)!;

    console.debug(product, prices);

    return {...product, ...Object.fromEntries(prices), performance};
  }

  // todo - implement factory pattern
  async syncCardMarket(
    product: ProductEntity,
    page: Page,
  ): Promise<{price: number | undefined, listingCount: number | undefined} | undefined> {
    try {
      await page.goto(
        product.cardMarketLink +
          "?language=1&minCondition=2&isSigned=N&isAltered=N",
      );
      await page.waitForSelector("div.article-row", {
        visible: true,
        timeout: 3000
      });

      const data = await page.$eval("div.article-row", (fristRow) => {
        const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
        const elements = textContent.split("\n"); // Split by line and take the first line
        return elements;
      });
      const listingCount = await page.evaluate(() => {
        const dtElements = document.querySelectorAll('dl.labeled dt');
        for (let dt of dtElements) {
          if (dt.textContent?.trim() === 'Available items') {
            const dd = dt.nextElementSibling;
            return dd ? dd.textContent?.trim() : undefined;
          }
        }
        return undefined;
      }) || undefined;
      // console.log("data", data); // exemple: [ '3', 'K', 'menor-com', 'NM', 'nm+', '420,00 €', '1' ]

      const price = parseFloat(
        parseFloat(
          data[data.length - 2].replace(".", "").replace(",", "."),
        ).toFixed(2),
      ); // * (1 - CARDMARKET_FEE);

      return {
        price,
        listingCount: listingCount ? parseInt(listingCount) : undefined
      };
    } catch (error) {
      console.log("No CardMarket listing", product.name);
      return undefined;
    }
  }

  async syncCardkingdomBuyList(product: ProductEntity, page: Page) {
    if (!product.cardkingdomBuyListLink) {
      return ;
    }

    try {
      await page.goto(product.cardkingdomBuyListLink);
      await page.waitForSelector("span.sellDollarAmount", {
        visible: true,
        timeout: 3000
      });
      const data = await page.$eval("span.sellDollarAmount", (fristRow) => {
        const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
        const elements = textContent.split("\n"); // Split by line and take the first line
        return elements;
      });
      // console.log("cardkingdomBuyListLink", data);

      const price =
        parseFloat(
          data[0].replace("$", "").replace(",", "").replace(".", ","),
        ) * USD_TO_EUR;

      return price;
    } catch (error) {
      console.log("Not in Cardkingdom BuyList", product.name);
      return undefined;
    }
  }

  async syncAbugamesBuyList(product: ProductEntity, page: Page) {
    if (!product.abugamesBuyListLink) {
      return ;
    }

    try {
      await page.goto(product.abugamesBuyListLink);
      await page.waitForSelector("div.buylist span.ng-star-inserted", {
        visible: true,
        timeout: 3000
      });

      const data = await page.$eval(
        "div.buylist span.ng-star-inserted",
        (fristRow) => {
          const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
          const elements = textContent.split("\n"); // Split by line and take the first line
          return elements;
        },
      );

      const price =
        parseFloat(
          data[0].replace("$", "").replace(",", "").replace(".", ","),
        ) * USD_TO_EUR;

      return price;
    } catch (error) {
      console.log("Not in Abugames BuyList", product.name);
      return undefined;
    }
  }

  async syncFullSet(product: ProductEntity, page: Page) {
    if (!product.fullSetLink) {
      return
    }

    try {
      await page.goto(product.fullSetLink, { waitUntil: "networkidle2" });
      const totalValue = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('span'));
        const label = elements.find(el => el.textContent?.trim() === 'TOTAL VALUE');
        if (label && label.nextElementSibling) {
          return label.nextElementSibling.textContent?.trim();
        }
        return null;
      });

      const price = totalValue ?
        parseFloat((parseFloat(
          totalValue.replace("$", "").replace(",", "").replace(".", ","),
        ) * USD_TO_EUR).toFixed(2)) : undefined;

      return price;
    } catch (error) {
      console.log("Not in Full Set Link", product.name);
      return undefined;
    }
  }

  async syncTCGP(product: ProductEntity, page: Page) {
    if (!product.tcgpLink) {
      return
    }

    try {
      await page.goto(product.tcgpLink, { waitUntil: "networkidle0" });
      const el = await page.waitForSelector('.spotlight__price', { timeout: 3000 });
      if (!el) return undefined;

      const spotlightPrice = await page.evaluate(el => el.textContent, el);
      if (!spotlightPrice) return undefined;

      const price = spotlightPrice ?
        parseFloat((parseFloat(
          spotlightPrice.replace("$", "").replace(",", "").replace(".", ","),
        ) * USD_TO_EUR).toFixed(2)) : undefined;

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
    tcgpPrice
  } : {
      product: ProductEntity,
      cardMarketPrice: number | undefined,
      ckBuyListPrice: number | undefined,
      abugamesBuyListPrice: number | undefined,
      cardMarketListingCount: number | undefined,
      fullSetPrice: number | undefined,
      tcgpPrice: number | undefined
    }
  ) {
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
      Math.max(
        ckBuyListPrice || 0,
        abugamesBuyListPrice || 0,
      ) || undefined;
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
