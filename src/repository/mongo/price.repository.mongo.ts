import { BSON, Collection } from "mongodb";
import { PriceModel } from "./models/price.model.mongo";
import { PriceRepositoryPort } from "../ports/price.repository.port";
import { PriceMapper } from "./mappers/price.mapper.mongo";
import { PriceType } from "../../entities/price.entity";
import { CARDMARKET_FEE } from "../../constants";

export class PriceRepositoryMongo implements PriceRepositoryPort {
  private priceMapper: PriceMapper;

  constructor(private readonly priceCollection: Collection<PriceModel>) {
    this.priceMapper = new PriceMapper();
  }

  async upsertPrice(
    cardId: string,
    value: number,
    type: PriceType,
    date: Date
  ): Promise<void> {
    const existingPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type,
      date,
    });
    if (existingPrice) {
      await this.priceCollection.updateOne(
        { cardId: new BSON.ObjectId(cardId), type, date },
        {
          $set: {
            cardId: new BSON.ObjectId(cardId),
            value,
            type,
            date,
          },
        }
      );
      return;
    }
    await this.priceCollection.insertOne({
      _id: new BSON.ObjectId(),
      cardId: new BSON.ObjectId(cardId),
      value,
      type,
      date,
    });
  }

  async getBestRatioCards(startDate: Date, endDate: Date): Promise<any> {
    const ratio = await this.priceCollection
      .aggregate([
        {
          $match: {
            value: { $ne: null },
            type: "ratio",
            date: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $lookup: {
            from: "cards",
            localField: "cardId",
            foreignField: "_id",
            as: "cardDetails",
          },
        },
        {
          $unwind: "$cardDetails", // Unwind the joined array to get object fields
        },
        {
          $sort: { value: 1 },
        },
        // {
        //   $limit: 10,
        // },
        {
          $project: {
            _id: 1,
            cardId: 1,
            value: 1,
            date: 1,
            "cardDetails.name": 1,
            "cardDetails.set": 1,
            "cardDetails.cardMarketLink": 1,
          },
        },
      ])
      .toArray();

    for (const r of ratio) {
      r.marketPrice = (
        await this.priceCollection.findOne({
          cardId: r.cardId,
          type: PriceType.market,
          date: r.date,
        })
      )?.value;
      r.cardMarketPrice = (
        await this.priceCollection.findOne({
          cardId: r.cardId,
          type: "cardmarket",
          date: r.date,
        })
      )?.value;
      r.buylistPrice = (
        await this.priceCollection.findOne({
          cardId: r.cardId,
          type: PriceType.buylist,
          date: r.date,
        })
      )?.value;
    }
    return ratio;
  }

  async getCardPrices(cardId: string) {
    const marketPrices = await this.priceCollection
      .find({
        cardId: new BSON.ObjectId(cardId),
        type: PriceType.market,
      })
      .sort({ date: 1 })
      .toArray();
    const buylistPrices = await this.priceCollection
      .find({
        cardId: new BSON.ObjectId(cardId),
        type: PriceType.buylist,
      })
      .sort({ date: 1 })
      .toArray();
    const ratioPrices = await this.priceCollection
      .find({
        cardId: new BSON.ObjectId(cardId),
        type: PriceType.ratio,
      })
      .sort({ date: 1 })
      .toArray();

    return {
      marketPrices: marketPrices.map((p) => this.priceMapper.toEntity(p)),
      buylistPrices: buylistPrices.map((p) => this.priceMapper.toEntity(p)),
      ratioPrices: ratioPrices.map((p) => this.priceMapper.toEntity(p)),
    };
  }

  async getCardPrice(cardId: string, type: PriceType, date: Date) {
    const price = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type,
      date,
    });

    return price ? this.priceMapper.toEntity(price) : null;
  }

  async getOne(cardId: string, type: PriceType, date: Date) {
    const price = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type,
      date,
    });

    return price ? this.priceMapper.toEntity(price) : null;
  }
}
