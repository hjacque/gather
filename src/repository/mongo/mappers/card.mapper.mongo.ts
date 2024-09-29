import { CardEntity } from "../../../entities/card.entity";
import { CardModel } from "../models/card.model.mongo";

export class CardMapper {
  toEntity({
    _id,
    number,
    name,
    set,
    rarity,
    cardMarketLink,
    priceChartingLink,
    cardkingdomBuyListLink,
    abugamesBuyListLink,
    starcitygamesBuyListLink,
  }: CardModel): CardEntity {
    return {
      id: _id.toString(),
      number,
      name,
      set,
      rarity,
      cardMarketLink,
      priceChartingLink,
      cardkingdomBuyListLink,
      abugamesBuyListLink,
      starcitygamesBuyListLink,
    };
  }
}
