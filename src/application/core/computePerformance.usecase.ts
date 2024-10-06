import puppeteer, { Browser } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PriceType } from "../../entities/price.entity";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";
import {
  PerformanceEntity,
  PerformancePeriodType,
  PerformanceType,
} from "../../entities/performance.entity";
import { Set } from "../../entities/card.entity";

type ComputePerformancesInputDto = {
  set?: Set;
};

export class ComputePerformancesUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort
  ) {}

  async execute({ set: setInput }: ComputePerformancesInputDto) {
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

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        for (const card of cards) {
          console.log("--------------");
          console.log(card.name);

          const performances: Omit<PerformanceEntity, "id">[] = [];

          const todayMarketPrice = await this.priceRepository.getOne(
            card.id,
            PriceType.market,
            today
          );
          const todayBuylistPrice = await this.priceRepository.getOne(
            card.id,
            PriceType.buylist,
            today
          );

          const oneDayAgo = new Date(today);
          oneDayAgo.setUTCDate(today.getUTCDate() - 1);
          const oneDayOldMarketPrice = await this.priceRepository.getOne(
            card.id,
            PriceType.market,
            oneDayAgo
          );
          const oneDayOldBuylistPrice = await this.priceRepository.getOne(
            card.id,
            PriceType.buylist,
            oneDayAgo
          );

          const oneWeekAgo = new Date(today);
          oneWeekAgo.setUTCDate(today.getUTCDate() - 7);
          const oneWeekOldMarketPrice = await this.priceRepository.getOne(
            card.id,
            PriceType.market,
            oneWeekAgo
          );
          const oneWeekOldBuylistPrice = await this.priceRepository.getOne(
            card.id,
            PriceType.buylist,
            oneWeekAgo
          );

          const oneMonthAgo = new Date(today);
          oneMonthAgo.setUTCMonth(today.getUTCMonth() - 1);
          const oneMonthOldMarketPrice = await this.priceRepository.getOne(
            card.id,
            PriceType.market,
            oneMonthAgo
          );
          const oneMonthOldBuylistPrice = await this.priceRepository.getOne(
            card.id,
            PriceType.buylist,
            oneMonthAgo
          );

          const oneDayMarketPricePerformance =
            oneDayOldMarketPrice?.value && todayMarketPrice?.value
              ? Math.round(
                  (todayMarketPrice.value / oneDayOldMarketPrice.value - 1) *
                    100
                )
              : null;
          performances.push({
            cardId: card.id,
            value: oneDayMarketPricePerformance,
            date: today,
            periodType: PerformancePeriodType.daily,
            type: PerformanceType.market,
          });
          const oneDayBuylistPricePerformance =
            oneDayOldBuylistPrice?.value && todayBuylistPrice?.value
              ? Math.round(
                  (todayBuylistPrice.value / oneDayOldBuylistPrice.value - 1) *
                    100
                )
              : null;
          performances.push({
            cardId: card.id,
            value: oneDayBuylistPricePerformance,
            date: today,
            periodType: PerformancePeriodType.daily,
            type: PerformanceType.buylist,
          });

          const oneWeekMarketPricePerformance =
            oneWeekOldMarketPrice?.value && todayMarketPrice?.value
              ? Math.round(
                  (todayMarketPrice.value / oneWeekOldMarketPrice.value - 1) *
                    100
                )
              : null;
          performances.push({
            cardId: card.id,
            value: oneWeekMarketPricePerformance,
            date: today,
            periodType: PerformancePeriodType.weekly,
            type: PerformanceType.market,
          });
          const oneWeekBuylistPricePerformance =
            oneWeekOldBuylistPrice?.value && todayBuylistPrice?.value
              ? Math.round(
                  (todayBuylistPrice.value / oneWeekOldBuylistPrice.value - 1) *
                    100
                )
              : null;
          performances.push({
            cardId: card.id,
            value: oneWeekBuylistPricePerformance,
            date: today,
            periodType: PerformancePeriodType.weekly,
            type: PerformanceType.buylist,
          });

          const oneMonthMarketPricePerformance =
            oneMonthOldMarketPrice?.value && todayMarketPrice?.value
              ? Math.round(
                  (todayMarketPrice.value / oneMonthOldMarketPrice.value - 1) *
                    100
                )
              : null;
          performances.push({
            cardId: card.id,
            value: oneMonthMarketPricePerformance,
            date: today,
            periodType: PerformancePeriodType.monthly,
            type: PerformanceType.market,
          });
          const oneMonthBuylistPricePerformance =
            oneMonthOldBuylistPrice?.value && todayBuylistPrice?.value
              ? Math.round(
                  (todayBuylistPrice.value / oneMonthOldBuylistPrice.value -
                    1) *
                    100
                )
              : null;
          performances.push({
            cardId: card.id,
            value: oneMonthBuylistPricePerformance,
            date: today,
            periodType: PerformancePeriodType.monthly,
            type: PerformanceType.buylist,
          });

          console.log(
            "performances",
            performances.map((p) => [p.periodType, p.type, p.value])
          );
          for (const performance of performances) {
            await this.performanceRepository.upsertPerformance(
              card.id,
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
}
