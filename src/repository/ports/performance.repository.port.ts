import {
  PerformanceEntity,
  PerformancePeriodType,
  PerformanceType,
} from "../../entities/performance.entity";

export abstract class PerformanceRepositoryPort {
  abstract upsertPerformance(
    cardId: string,
    value: number | null,
    date: Date,
    periodType: PerformancePeriodType,
    type: PerformanceType
  ): Promise<void>;

  abstract getTopPerformance(date: Date): Promise<PerformanceEntity | null>;

  abstract getPerformances(
    cardIds: string[],
    date: Date
  ): Promise<Map<string, {
    oneDayMarketPricePerformance: number | null,
      oneDayBuylistPricePerformance: number | null,
      oneWeekMarketPricePerformance: number | null,
      oneWeekBuylistPricePerformance: number | null,
      oneMonthMarketPricePerformance: number  | null,
      oneMonthBuylistPricePerformance: number | null,
  }>>;
}