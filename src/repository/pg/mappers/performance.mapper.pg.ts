import { NewPerformanceEntity } from "entities/performance.entity";
import { NewProductEntity, ProductEntity } from "../../../entities/product.entity";
import { ProductModel } from "../models/product.model.pg";
import { PerformanceModel } from "../models/performance.model.pg";

export class PerformanceMapper {
  toEntity({
    id,
    type,
    productId,
    date,
    value,
    periodType,
    createdAt,
    updatedAt
  }: PerformanceModel): NewPerformanceEntity {
    return {
      id,
      type,
      productId,
      date,
      value,
      periodType,
      createdAt,
      updatedAt
    };
  }
}
