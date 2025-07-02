import { PerformanceEntity } from "../../../entities/performance.entity";
import { PerformanceModel } from "../models/performance.model.mongo";

export class PerformanceMapper {
  toEntity({
    _id,
    productId,
    date,
    value,
    type,
    periodType,
  }: PerformanceModel): PerformanceEntity {
    return {
      id: _id.toString(),
      productId: productId.toString(),
      date,
      value,
      periodType,
      type,
    };
  }
}
