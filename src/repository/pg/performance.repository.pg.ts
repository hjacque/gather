import { PerformanceModel } from "./models/performance.model.pg";
import { PerformanceRepositoryPort } from "../ports/performance.repository.port";
import { PerformanceMapper } from "./mappers/performance.mapper.pg";
import { Franchise, ProductType } from "entities/product.entity";
import { PerformanceType } from "../../types/performanceType";
import { PerformancePeriod } from "../../types/performancePeriod";
import { PrismaClient } from "@prisma/client";

export class PerformanceRepositoryPg implements PerformanceRepositoryPort {
  private performanceMapper: PerformanceMapper;

  constructor(
    private readonly prisma: PrismaClient
  ) {
    this.performanceMapper = new PerformanceMapper();
  }

  async upsertPerformance(
    productId: string,
    value: number | null,
    date: Date,
    periodType: PerformancePeriod,
    type: PerformanceType,
  ): Promise<void> {
    const existingPerformance = await this.prisma.performance.findUnique({
        where: {
            productId_date_periodType_type: {
                productId,
                type,
                date,
                periodType,
            }
        }
    });
    if (existingPerformance) {
      await this.prisma.performance.update({
        where: {
            productId_date_periodType_type: {
                productId,
                type,
                date,
                periodType,
            }
        },
        data: {
            value,
            updatedAt: new Date()
        }
      });
      return;
    }
    await this.prisma.performance.create({
        data: {
            productId,
            value,
            type,
            date,
            periodType,
        }
    });
  }

  async getTopPerformance(
    date: Date,
    franchise: Franchise,
    productType: ProductType,
  ) {
    const topPerformance = (
      await this.prisma.performance
        .findFirstOrThrow({
            where: {
                date,
                type: { in: ["market", "buylist"] },
                value: { gt: 0 },
            },
            orderBy: {
                value: "desc"
            },
            take: 1
        }));

    // const res = this.productCollection.aggregate([
    //   {
    //     $match: {
    //       type: productType,
    //       franchise,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "performances",
    //       localField: "_id",
    //       foreignField: "productId",
    //       as: "performances",
    //     },
    //   },
    //   { $unwind: "$performances" },
    //   {
    //     $match: {
    //       "performances.value": { $gt: 0 },
    //       date,
    //       type: { $in : [ PerformanceType.market, PerformanceType.buylist ]},
    //     },
    //   },
    //   {
    //     $sort: { "performances.value": -1 },
    //   },
    //   { $limit: 1 },
    //   {
    //     $project: {
    //       _id: 0,
    //       bestPerformanceValue: "$performances",
    //     },
    //   },
    // ]);

    // console.debug(res, await res.toArray(), (await res.toArray())[0]);

    // if (!topPerformance) {
    //   throw new RessourceNotFoundError();
    // }

    return this.performanceMapper.toEntity(topPerformance);
  }

  async getPerformances(productIds: string[], date: Date) {
    const performances = await this.prisma.performance
      .findMany({
        where: {
            productId: { in: productIds },
            date,
        }
      });

    type Period =
      | "oneDayMarketPricePerformance"
      | "oneDayBuylistPricePerformance"
      | "oneWeekMarketPricePerformance"
      | "oneWeekBuylistPricePerformance"
      | "oneMonthMarketPricePerformance"
      | "oneMonthBuylistPricePerformance";
    const result: Map<string, Record<Period, number | null>> = new Map();

    function getPerformanceKey(perf: PerformanceModel): string | null {
      const { periodType, type } = perf;
      if (type === "market" && periodType === "daily")
        return "oneDayMarketPricePerformance";
      if (type === "buylist" && periodType === "daily")
        return "oneDayBuylistPricePerformance";
      if (type === "market" && periodType === "weekly")
        return "oneWeekMarketPricePerformance";
      if (type === "buylist" && periodType === "weekly")
        return "oneWeekBuylistPricePerformance";
      if (type === "market" && periodType === "monthly")
        return "oneMonthMarketPricePerformance";
      if (type === "buylist" && periodType === "monthly")
        return "oneMonthBuylistPricePerformance";
      return null;
    }

    for (const productId of productIds) {
      result.set(productId, {
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
      if (key) {
        result.set(perf.productId.toString(), {
          ...(result.get(perf.productId.toString()) || {}),
          [key as Period]: perf.value,
        } as Record<Period, number | null>);
      }
    }

    return result;
  }
}
