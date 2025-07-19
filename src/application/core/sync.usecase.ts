import type { Page } from "rebrowser-puppeteer-core";
import { connect } from "puppeteer-real-browser";
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
        defaultViewport: null
      },
      ignoreAllFlags: false,
      plugins: [require("puppeteer-extra-plugin-stealth")()]
    });
    // await page.setViewport({ width: 1920, height: 1080 });
    // await page.setUserAgent(
    //   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    // );
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
        await sleep(1500);
        await this.syncProduct(product, today, page);
      }
    }

    await page.close();
    await browser.close();

    console.log("end");
  }

  async syncProduct(
    product: NewProductEntity,
    today: Date,
    page: Page
  ) {

    // prices
    const [
      cardMarket,
      ckBuyListPrice,
      abugamesBuyListPrice,
      fullSetPrice
    ] = [
      await this.syncCardMarket(product, page),
      await this.syncCardkingdomBuyList(product, page),
      await this.syncAbugamesBuyList(product, page),
      product.type !== "single" ? await this.syncFullSet(product, page) : undefined
    ];

    const prices = await this.computePrices({
      product,
      cardMarketPrice: cardMarket?.price,
      ckBuyListPrice,
      abugamesBuyListPrice,
      cardMarketListingCount: cardMarket?.listingCount,
      fullSetPrice
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

    console.debug(product, prices);
  }

  // todo - implement factory pattern
  async syncCardMarket(
    product: NewProductEntity,
    page: Page
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
      );

      return {
        price,
        listingCount: listingCount ? parseInt(listingCount) : undefined
      };
    } catch (error) {
      console.log("No CardMarket listing", product.name);
      return undefined;
    }
  }

  async syncCardkingdomBuyList(product: NewProductEntity, page: Page) {
    if (!product.cardkingdomBuyListLink) {
      return
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

  async syncAbugamesBuyList(product: NewProductEntity, page: Page) {
    if (!product.abugamesBuyListLink) {
      return
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

  async syncFullSet(product: NewProductEntity, page: Page) {
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

  async computePrices({
    product,
    cardMarketPrice,
    ckBuyListPrice,
    abugamesBuyListPrice,
    cardMarketListingCount,
    fullSetPrice
  } : {
      product: NewProductEntity,
      cardMarketPrice: number | undefined,
      ckBuyListPrice: number | undefined,
      abugamesBuyListPrice: number | undefined,
      cardMarketListingCount: number | undefined,
      fullSetPrice: number | undefined
    }
  ) {
    const pricesMap: Map<PriceType, number | undefined> = new Map([
      ["cardmarket", cardMarketPrice],
      ["cardkingdom", ckBuyListPrice],
      ["abugames", abugamesBuyListPrice],
      ["cardmarketListingCount", cardMarketListingCount],
      ["fullSet", fullSetPrice]
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
