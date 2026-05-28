import {
  PerformanceEntity,
} from "../../entities/performance.entity";
import { PerformancePeriod, PerformanceType } from "@gather/types";

export abstract class PerformanceRepositoryPort {
  abstract upsertPerformance(
    productId: string,
    value: number | null,
    date: Date,
    periodType: PerformancePeriod,
    type: PerformanceType,
  ): Promise<void>;

  abstract getPerformances(
    productIds: string[],
    date: Date,
  ): Promise<
    Map<
      string,
      {
        oneDayMarketPricePerformance: number | null;
        oneDayBuylistPricePerformance: number | null;
        oneWeekMarketPricePerformance: number | null;
        oneWeekBuylistPricePerformance: number | null;
        oneMonthMarketPricePerformance: number | null;
        oneMonthBuylistPricePerformance: number | null;
      }
    >
  >;
}
