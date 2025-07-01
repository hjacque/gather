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
      const [marketPrice, buylistPrice, ratioPrice, performance] = await Promise.all([
        this.priceRepository.getCardPrice(
          card.id,
          PriceType.market,
          today
        ),
        this.priceRepository.getCardPrice(
          card.id,
          PriceType.buylist,
          today
        ),
        this.priceRepository.getCardPrice(
          card.id,
          PriceType.ratio,
          today
        ),
        this.getPerformances(
          card.id,
          today
        ),
      ]);
      card.market = marketPrice?.value || null;
      card.buylist = buylistPrice?.value || null;
      card.ratio = ratioPrice?.value || null;
      card.performance = performance || null;
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
    ] = await Promise.all([
      this.performanceRepository.getPerformance(
        cardId,
        today,
        PerformancePeriodType.daily,
        PerformanceType.market
      ),
      this.performanceRepository.getPerformance(
        cardId,
        today,
        PerformancePeriodType.daily,
        PerformanceType.buylist
      ),
      this.performanceRepository.getPerformance(
        cardId,
        today,
        PerformancePeriodType.weekly,
        PerformanceType.market
      ),
      this.performanceRepository.getPerformance(
        cardId,
        today,
        PerformancePeriodType.weekly,
        PerformanceType.buylist
      ),
      this.performanceRepository.getPerformance(
        cardId,
        today,
        PerformancePeriodType.monthly,
        PerformanceType.market
      ),
      this.performanceRepository.getPerformance(
        cardId,
        today,
        PerformancePeriodType.monthly,
        PerformanceType.buylist
      ),
    ]);
    return {
      oneDayMarketPricePerformance: oneDayMarketPricePerformance.value,
      oneDayBuylistPricePerformance: oneDayBuylistPricePerformance.value,
      oneWeekMarketPricePerformance: oneWeekMarketPricePerformance.value,
      oneWeekBuylistPricePerformance: oneWeekBuylistPricePerformance.value,
      oneMonthMarketPricePerformance: oneMonthMarketPricePerformance.value,
      oneMonthBuylistPricePerformance: oneMonthBuylistPricePerformance.value,
    };
  }
}
