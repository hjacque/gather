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

  abstract getPerformance(
    cardId: string,
    date: Date,
    periodType: PerformancePeriodType,
    type: PerformanceType
  ): Promise<PerformanceEntity>;
}
