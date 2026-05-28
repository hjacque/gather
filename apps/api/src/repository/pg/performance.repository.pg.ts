import { PerformanceModel } from "./models/performance.model.pg";
import { PerformanceRepositoryPort } from "../ports/performance.repository.port";
import { PerformanceMapper } from "./mappers/performance.mapper.pg";
import { PerformancePeriod, PerformanceType } from "@gather/types";
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
