import puppeteer from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import { CardEntity } from "../../entities/card.entity";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";

export class SyncUsecase {
  constructor(private readonly cardRepository: CardRepositoryPort) {}

  async execute() {
    console.log("start");

    const cards = await this.cardRepository.getCards();
    if (!cards) {
      throw new Error("No cards found"); // todo handle custom error
    }

    console.log("cards", cards);

    for (const card of cards) {
      console.log(card);

      const [
        cardMarketPrice,
        priceChartingPrice,
        ckBuyListPrice,
        abugamesBuyListPrice,
      ] = [
        await this.syncCardMarket(card),
        0, // await this.syncPriceCharting(card),
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

      await this.cardRepository.updateCardPrices(card.id, prices);
    }
    console.log("end");
  }

  // todo - implement factory pattern
  async syncCardMarket(card: CardEntity) {
    puppeteerExtra.use(Stealth());

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    await page.goto(card.cardMarketLink);

    await page.waitForNetworkIdle();

    const data = await page.$eval("div.article-row", (fristRow) => {
      const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
      const elements = textContent.split("\n"); // Split by line and take the first line
      return elements;
    });

    console.log("data", data); // exemple: [ '3', 'K', 'menor-com', 'NM', 'nm+', '420,00 €', '1' ]

    await browser.close();

    const price = parseFloat(data[5]);
    console.log("price", price);
    return price;
  }

  async syncPriceCharting(card: CardEntity) {
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
    cardMarketPrice: number,
    priceChartingPrice: number,
    ckBuyListPrice: number,
    abugamesBuyListPrice: number
  ) {
    const price = cardMarketPrice / 1;
    return price;
  }
}
