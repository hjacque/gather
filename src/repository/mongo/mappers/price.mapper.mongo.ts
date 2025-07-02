import { PriceEntity } from "../../../entities/price.entity";
import { PriceModel } from "../models/price.model.mongo";

export class PriceMapper {
  toEntity({ _id, productId, date, value, type }: PriceModel): PriceEntity {
    return {
      id: _id.toString(),
      productId: productId.toString(),
      date,
      value,
      type,
    };
  }
}
