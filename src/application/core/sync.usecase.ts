import puppeteer, { Browser } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import {
  Franchise,
  NewProductEntity,
  ProductType,
  Set,
} from "../../entities/product.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { USD_TO_EUR } from "../../constants";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { SetPerformancesUsecase } from "./setPerformances.usecase";
import { PriceType } from "../../types/priceType";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export type SyncUsecaseInputDto = {
  filter: {
    set?: Set;
    franchise?: Franchise;
    type?: ProductType | ProductType[];
  };
  mode: {
    headless: boolean;
  };
};
export class SyncUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly setPerformancesUsecase: SetPerformancesUsecase,
  ) {}

  async execute({ filter, mode }: SyncUsecaseInputDto) {
    console.log("start");

    puppeteerExtra.use(Stealth());

    let i = 0;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    while (true) {
      await sleep(2 * 1000); // Sleep 2 second

      const take = 4;
      const products = await this.productRepository.getProducts(filter, {
        take,
        page: i,
      });
      if (!products?.length) {
        console.log("No products found");
        i = 0;
        break;
      }
      i++;

      for (const product of products) {
        await sleep(Math.floor(Math.random() * 9 + 1) * 1000); // Random sleep between 1 and 10 seconds
        await this.syncProduct(product, today, i, mode);
      }
      // await Promise.all(products.map((product, i) =>
      //   this.syncProduct(product, today, i, mode)
      // ));
    }

    console.log("end");
  }

  async syncProduct(
    product: NewProductEntity,
    today: Date,
    inc: number,
    { headless }: { headless: boolean },
  ) {
    const browser = await puppeteer.launch({
      headless,
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

    // performances
    await this.setPerformancesUsecase.execute({productIds: [product.id]});

    console.debug(product, prices);

    await browser.close();
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
      });
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

  async syncCardkingdomBuyList(product: NewProductEntity, browser: Browser) {
    if (!product.cardkingdomBuyListLink) {
      return
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
      return
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

  async computePrices(
    product: NewProductEntity,
    cardMarketPrice: number | undefined,
    priceChartingPrice: number | undefined,
    ckBuyListPrice: number | undefined,
    abugamesBuyListPrice: number | undefined,
    starcitygamesBuyListPrice: number | undefined,
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
        starcitygamesBuyListPrice || 0,
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
