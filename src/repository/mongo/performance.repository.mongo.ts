import { BSON, Collection, WithId } from "mongodb";
import { PerformanceModel } from "./models/performance.model.mongo";
import { PerformanceRepositoryPort } from "../ports/performance.repository.port";
import {
  PerformanceEntity,
  PerformancePeriodType,
  PerformanceType,
} from "../../entities/performance.entity";
import { PerformanceMapper } from "./mappers/performance.mapper.mongo";

export class PerformanceRepositoryMongo implements PerformanceRepositoryPort {
  private performanceMapper: PerformanceMapper;

  constructor(
    private readonly performanceCollection: Collection<PerformanceModel>
  ) {
    this.performanceMapper = new PerformanceMapper();
  }

  async upsertPerformance(
    cardId: string,
    value: number | null,
    date: Date,
    periodType: PerformancePeriodType,
    type: PerformanceType
  ): Promise<void> {
    const existingPrice = await this.performanceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      type,
      date,
      periodType,
    });
    if (existingPrice) {
      await this.performanceCollection.updateOne(
        { cardId: new BSON.ObjectId(cardId), type, date, periodType },
        {
          $set: {
            cardId: new BSON.ObjectId(cardId),
            value,
          },
        }
      );
      return;
    }
    await this.performanceCollection.insertOne({
      _id: new BSON.ObjectId(),
      cardId: new BSON.ObjectId(cardId),
      value,
      type,
      date,
      periodType,
    });
  }

  async getTopPerformance(date: Date): Promise<PerformanceEntity> {
    const topPerformance = (
      await this.performanceCollection
        .find(
          {
            date,
            type: PerformanceType.market,
            value: { $gt: 0 },
          },
          {
            sort: { value: -1 },
            limit: 10,
          }
        )
        .toArray()
    )[0];

    return this.performanceMapper.toEntity(topPerformance);
  }

  async getPerformances(
    cardIds: string[],
    date: Date
  ) {
    const performances = await this.performanceCollection.find({
      cardId: { $in: cardIds.map((id) => new BSON.ObjectId(id)) },
      date,
    }).toArray();

    type Period = "oneDayMarketPricePerformance" | "oneDayBuylistPricePerformance" | "oneWeekMarketPricePerformance" | "oneWeekBuylistPricePerformance" | "oneMonthMarketPricePerformance" | "oneMonthBuylistPricePerformance";
    const result: Map<string, Record<Period, number | null>> = new Map();

    function getPerformanceKey(perf: WithId<PerformanceModel>): string | null {
      const { periodType, type } = perf;
      if (type === "market" && periodType === "daily") return "oneDayMarketPricePerformance";
      if (type === "buylist" && periodType === "daily") return "oneDayBuylistPricePerformance";
      if (type === "market" && periodType === "weekly") return "oneWeekMarketPricePerformance";
      if (type === "buylist" && periodType === "weekly") return "oneWeekBuylistPricePerformance";
      if (type === "market" && periodType === "monthly") return "oneMonthMarketPricePerformance";
      if (type === "buylist" && periodType === "monthly") return "oneMonthBuylistPricePerformance";
      return null;
    }

    for (const cardId of cardIds) {
      result.set(cardId, {
        oneDayMarketPricePerformance: null,
        oneDayBuylistPricePerformance: null,
        oneWeekMarketPricePerformance: null,
        oneWeekBuylistPricePerformance: null,
        oneMonthMarketPricePerformance: null,
        oneMonthBuylistPricePerformance: null,
      });
    }
    for (const perf of performances) {
      const key = getPerformanceKey(perf);
      if (key) result.set(perf.cardId.toString(), {
        ...(result.get(perf.cardId.toString()) || {}),
        [key as Period]: perf.value,
      } as Record<Period, number | null>);
    }

    return result;
  }
}
