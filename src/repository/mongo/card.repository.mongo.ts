import { BSON, Collection } from "mongodb";
import { CardEntity } from "../../entities/card.entity";
import { CardMapper } from "./mappers/card.mapper.mongo";
import { CardModel } from "./models/card.model.mongo";
import { CardRepositoryPort } from "../ports/card.repository.port";

export class CardRepositoryMongo implements CardRepositoryPort {
  private cardMapper: CardMapper;

  constructor(private readonly cardCollection: Collection<CardModel>) {
    this.cardMapper = new CardMapper();
  }

  async updateCardPrices(
    cardId: string,
    prices: {
      priceChartingPrice: number;
      cardMarketPrice: number;
      ckBuyListPrice: number;
      abugamesBuyListPrice: number;
      marketPrice: number;
    }
  ): Promise<void> {
    await this.cardCollection.updateOne(
      { _id: new BSON.ObjectId(cardId) },
      {
        $set: {
          priceChartingPrice: prices.priceChartingPrice,
          cardMarketPrice: prices.cardMarketPrice,
          ckBuyListPrice: prices.ckBuyListPrice,
          abugamesBuyListPrice: prices.abugamesBuyListPrice,
          marketPrice: prices.marketPrice,
        },
      }
    );
  }

  async getCards(): Promise<CardEntity[]> {
    const cards = await this.cardCollection.find().toArray();
    return cards.map((card) => this.cardMapper.toEntity(card));
  }
}
