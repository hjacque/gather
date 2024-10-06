import puppeteer, { Browser } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import { CardEntity, Set } from "../../entities/card.entity";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { CARDMARKET_FEE, USD_TO_EUR } from "../../constants";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PriceType } from "../../entities/price.entity";
import {
  PerformanceEntity,
  PerformancePeriodType,
  PerformanceType,
} from "../../entities/performance.entity";
import { ComputePerformancesUsecase } from "./computePerformance.usecase";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

type SyncUsecaseInputDto = {
  set?: Set;
};
export class SyncUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly computePerformancesUsecase: ComputePerformancesUsecase
  ) {}

  async execute({ set: setInput }: SyncUsecaseInputDto) {
    console.log("start");

    puppeteerExtra.use(Stealth());

    let i = 0;
    for (const set of setInput
      ? [setInput]
      : [
          Set.alpha,
          Set.beta,
          Set.unlimited,
          Set.arabian_nights,
          Set.antiquities,
          Set.legends,
          Set.the_dark,
        ]) {
      while (true) {
        const take = 20;
        const cards = await this.cardRepository.getCards(set as Set, take, i);
        if (!cards?.length) {
          console.log("No cards found");
          i = 0;
          break;
        }
        i += take;

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

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        for (const card of cards) {
          console.log("--------------");
          console.log(card.name);

          await sleep((Math.floor(Math.random() * 3) + 1) * 1000); // sleep for 1 to 3 seconds
          const [
            cardMarketPrice,
            priceChartingPrice,
            ckBuyListPrice,
            abugamesBuyListPrice,
            starcitygamesBuyListPrice,
          ] = [
            await this.syncCardMarket(card, browser),
            undefined, // await this.syncPriceCharting(card, browser),
            await this.syncCardkingdomBuyList(card, browser),
            await this.syncAbugamesBuyList(card, browser),
            undefined, // await this.syncStarcitygamesBuyList(card, browser),
          ];

          const prices = await this.computePrices(
            card,
            cardMarketPrice,
            priceChartingPrice,
            ckBuyListPrice,
            abugamesBuyListPrice,
            starcitygamesBuyListPrice
          );

          console.log("market     ==>>", prices.get(PriceType.market));
          console.log("buylist    ==>>", prices.get(PriceType.buylist));

          for (const key of prices.keys()) {
            await this.priceRepository.upsertPrice(
              card.id,
              prices.get(key),
              key,
              today
            );
          }
        }

        await browser.close();
      }
    }

    await this.computePerformancesUsecase.execute({ set: setInput });

    console.log("end");
  }

  // todo - implement factory pattern
  async syncCardMarket(
    card: CardEntity,
    browser: Browser
  ): Promise<number | undefined> {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    try {
      await page.goto(
        card.cardMarketLink +
          "?language=1&minCondition=2&isSigned=N&isAltered=N"
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

      console.log("CardMarket :", price);
      return price;
    } catch (error) {
      console.log("No CardMarket listing");
      await page.close();
      return undefined;
    }
  }

  // async syncPriceCharting(card: CardEntity, browser: Browser) {
  //   try {
  //     await page.goto(card.priceChartingLink);

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

  async syncCardkingdomBuyList(card: CardEntity, browser: Browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    try {
      await page.goto(card.cardkingdomBuyListLink);
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
          data[0].replace("$", "").replace(",", "").replace(".", ",")
        ) * USD_TO_EUR;

      console.log("cardkingdom buylist price", price);
      return price;
    } catch (error) {
      await page.close();
      console.log("Not in Cardkingdom BuyList");
      return undefined;
    }
  }

  async syncAbugamesBuyList(card: CardEntity, browser: Browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    try {
      await page.goto(card.abugamesBuyListLink);
      await page.waitForNetworkIdle();

      const data = await page.$eval(
        "div.buylist span.ng-star-inserted",
        (fristRow) => {
          const textContent = fristRow.innerText.trim(); // Get text content and trim any extra spaces
          const elements = textContent.split("\n"); // Split by line and take the first line
          return elements;
        }
      );
      await page.close();

      const price =
        parseFloat(
          data[0].replace("$", "").replace(",", "").replace(".", ",")
        ) * USD_TO_EUR;

      console.log("abugames buylist price", price);

      return price;
    } catch (error) {
      await page.close();
      console.log("Not in Abugames BuyList");
      return undefined;
    }
  }

  // async syncStarcitygamesBuyList(card: CardEntity, browser: Browser) {
  //   await page.goto(card.cardMarketLink);

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
    card: CardEntity,
    cardMarketPrice: number | undefined,
    priceChartingPrice: number | undefined,
    ckBuyListPrice: number | undefined,
    abugamesBuyListPrice: number | undefined,
    starcitygamesBuyListPrice: number | undefined
  ) {
    const marketTuple = [cardMarketPrice].reduce(
      (acc, currentValue) => {
        if (currentValue) {
          acc[0] = acc[0] ? acc[0] + currentValue : currentValue;
          acc[1] = acc[1] ? acc[1] + 1 : 1;
        }
        return acc;
      },
      [0, 0]
    );
    const marketPrice = marketTuple[1]
      ? Math.round(marketTuple[0] / marketTuple[1])
      : undefined;

    const buylistTuple = [
      ckBuyListPrice,
      abugamesBuyListPrice,
      starcitygamesBuyListPrice,
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
    const buylistPrice = buylistTuple[1]
      ? Math.round(buylistTuple[0] / buylistTuple[1])
      : undefined;

    const estimatedTuple =
      marketPrice && buylistPrice
        ? [marketPrice, buylistPrice].reduce(
            (acc, currentValue) => {
              if (currentValue) {
                acc[0] = acc[0] ? acc[0] + currentValue : currentValue;
                acc[1] = acc[1] ? acc[1] + 1 : 1;
              }
              return acc;
            },
            [0, 0]
          )
        : [0, 0];
    const estimatedValue = estimatedTuple[1]
      ? Math.round(estimatedTuple[0] / estimatedTuple[1])
      : undefined;

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

  async computePerformances(
    cardId: string
  ): Promise<Omit<PerformanceEntity, "id">[]> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const performances: Omit<PerformanceEntity, "id">[] = [];

    const todayMarketPrice = await this.priceRepository.getOne(
      cardId,
      PriceType.market,
      today
    );
    const todayBuylistPrice = await this.priceRepository.getOne(
      cardId,
      PriceType.buylist,
      today
    );

    const oneDayAgo = new Date(today);
    oneDayAgo.setUTCDate(today.getUTCDate() - 1);
    const oneDayOldMarketPrice = await this.priceRepository.getOne(
      cardId,
      PriceType.market,
      oneDayAgo
    );
    const oneDayOldBuylistPrice = await this.priceRepository.getOne(
      cardId,
      PriceType.buylist,
      oneDayAgo
    );

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setUTCDate(today.getUTCDate() - 7);
    const oneWeekOldMarketPrice = await this.priceRepository.getOne(
      cardId,
      PriceType.market,
      oneWeekAgo
    );
    const oneWeekOldBuylistPrice = await this.priceRepository.getOne(
      cardId,
      PriceType.buylist,
      oneWeekAgo
    );

    const oneMonthAgo = new Date(today);
    oneMonthAgo.setUTCMonth(today.getUTCMonth() - 1);
    const oneMonthOldMarketPrice = await this.priceRepository.getOne(
      cardId,
      PriceType.market,
      oneMonthAgo
    );
    const oneMonthOldBuylistPrice = await this.priceRepository.getOne(
      cardId,
      PriceType.buylist,
      oneMonthAgo
    );

    const oneDayMarketPricePerformance =
      oneDayOldMarketPrice?.value && todayMarketPrice?.value
        ? Math.round(
            (todayMarketPrice.value / oneDayOldMarketPrice.value - 1) * 100
          )
        : null;
    performances.push({
      cardId,
      value: oneDayMarketPricePerformance,
      date: today,
      periodType: PerformancePeriodType.daily,
      type: PerformanceType.market,
    });
    const oneDayBuylistPricePerformance =
      oneDayOldBuylistPrice?.value && todayBuylistPrice?.value
        ? Math.round(
            (todayBuylistPrice.value / oneDayOldBuylistPrice.value - 1) * 100
          )
        : null;
    performances.push({
      cardId,
      value: oneDayBuylistPricePerformance,
      date: today,
      periodType: PerformancePeriodType.daily,
      type: PerformanceType.buylist,
    });

    const oneWeekMarketPricePerformance =
      oneWeekOldMarketPrice?.value && todayMarketPrice?.value
        ? Math.round(
            (todayMarketPrice.value / oneWeekOldMarketPrice.value - 1) * 100
          )
        : null;
    performances.push({
      cardId,
      value: oneWeekMarketPricePerformance,
      date: today,
      periodType: PerformancePeriodType.weekly,
      type: PerformanceType.market,
    });
    const oneWeekBuylistPricePerformance =
      oneWeekOldBuylistPrice?.value && todayBuylistPrice?.value
        ? Math.round(
            (todayBuylistPrice.value / oneWeekOldBuylistPrice.value - 1) * 100
          )
        : null;
    performances.push({
      cardId,
      value: oneWeekBuylistPricePerformance,
      date: today,
      periodType: PerformancePeriodType.weekly,
      type: PerformanceType.buylist,
    });

    const oneMonthMarketPricePerformance =
      oneMonthOldMarketPrice?.value && todayMarketPrice?.value
        ? Math.round(
            (todayMarketPrice.value / oneMonthOldMarketPrice.value - 1) * 100
          )
        : null;
    performances.push({
      cardId,
      value: oneMonthMarketPricePerformance,
      date: today,
      periodType: PerformancePeriodType.monthly,
      type: PerformanceType.market,
    });
    const oneMonthBuylistPricePerformance =
      oneMonthOldBuylistPrice?.value && todayBuylistPrice?.value
        ? Math.round(
            (todayBuylistPrice.value / oneMonthOldBuylistPrice.value - 1) * 100
          )
        : null;
    performances.push({
      cardId,
      value: oneMonthBuylistPricePerformance,
      date: today,
      periodType: PerformancePeriodType.monthly,
      type: PerformanceType.buylist,
    });

    return performances;
  }
}
