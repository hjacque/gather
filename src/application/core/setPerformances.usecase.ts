import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";
import {
  PerformanceEntity,
} from "../../entities/performance.entity";

export type SetPerformancesInputDto = {
    productIds: string[];
};

export class SetPerformancesUsecase {
  constructor(
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
  ) {}

  async execute({ productIds }: SetPerformancesInputDto) {
    console.log("start");

    puppeteerExtra.use(Stealth());

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const promises = [];
    for (const productId of productIds) {

      const performances: Omit<PerformanceEntity, "id">[] = [];

      const [todayMarketPrice, todayBuylistPrice] = await Promise.all([this.priceRepository.getOne(
        productId,
        "market",
        today,
      ), this.priceRepository.getOne(
        productId,
        "buylist",
        today,
      )]);

      const oneDayAgo = new Date(today);
      oneDayAgo.setUTCDate(today.getUTCDate() - 1);
      const [oneDayOldMarketPrice, oneDayOldBuylistPrice] = await Promise.all([this.priceRepository.getOne(
        productId,
        "market",
        oneDayAgo,
      ), this.priceRepository.getOne(
        productId,
        "buylist",
        oneDayAgo,
      )]);

      const oneWeekAgo = new Date(today);
      oneWeekAgo.setUTCDate(today.getUTCDate() - 7);
      const [oneWeekOldMarketPrice, oneWeekOldBuylistPrice] = await Promise.all([this.priceRepository.getOne(
        productId,
        "market",
        oneWeekAgo,
      ), this.priceRepository.getOne(
        productId,
        "buylist",
        oneWeekAgo,
      )]);

      const thrityDaysAgo = new Date(today);
      thrityDaysAgo.setUTCDate(today.getUTCDate() - 30);
      const [oneMonthOldMarketPrice, oneMonthOldBuylistPrice] = await Promise.all([this.priceRepository.getOne(
        productId,
        "market",
        thrityDaysAgo,
      ), this.priceRepository.getOne(
        productId,
        "buylist",
        thrityDaysAgo,
      )]);

      const oneDayMarketPricePerformance =
        oneDayOldMarketPrice?.value && todayMarketPrice?.value
          ? parseFloat(
              (
                (todayMarketPrice.value / oneDayOldMarketPrice.value - 1) *
                100
              ).toFixed(2),
            )
          : null;
      performances.push({
        productId: productId,
        value: oneDayMarketPricePerformance,
        date: today,
        periodType: "daily",
        type: "market",
      });
      const oneDayBuylistPricePerformance =
        oneDayOldBuylistPrice?.value && todayBuylistPrice?.value
          ? parseFloat(
              (
                (todayBuylistPrice.value / oneDayOldBuylistPrice.value - 1) *
                100
              ).toFixed(2),
            )
          : null;
      performances.push({
        productId: productId,
        value: oneDayBuylistPricePerformance,
        date: today,
        periodType: "daily",
        type: "buylist",
      });

      const oneWeekMarketPricePerformance =
        oneWeekOldMarketPrice?.value && todayMarketPrice?.value
          ? parseFloat(
              (
                (todayMarketPrice.value / oneWeekOldMarketPrice.value - 1) *
                100
              ).toFixed(2),
            )
          : null;
      performances.push({
        productId: productId,
        value: oneWeekMarketPricePerformance,
        date: today,
        periodType: "weekly",
        type: "market",
      });
      const oneWeekBuylistPricePerformance =
        oneWeekOldBuylistPrice?.value && todayBuylistPrice?.value
          ? parseFloat(
              (
                (todayBuylistPrice.value / oneWeekOldBuylistPrice.value - 1) *
                100
              ).toFixed(2),
            )
          : null;
      performances.push({
        productId: productId,
        value: oneWeekBuylistPricePerformance,
        date: today,
        periodType: "weekly",
        type: "buylist",
      });

      const oneMonthMarketPricePerformance =
        oneMonthOldMarketPrice?.value && todayMarketPrice?.value
          ? parseFloat(
              (
                (todayMarketPrice.value / oneMonthOldMarketPrice.value - 1) *
                100
              ).toFixed(2),
            )
          : null;
      performances.push({
        productId: productId,
        value: oneMonthMarketPricePerformance,
        date: today,
        periodType: "monthly",
        type: "market",
      });
      const oneMonthBuylistPricePerformance =
        oneMonthOldBuylistPrice?.value && todayBuylistPrice?.value
          ? parseFloat(
              (
                (todayBuylistPrice.value / oneMonthOldBuylistPrice.value -
                  1) *
                100
              ).toFixed(2),
            )
          : null;
      performances.push({
        productId: productId,
        value: oneMonthBuylistPricePerformance,
        date: today,
        periodType: "monthly",
        type: "buylist",
      });

      for (const performance of performances) {
        promises.push(this.performanceRepository.upsertPerformance(
          productId,
          performance.value,
          today,
          performance.periodType,
          performance.type
        ));
      }
    }
    await Promise.all(promises);
  }
}
