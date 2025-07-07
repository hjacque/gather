import puppeteer, { Browser } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import {
  ProductEntity,
  Set,
} from "../../entities/product.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { CARDMARKET_FEE, USD_TO_EUR } from "../../constants";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PriceType } from "../../entities/price.entity";
import {
  PerformanceEntity,
  PerformancePeriodType,
  PerformanceType,
} from "../../entities/performance.entity";
import { ComputePerformancesUsecase } from "./computePerformance.usecase";
import { SetPerformancesUsecase } from "./setPerformances.usecase";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export type SyncUsecaseInputDto = {
  productId: string;
};
export class SyncSingleUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly setPerformancesUsecase: SetPerformancesUsecase,
  ) {}

  async execute(productId: string) {
    console.log("start");

    puppeteerExtra.use(Stealth());

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const product = await this.productRepository.getCard(productId);

    await this.syncProduct(product, today, 0);
    await this.setPerformancesUsecase.execute({productIds: [product.id]});

    console.log("end");
  }

  async syncProduct(product: ProductEntity, today: Date, inc: number) {
    await sleep((Math.floor(Math.random() * (10 + (inc % 6))) + 1) * 1000); // Random sleep between 1 and 17 seconds
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        "--ignore-certificate-errors",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const [
      cardMarketPrice,
      priceChartingPrice,
      ckBuyListPrice,
      abugamesBuyListPrice,
      starcitygamesBuyListPrice,
    ] = [
      await this.syncCardMarket(product, browser),
      undefined, // await this.syncPriceCharting(product, browser),
      await this.syncCardkingdomBuyList(product, browser),
      await this.syncAbugamesBuyList(product, browser),
      undefined, // await this.syncStarcitygamesBuyList(product, browser),
    ];

    const prices = await this.computePrices(
      product,
      cardMarketPrice,
      priceChartingPrice,
      ckBuyListPrice,
      abugamesBuyListPrice,
      starcitygamesBuyListPrice,
    );

    for (const key of prices.keys()) {
      await this.priceRepository.upsertPrice(
        product.id,
        prices.get(key),
        key,
        today,
      );
    }

    await browser.close();
  }

  // todo - implement factory pattern
  async syncCardMarket(
    product: ProductEntity,
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
      });
      await page.close();
      // console.log("data", data); // exemple: [ '3', 'K', 'menor-com', 'NM', 'nm+', '420,00 €', '1' ]

      const price =
        parseFloat(data[data.length - 2].replace(".", "")) *
        (1 - CARDMARKET_FEE);

      // console.log("CardMarket :", price);
      return price;
    } catch (error) {
      console.log("No CardMarket listing", product.name);
      await page.close();
      return undefined;
    }
  }

  // async syncPriceCharting(product: ProductEntity, browser: Browser) {
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

  async syncCardkingdomBuyList(product: ProductEntity, browser: Browser) {
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

  async syncAbugamesBuyList(product: ProductEntity, browser: Browser) {
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

  // async syncStarcitygamesBuyList(product: ProductEntity, browser: Browser) {
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
    product: ProductEntity,
    cardMarketPrice: number | undefined,
    priceChartingPrice: number | undefined,
    ckBuyListPrice: number | undefined,
    abugamesBuyListPrice: number | undefined,
    starcitygamesBuyListPrice: number | undefined,
  ) {
    const marketPrice = Math.min(cardMarketPrice || 0) || undefined;

    const buylistPrice =
      Math.max(
        ckBuyListPrice || 0,
        abugamesBuyListPrice || 0,
        starcitygamesBuyListPrice || 0,
      ) || undefined;

    const ratio =
      marketPrice &&
      buylistPrice &&
      Math.round((marketPrice / buylistPrice) * 100) - 100;

    return new Map([
      [PriceType.market, marketPrice],
      [PriceType.buylist, buylistPrice],
      [PriceType.cardmarket, cardMarketPrice],
      [PriceType.pricecharting, priceChartingPrice],
      [PriceType.cardkingdom, ckBuyListPrice],
      [PriceType.abugames, abugamesBuyListPrice],
      [PriceType.starcitygames, starcitygamesBuyListPrice],
      [PriceType.ratio, ratio],
    ]);
  }
}
