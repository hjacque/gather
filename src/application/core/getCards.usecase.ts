import {
  PerformancePeriodType,
  PerformanceType,
} from "../../entities/performance.entity";
import { PriceType } from "../../entities/price.entity";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";

export class GetCardsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort
  ) {}

  async execute() {
    const cards = await this.cardRepository.getCards();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const card of cards) {
      card.performance = await this.getPerformances(card.id, today);

      const [marketPrice, buylistPrice, ratioPrice] = [
        await this.priceRepository.getCardPrice(
          card.id,
          PriceType.market,
          today
        ),
        await this.priceRepository.getCardPrice(
          card.id,
          PriceType.buylist,
          today
        ),
        await this.priceRepository.getCardPrice(
          card.id,
          PriceType.ratio,
          today
        ),
      ];
      card.market = marketPrice?.value || null;
      card.buylist = buylistPrice?.value || null;
      card.ratio = ratioPrice?.value || null;
    }

    return cards;
  }

  private async getPerformances(cardId: string, today: Date) {
    const [
      oneDayMarketPricePerformance,
      oneDayBuylistPricePerformance,
      oneWeekMarketPricePerformance,
      oneWeekBuylistPricePerformance,
      oneMonthMarketPricePerformance,
      oneMonthBuylistPricePerformance,
    ] = [
      (
        await this.performanceRepository.getPerformance(
          cardId,
          today,
          PerformancePeriodType.daily,
          PerformanceType.market
        )
      ).value,
      (
        await this.performanceRepository.getPerformance(
          cardId,
          today,
          PerformancePeriodType.daily,
          PerformanceType.buylist
        )
      ).value,
      (
        await this.performanceRepository.getPerformance(
          cardId,
          today,
          PerformancePeriodType.weekly,
          PerformanceType.market
        )
      ).value,
      (
        await this.performanceRepository.getPerformance(
          cardId,
          today,
          PerformancePeriodType.weekly,
          PerformanceType.buylist
        )
      ).value,
      (
        await this.performanceRepository.getPerformance(
          cardId,
          today,
          PerformancePeriodType.monthly,
          PerformanceType.market
        )
      ).value,
      (
        await this.performanceRepository.getPerformance(
          cardId,
          today,
          PerformancePeriodType.monthly,
          PerformanceType.buylist
        )
      ).value,
    ];
    return {
      oneDayMarketPricePerformance,
      oneDayBuylistPricePerformance,
      oneWeekMarketPricePerformance,
      oneWeekBuylistPricePerformance,
      oneMonthMarketPricePerformance,
      oneMonthBuylistPricePerformance,
    };
  }
}
