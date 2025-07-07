import { BSON, Collection } from "mongodb";
import { PriceModel } from "./models/price.model.mongo";
import { PriceRepositoryPort } from "../ports/price.repository.port";
import { PriceMapper } from "./mappers/price.mapper.mongo";
import { PriceType } from "../../entities/price.entity";

export class PriceRepositoryMongo implements PriceRepositoryPort {
  private priceMapper: PriceMapper;

  constructor(private readonly priceCollection: Collection<PriceModel>) {
    this.priceMapper = new PriceMapper();
  }

  async upsertPrice(
    productId: string,
    value: number,
    type: PriceType,
    date: Date,
  ): Promise<void> {
    const existingPrice = await this.priceCollection.findOne({
      productId: new BSON.ObjectId(productId),
      type,
      date,
    });
    if (existingPrice) {
      await this.priceCollection.updateOne(
        { productId: new BSON.ObjectId(productId), type, date },
        {
          $set: {
            productId: new BSON.ObjectId(productId),
            value,
            type,
            date,
          },
        },
      );
      return;
    }
    await this.priceCollection.insertOne({
      _id: new BSON.ObjectId(),
      productId: new BSON.ObjectId(productId),
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
            localField: "productId",
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
            productId: 1,
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
          productId: r.productId,
          type: PriceType.market,
          date: r.date,
        })
      )?.value;
      r.cardMarketPrice = (
        await this.priceCollection.findOne({
          productId: r.productId,
          type: "cardmarket",
          date: r.date,
        })
      )?.value;
      r.buylistPrice = (
        await this.priceCollection.findOne({
          productId: r.productId,
          type: PriceType.buylist,
          date: r.date,
        })
      )?.value;
    }
    return ratio;
  }

  async getCardPrices(productId: string) {
    const marketPrices = await this.priceCollection
      .find({
        productId: new BSON.ObjectId(productId),
        type: PriceType.market,
      })
      .sort({ date: 1 })
      .toArray();
    const buylistPrices = await this.priceCollection
      .find({
        productId: new BSON.ObjectId(productId),
        type: PriceType.buylist,
      })
      .sort({ date: 1 })
      .toArray();
    const ratioPrices = await this.priceCollection
      .find({
        productId: new BSON.ObjectId(productId),
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

  async getProductsPricesByDate(productIds: string[], date: Date) {
    const prices = await this.priceCollection
      .find({
        productId: { $in: productIds.map((id) => new BSON.ObjectId(id)) },
        date,
        type: { $in: ["market", "buylist", "ratio", "perBooster"] },
      })
      .toArray();

    type ResKey =
      | PriceType.market
      | PriceType.buylist
      | PriceType.ratio
      | PriceType.perBooster;
    const result: Map<string, Record<ResKey, number | null>> = new Map();

    for (const productId of productIds) {
      result.set(productId, {
        market: null,
        buylist: null,
        ratio: null,
        perBooster: null,
      });
    }

    for (const price of prices) {
      result.set(price.productId.toString(), {
        ...result.get(price.productId.toString()),
        [price.type]: price.value,
      } as Record<ResKey, number | null>);
    }

    return result;
  }

  async getOne(productId: string, type: PriceType, date: Date) {
    const price = await this.priceCollection.findOne({
      productId: new BSON.ObjectId(productId),
      type,
      date,
    });

    return price ? this.priceMapper.toEntity(price) : null;
  }
}
