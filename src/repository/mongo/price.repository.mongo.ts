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
    // console.log("existingPrice", existingPrice, {
    //   cardId: new BSON.ObjectId(cardId),
    //   type,
    //   date,
    //   value,
    // });
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
    // console.log("upsertPrice", cardId, value, type, date);
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
          type: "market",
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
          type: "buylist",
          date: r.date,
        })
      )?.value;
      r.estimatedPrice = (
        await this.priceCollection.findOne({
          cardId: r.cardId,
          type: "estimated",
          date: r.date,
        })
      )?.value;
      r.fairPriceOnCardmarket = Math.round(
        (((
          await this.priceCollection.findOne({
            cardId: r.cardId,
            type: "estimated",
            date: r.date,
          })
        )?.value || 0) /
          (100 - CARDMARKET_FEE * 100)) *
          100
      );
    }
    return ratio;
  }
}
