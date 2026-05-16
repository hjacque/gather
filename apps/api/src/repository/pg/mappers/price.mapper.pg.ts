import { NewPriceEntity } from "../../../entities/price.entity";
import { PriceModel } from "../models/price.model.pg";

export class PriceMapper {
  toEntity({
    id,
    productId,
    date,
    value,
    type,
    createdAt,
    updatedAt,
  }: PriceModel): NewPriceEntity {
    return {
      id,
      productId,
      date,
      value,
      type,
      createdAt,
      updatedAt,
    };
  }
}
