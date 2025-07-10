import puppeteer, { Browser } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import {
  NewProductEntity,
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
    puppeteerExtra.use(Stealth());

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const product = await this.productRepository.getProduct(productId);

    return this.syncProduct(product, today, 0);
  }

  async syncProduct(product: NewProductEntity, today: Date, inc: number): Promise<NewProductEntity & {performance: {
    oneDayMarketPricePerformance: number | null;
    oneDayBuylistPricePerformance: number | null;
    oneWeekMarketPricePerformance: number | null;
    oneWeekBuylistPricePerformance: number | null;
    oneMonthMarketPricePerformance: number | null;
    oneMonthBuylistPricePerformance: number | null;
}}> {
    // await sleep((Math.floor(Math.random() * (10 + (inc % 6))) + 1) * 1000); // Random sleep between 1 and 17 seconds
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--ignore-certificate-errors",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    // prices
    const [
      cardMarketPrice,
      ckBuyListPrice,
      abugamesBuyListPrice,
    ] = [
      await this.syncCardMarket(product, browser),
      await this.syncCardkingdomBuyList(product, browser),
      await this.syncAbugamesBuyList(product, browser),
    ];
    const prices = await this.computePrices(
      product,
      cardMarketPrice,
      ckBuyListPrice,
      abugamesBuyListPrice,
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

    await browser.close();

    return {...product, ...Object.fromEntries(prices), performance};
  }

  // todo - implement factory pattern
  async syncCardMarket(
    product: NewProductEntity,
    browser: Browser,
  ): Promise<number | undefined> {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    );

    try {
      await page.goto(
        product.cardMarketLink +
          "?language=1&minCondition=2&isSigned=N&isAltered=N",
      );
      await page.waitForSelector("div.article-row", {
        visible: true,
      });
      await page.waitForNetworkIdle();

      const data = await page.$eval("div.article-row", (fristRow) => {
        const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
        const elements = textContent.split("\n"); // Split by line and take the first line
        return elements;
      })
      await page.close();
      // console.log("data", data); // exemple: [ '3', 'K', 'menor-com', 'NM', 'nm+', '420,00 €', '1' ]

      const price = parseFloat(
        parseFloat(
          data[data.length - 2].replace(".", "").replace(",", "."),
        ).toFixed(2),
      ); // * (1 - CARDMARKET_FEE);

      // console.log("CardMarket :", price);
      return price;
    } catch (error) {
      console.log("No CardMarket listing", product.name);
      await page.close();
      return undefined;
    }
  }

  // async syncPriceCharting(product: NewProductEntity, browser: Browser) {
  //   try {
  //     await page.goto(product.priceChartingLink);

  //     await page.waitForNetworkIdle();

  //     const data = await page.$eval("table.info_box", (fristRow) => {
  //       const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
  //       const elements = textContent.split("\n"); // Split by line and take the first line
  //       return elements;
  //     });

  //     const [_ungradedPrice, _grade7Price, grade8Price, grade9Price] = data[3]
  //       .split("\t")
  //       .map((price) =>
  //         price
  //           .split(" ")[0]
  //           .replace("$", "")
  //           .replace(/\.\w{2}/g, "")
  //           .replace(",", "")
  //       );

  //     const price =
  //       ((parseFloat(grade8Price) + parseFloat(grade9Price)) / 2) *
  //       USD_TO_EUR *
  //       (1 - EBAY_FEE);
  //     console.log("Pricecharting :", price);
  //     return price;
  //   } catch (error) {
  //     console.log("No PriceCharting listing");
  //     return undefined;
  //   }
  // }

  async syncCardkingdomBuyList(product: NewProductEntity, browser: Browser) {
    if (!product.cardkingdomBuyListLink) {
      return ;
    }
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    );

    try {
      await page.goto(product.cardkingdomBuyListLink);
      await page.waitForNetworkIdle();

      const data = await page.$eval("span.sellDollarAmount", (fristRow) => {
        const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
        const elements = textContent.split("\n"); // Split by line and take the first line
        return elements;
      });
      await page.close();
      // console.log("cardkingdomBuyListLink", data);

      const price =
        parseFloat(
          data[0].replace("$", "").replace(",", "").replace(".", ","),
        ) * USD_TO_EUR;

      // console.log("cardkingdom buylist price", price);
      return price;
    } catch (error) {
      await page.close();
      console.log("Not in Cardkingdom BuyList", product.name);
      return undefined;
    }
  }

  async syncAbugamesBuyList(product: NewProductEntity, browser: Browser) {
    if (!product.abugamesBuyListLink) {
      return ;
    }
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    );

    try {
      await page.goto(product.abugamesBuyListLink);
      await page.waitForNetworkIdle();

      const data = await page.$eval(
        "div.buylist span.ng-star-inserted",
        (fristRow) => {
          const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
          const elements = textContent.split("\n"); // Split by line and take the first line
          return elements;
        },
      );
      await page.close();

      const price =
        parseFloat(
          data[0].replace("$", "").replace(",", "").replace(".", ","),
        ) * USD_TO_EUR;

      // console.log("abugames buylist price", price);

      return price;
    } catch (error) {
      await page.close();
      console.log("Not in Abugames BuyList", product.name);
      return undefined;
    }
  }

  // async syncStarcitygamesBuyList(product: NewProductEntity, browser: Browser) {
  //   await page.goto(product.cardMarketLink);

  //   await page.waitForNetworkIdle();

  //   // handle paginated tables
  //   const data = await page.evaluate(() => {
  //     const tds = Array.from(document.querySelectorAll("table tr td"));
  //     return tds.map((td) => (td as any).innerText);
  //   });
  //   console.log(data);
  //   // await page.waitForSelector(".lot-container");
  //   // const element = await page.$(".lot-container");
  //   // const value = await element?.evaluate((el) => el.textContent);
  //   // console.log(value);

  //   const price = 0;
  //   return price;
  // }

  async computePrices(
    product: NewProductEntity,
    cardMarketPrice: number | undefined,
    ckBuyListPrice: number | undefined,
    abugamesBuyListPrice: number | undefined,
  ) {
    const pricesMap: Map<PriceType, number | undefined> = new Map([
      ["cardmarket", cardMarketPrice],
      ["cardkingdom", ckBuyListPrice],
      ["abugames", abugamesBuyListPrice],
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
