import { BSON, Collection } from "mongodb";
import { PriceModel } from "./models/price.model.mongo";
import { PriceRepositoryPort } from "../ports/price.repository.port";
import { PriceMapper } from "./mappers/price.mapper.mongo";
import { PriceType } from "../../entities/price.entity";
import { CARDMARKET_FEE } from "../../constants";
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

  async getPerformance(
    cardId: string,
    date: Date,
    periodType: PerformancePeriodType,
    type: PerformanceType
  ): Promise<PerformanceEntity> {
    const performance = await this.performanceCollection.findOne({
      cardId: new BSON.ObjectId(cardId),
      date,
      periodType,
      type,
    });
    if (!performance) {
      throw new Error(`Performance not found. Card id : ${cardId}`);
    }
    return this.performanceMapper.toEntity(performance);
  }
}
