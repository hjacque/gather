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
      priceChartingPrice: number | undefined;
      cardMarketPrice: number | undefined;
      ckBuyListPrice: number | undefined;
      abugamesBuyListPrice: number | undefined;
      starcitygamesBuyListPrice: number | undefined;
      marketPrice: number | undefined;
      buylistPrice: number | undefined;
      estimatedValue: number | undefined;
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
          starcitygamesBuyListPrice: prices.starcitygamesBuyListPrice,
          marketPrice: prices.marketPrice,
          buylistPrice: prices.buylistPrice,
          estimatedValue: prices.estimatedValue,
        },
      }
    );
  }

  async getCards(): Promise<CardEntity[]> {
    const cards = await this.cardCollection.find().toArray();
    return cards.map((card) => this.cardMapper.toEntity(card));
  }
}
