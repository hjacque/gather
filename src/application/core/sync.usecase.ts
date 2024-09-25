import puppeteer, { Browser, Page } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import { CardEntity } from "../../entities/card.entity";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { CARDMARKET_FEE, EBAY_FEE, USD_TO_EUR } from "../../constants";

export class SyncUsecase {
  constructor(private readonly cardRepository: CardRepositoryPort) {}

  async execute() {
    console.log("start");

    const cards = await this.cardRepository.getCards();
    if (!cards) {
      throw new Error("No cards found"); // todo handle custom error
    }

    puppeteerExtra.use(Stealth());
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    for (const card of cards) {
      console.log(card.name);

      if (card.cardMarketPrice) {
        continue;
      }

      const [
        cardMarketPrice,
        priceChartingPrice,
        ckBuyListPrice,
        abugamesBuyListPrice,
      ] = [
        await this.syncCardMarket(card, page),
        await this.syncPriceCharting(card, page),
        0, //await this.syncCKBuyList(card),
        0, //await this.syncAbugamesBuyList(card),
      ];

      const marketPrice = await this.syncMarketPrice(
        card,
        cardMarketPrice,
        priceChartingPrice,
        ckBuyListPrice,
        abugamesBuyListPrice
      );

      const prices = {
        priceChartingPrice,
        cardMarketPrice,
        ckBuyListPrice,
        abugamesBuyListPrice,
        marketPrice,
      };

      if (card.marketPrice !== marketPrice) {
        await this.cardRepository.updateCardPrices(card.id, prices);
      }
    }

    await browser.close();
    console.log("end");
  }

  // todo - implement factory pattern
  async syncCardMarket(
    card: CardEntity,
    page: Page
  ): Promise<number | undefined> {
    try {
      await page.goto(
        card.cardMarketLink +
          "?language=1&minCondition=2&isSigned=N&isAltered=N"
      );

      await page.waitForNetworkIdle();

      const data = await page.$eval("div.article-row", (fristRow) => {
        const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
        const elements = textContent.split("\n"); // Split by line and take the first line
        return elements;
      });

      // console.log("data", data); // exemple: [ '3', 'K', 'menor-com', 'NM', 'nm+', '420,00 €', '1' ]

      const price =
        parseFloat(data[data.length - 2].replace(".", "")) *
        (1 - CARDMARKET_FEE);
      console.log("CardMarket :", price);
      return price;
    } catch (error) {
      console.log("No CardMarket listing");
      return undefined;
    }
  }

  async syncPriceCharting(card: CardEntity, page: Page) {
    try {
      await page.goto(card.priceChartingLink);

      await page.waitForNetworkIdle();

      const data = await page.$eval("table.info_box", (fristRow) => {
        const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
        const elements = textContent.split("\n"); // Split by line and take the first line
        return elements;
      });

      const [_ungradedPrice, _grade7Price, grade8Price, grade9Price] = data[3]
        .split("\t")
        .map((price) =>
          price
            .split(" ")[0]
            .replace("$", "")
            .replace(/\.\w{2}/g, "")
            .replace(",", "")
        );

      const price =
        ((parseFloat(grade8Price) + parseFloat(grade9Price)) / 2) *
        USD_TO_EUR *
        (1 - EBAY_FEE);
      console.log("Pricecharting :", price);
      return price;
    } catch (error) {
      console.log("No PriceCharting listing");
      return undefined;
    }
  }

  async syncCKBuyList(card: CardEntity) {
    puppeteerExtra.use(Stealth());

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    await page.goto(card.cardMarketLink);

    await page.waitForNetworkIdle();

    // handle paginated tables
    const data = await page.evaluate(() => {
      const tds = Array.from(document.querySelectorAll("table tr td"));
      return tds.map((td) => (td as any).innerText);
    });
    console.log(data);
    // await page.waitForSelector(".lot-container");
    // const element = await page.$(".lot-container");
    // const value = await element?.evaluate((el) => el.textContent);
    // console.log(value);

    await browser.close();

    const price = 0;
    return price;
  }

  async syncAbugamesBuyList(card: CardEntity) {
    puppeteerExtra.use(Stealth());

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    await page.goto(card.cardMarketLink);

    await page.waitForNetworkIdle();

    // handle paginated tables
    const data = await page.evaluate(() => {
      const tds = Array.from(document.querySelectorAll("table tr td"));
      return tds.map((td) => (td as any).innerText);
    });
    console.log(data);
    // await page.waitForSelector(".lot-container");
    // const element = await page.$(".lot-container");
    // const value = await element?.evaluate((el) => el.textContent);
    // console.log(value);

    await browser.close();

    const price = 0;
    return price;
  }

  async syncMarketPrice(
    card: CardEntity,
    cardMarketPrice: number | undefined,
    priceChartingPrice: number | undefined,
    ckBuyListPrice: number | undefined,
    abugamesBuyListPrice: number | undefined
  ) {
    const tuple = [
      cardMarketPrice,
      priceChartingPrice,
      ckBuyListPrice,
      abugamesBuyListPrice,
    ].reduce(
      (acc, currentValue) => {
        if (currentValue) {
          acc[0] = acc[0] ? acc[0] + currentValue : currentValue;
          acc[1] = acc[1] ? acc[1] + 1 : 1;
        }
        return acc;
      },
      [0, 0]
    );
    const price = tuple[1] ? Math.round(tuple[0] / tuple[1]) : undefined;
    console.log("===>>", price);
    return price;
  }
}
