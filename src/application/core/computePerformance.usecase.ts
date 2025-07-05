import puppeteer, { Browser } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PriceType } from "../../entities/price.entity";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";
import {
  PerformanceEntity,
  PerformancePeriodType,
  PerformanceType,
} from "../../entities/performance.entity";
import { Franchise, ProductType, Set } from "../../entities/product.entity";

type ComputePerformancesInputDto = {
  set?: Set;
  franchise?: Franchise,
  type?: ProductType
};

export class ComputePerformancesUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort
  ) {}

  async execute({ set, franchise, type }: ComputePerformancesInputDto) {
    console.log("start");

    puppeteerExtra.use(Stealth());

    let i = 0;
    while (true) {
      const take = 20;
      const products = await this.productRepository.getProducts({ set, franchise, type }, { take, page: i });
      if (!products?.length) {
        console.log("No products found");
        i = 0;
        break;
      }
      i += take;

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      for (const product of products) {
        console.log("--------------");
        console.log(product.name, product.set);

        const performances: Omit<PerformanceEntity, "id">[] = [];

        const todayMarketPrice = await this.priceRepository.getOne(
          product.id,
          PriceType.market,
          today
        );
        const todayBuylistPrice = await this.priceRepository.getOne(
          product.id,
          PriceType.buylist,
          today
        );

        const oneDayAgo = new Date(today);
        oneDayAgo.setUTCDate(today.getUTCDate() - 1);
        const oneDayOldMarketPrice = await this.priceRepository.getOne(
          product.id,
          PriceType.market,
          oneDayAgo
        );
        const oneDayOldBuylistPrice = await this.priceRepository.getOne(
          product.id,
          PriceType.buylist,
          oneDayAgo
        );

        const oneWeekAgo = new Date(today);
        oneWeekAgo.setUTCDate(today.getUTCDate() - 7);
        const oneWeekOldMarketPrice = await this.priceRepository.getOne(
          product.id,
          PriceType.market,
          oneWeekAgo
        );
        const oneWeekOldBuylistPrice = await this.priceRepository.getOne(
          product.id,
          PriceType.buylist,
          oneWeekAgo
        );

        const thrityDaysAgo = new Date(today);
        thrityDaysAgo.setUTCMonth(today.getUTCDate() - 30);
        const oneMonthOldMarketPrice = await this.priceRepository.getOne(
          product.id,
          PriceType.market,
          thrityDaysAgo
        );
        const oneMonthOldBuylistPrice = await this.priceRepository.getOne(
          product.id,
          PriceType.buylist,
          thrityDaysAgo
        );

        const oneDayMarketPricePerformance =
          oneDayOldMarketPrice?.value && todayMarketPrice?.value
            ? parseFloat(
                ((todayMarketPrice.value / oneDayOldMarketPrice.value - 1) *
                  100).toFixed(2)
              )
            : null;
        performances.push({
          productId: product.id,
          value: oneDayMarketPricePerformance,
          date: today,
          periodType: PerformancePeriodType.daily,
          type: PerformanceType.market,
        });
        const oneDayBuylistPricePerformance =
          oneDayOldBuylistPrice?.value && todayBuylistPrice?.value
            ? parseFloat(
                ((todayBuylistPrice.value / oneDayOldBuylistPrice.value - 1) *
                  100).toFixed(2)
              )
            : null;
        performances.push({
          productId: product.id,
          value: oneDayBuylistPricePerformance,
          date: today,
          periodType: PerformancePeriodType.daily,
          type: PerformanceType.buylist,
        });

        const oneWeekMarketPricePerformance =
          oneWeekOldMarketPrice?.value && todayMarketPrice?.value
            ? parseFloat(
                ((todayMarketPrice.value / oneWeekOldMarketPrice.value - 1) *
                  100).toFixed(2)
              )
            : null;
        performances.push({
          productId: product.id,
          value: oneWeekMarketPricePerformance,
          date: today,
          periodType: PerformancePeriodType.weekly,
          type: PerformanceType.market,
        });
        const oneWeekBuylistPricePerformance =
          oneWeekOldBuylistPrice?.value && todayBuylistPrice?.value
            ? parseFloat(
                ((todayBuylistPrice.value / oneWeekOldBuylistPrice.value - 1) *
                  100).toFixed(2)
              )
            : null;
        performances.push({
          productId: product.id,
          value: oneWeekBuylistPricePerformance,
          date: today,
          periodType: PerformancePeriodType.weekly,
          type: PerformanceType.buylist,
        });

        const oneMonthMarketPricePerformance =
          oneMonthOldMarketPrice?.value && todayMarketPrice?.value
            ? parseFloat(
                ((todayMarketPrice.value / oneMonthOldMarketPrice.value - 1) *
                  100).toFixed(2)
              )
            : null;
        performances.push({
          productId: product.id,
          value: oneMonthMarketPricePerformance,
          date: today,
          periodType: PerformancePeriodType.monthly,
          type: PerformanceType.market,
        });
        const oneMonthBuylistPricePerformance =
          oneMonthOldBuylistPrice?.value && todayBuylistPrice?.value
            ? parseFloat(
                ((todayBuylistPrice.value / oneMonthOldBuylistPrice.value - 1) *
                  100).toFixed(2)
              )
            : null;
        performances.push({
          productId: product.id,
          value: oneMonthBuylistPricePerformance,
          date: today,
          periodType: PerformancePeriodType.monthly,
          type: PerformanceType.buylist,
        });

        for (const performance of performances) {
          await this.performanceRepository.upsertPerformance(
            product.id,
            performance.value,
            today,
            PerformancePeriodType[performance.periodType],
            PerformanceType[performance.type]
          );
        }
      }
    }
  }
}
