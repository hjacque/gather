import { PriceEntity } from "../../../entities/price.entity";
import { PriceModel } from "../models/price.model.mongo";

export class PriceMapper {
  toEntity({ _id, cardId, date, value, type }: PriceModel): PriceEntity {
    return {
      id: _id.toString(),
      cardId: cardId.toString(),
      date,
      value,
      type,
    };
  }
}
