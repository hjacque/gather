import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PriceType } from "../../entities/price.entity";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";
import {
  PerformanceEntity,
  PerformancePeriodType,
  PerformanceType,
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
        PriceType.market,
        today,
      ), this.priceRepository.getOne(
        productId,
        PriceType.buylist,
        today,
      )]);

      const oneDayAgo = new Date(today);
      oneDayAgo.setUTCDate(today.getUTCDate() - 1);
      const [oneDayOldMarketPrice, oneDayOldBuylistPrice] = await Promise.all([this.priceRepository.getOne(
        productId,
        PriceType.market,
        oneDayAgo,
      ), this.priceRepository.getOne(
        productId,
        PriceType.buylist,
        oneDayAgo,
      )]);

      const oneWeekAgo = new Date(today);
      oneWeekAgo.setUTCDate(today.getUTCDate() - 7);
      const [oneWeekOldMarketPrice, oneWeekOldBuylistPrice] = await Promise.all([this.priceRepository.getOne(
        productId,
        PriceType.market,
        oneWeekAgo,
      ), this.priceRepository.getOne(
        productId,
        PriceType.buylist,
        oneWeekAgo,
      )]);

      const thrityDaysAgo = new Date(today);
      thrityDaysAgo.setUTCDate(today.getUTCDate() - 30);
      const [oneMonthOldMarketPrice, oneMonthOldBuylistPrice] = await Promise.all([this.priceRepository.getOne(
        productId,
        PriceType.market,
        thrityDaysAgo,
      ), this.priceRepository.getOne(
        productId,
        PriceType.buylist,
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
        periodType: PerformancePeriodType.daily,
        type: PerformanceType.market,
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
        periodType: PerformancePeriodType.daily,
        type: PerformanceType.buylist,
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
        periodType: PerformancePeriodType.weekly,
        type: PerformanceType.market,
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
        periodType: PerformancePeriodType.weekly,
        type: PerformanceType.buylist,
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
        periodType: PerformancePeriodType.monthly,
        type: PerformanceType.market,
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
        periodType: PerformancePeriodType.monthly,
        type: PerformanceType.buylist,
      });

      for (const performance of performances) {
        promises.push(this.performanceRepository.upsertPerformance(
          productId,
          performance.value,
          today,
          PerformancePeriodType[performance.periodType],
          PerformanceType[performance.type],
        ));
      }
    }
    await Promise.all(promises);
  }
}
