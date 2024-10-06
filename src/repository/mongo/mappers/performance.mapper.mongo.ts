import { PerformanceEntity } from "../../../entities/performance.entity";
import { PerformanceModel } from "../models/performance.model.mongo";

export class PerformanceMapper {
  toEntity({
    _id,
    cardId,
    date,
    value,
    type,
    periodType,
  }: PerformanceModel): PerformanceEntity {
    return {
      id: _id.toString(),
      cardId: cardId.toString(),
      date,
      value,
      periodType,
      type,
    };
  }
}
