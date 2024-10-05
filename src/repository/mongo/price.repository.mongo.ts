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
      r.estimatedPrice = (
        await this.priceCollection.findOne({
          cardId: r.cardId,
          type: PriceType.estimated,
          date: r.date,
        })
      )?.value;
      r.fairPriceOnCardmarket = Math.round(
        (((
          await this.priceCollection.findOne({
            cardId: r.cardId,
            type: PriceType.estimated,
            date: r.date,
          })
        )?.value || 0) /
          (100 - CARDMARKET_FEE * 100)) *
          100
      );
    }
    return ratio;
  }

  async getPerformance(cardId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayMarketPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.market,
      date: today,
    });
    const todayBuylistPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.buylist,
      date: today,
    });
    const todayEstimatedPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.estimated,
      date: today,
    });

    const oneMonthAgo = new Date(today);
    oneMonthAgo.setUTCMonth(today.getUTCMonth() - 1);
    const oneMonthOldMarketPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.market,
      date: oneMonthAgo,
    });
    const oneMonthOldBuylistPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.buylist,
      date: oneMonthAgo,
    });
    const oneMonthOldEstimatedPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.estimated,
      date: oneMonthAgo,
    });
    const oneMonthMarketPricePerformance =
      oneMonthOldMarketPrice?.value && todayMarketPrice?.value
        ? Math.round(
            (todayMarketPrice.value / oneMonthOldMarketPrice.value - 1) * 100
          )
        : null;
    const oneMonthBuylistPricePerformance =
      oneMonthOldBuylistPrice?.value && todayBuylistPrice?.value
        ? Math.round(
            (todayBuylistPrice.value / oneMonthOldBuylistPrice.value - 1) * 100
          )
        : null;
    const oneMonthEstimatedPricePerformance =
      oneMonthOldEstimatedPrice?.value && todayEstimatedPrice?.value
        ? Math.round(
            (todayEstimatedPrice.value / oneMonthOldEstimatedPrice.value - 1) *
              100
          )
        : null;

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setUTCDate(today.getUTCDate() - 7);
    const oneWeekOldMarketPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.market,
      date: oneWeekAgo,
    });
    const oneWeekOldBuylistPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.buylist,
      date: oneWeekAgo,
    });
    const oneWeekOldEstimatedPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.estimated,
      date: oneWeekAgo,
    });
    const oneWeekMarketPricePerformance =
      oneWeekOldMarketPrice?.value && todayMarketPrice?.value
        ? Math.round(
            (todayMarketPrice.value / oneWeekOldMarketPrice.value - 1) * 100
          )
        : null;
    const oneWeekBuylistPricePerformance =
      oneWeekOldBuylistPrice?.value && todayBuylistPrice?.value
        ? Math.round(
            (todayBuylistPrice.value / oneWeekOldBuylistPrice.value - 1) * 100
          )
        : null;
    const oneWeekEstimatedPricePerformance =
      oneWeekOldEstimatedPrice?.value && todayEstimatedPrice?.value
        ? Math.round(
            (todayEstimatedPrice.value / oneWeekOldEstimatedPrice.value - 1) *
              100
          )
        : null;

    const oneDayAgo = new Date(today);
    oneDayAgo.setUTCDate(today.getUTCDate() - 1);
    const oneDayOldMarketPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.market,
      date: oneDayAgo,
    });
    const oneDayOldBuylistPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.buylist,
      date: oneDayAgo,
    });
    const oneDayOldEstimatedPrice = await this.priceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type: PriceType.estimated,
      date: oneDayAgo,
    });
    const oneDayMarketPricePerformance =
      oneDayOldMarketPrice?.value && todayMarketPrice?.value
        ? Math.round(
            (todayMarketPrice.value / oneDayOldMarketPrice.value - 1) * 100
          )
        : null;
    const oneDayBuylistPricePerformance =
      oneDayOldBuylistPrice?.value && todayBuylistPrice?.value
        ? Math.round(
            (todayBuylistPrice.value / oneDayOldBuylistPrice.value - 1) * 100
          )
        : null;
    const oneDayEstimatedPricePerformance =
      oneDayOldEstimatedPrice?.value && todayEstimatedPrice?.value
        ? Math.round(
            (todayEstimatedPrice.value / oneDayOldEstimatedPrice.value - 1) *
              100
          )
        : null;

    return {
      oneMonthMarketPricePerformance,
      oneMonthBuylistPricePerformance,
      oneMonthEstimatedPricePerformance,
      oneWeekMarketPricePerformance,
      oneWeekBuylistPricePerformance,
      oneWeekEstimatedPricePerformance,
      oneDayMarketPricePerformance,
      oneDayBuylistPricePerformance,
      oneDayEstimatedPricePerformance,
    };
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
    const estimatedPrices = await this.priceCollection
      .find({
        cardId: new BSON.ObjectId(cardId),
        type: PriceType.estimated,
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
      estimatedPrices: estimatedPrices.map((p) => this.priceMapper.toEntity(p)),
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
}
