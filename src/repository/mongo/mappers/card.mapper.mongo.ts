import { CardEntity } from "../../../entities/card.entity";
import { CardModel } from "../models/card.model.mongo";

export class CardMapper {
  toEntity({
    _id,
    number,
    name,
    set,
    rarity,
    cardMarketPrice,
    priceChartingPrice,
    ckBuyListPrice,
    abugamesBuyListPrice,
    marketPrice,
    cardMarketLink,
    priceChartingLink,
    ckBuyListLink,
    abugamesBuyListLink,
  }: CardModel): CardEntity {
    return {
      id: _id.toString(),
      number,
      name,
      set,
      rarity,
      cardMarketPrice,
      priceChartingPrice,
      ckBuyListPrice,
      abugamesBuyListPrice,
      marketPrice,
      cardMarketLink,
      priceChartingLink,
      ckBuyListLink,
      abugamesBuyListLink,
    };
  }
}
