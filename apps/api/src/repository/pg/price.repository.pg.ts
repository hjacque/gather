import { PriceRepositoryPort } from "../ports/price.repository.port";
import { PriceMapper } from "./mappers/price.mapper.pg";
import { PriceType } from "@gather/types";
import { PrismaClient } from "@prisma/client";

export class PriceRepositoryPg implements PriceRepositoryPort {
  private priceMapper: PriceMapper;

  constructor(private readonly prisma: PrismaClient) {
    this.priceMapper = new PriceMapper();
  }

  async upsertPrice(
    productId: string,
    value: number | undefined,
    type: PriceType,
    date: Date
  ): Promise<void> {
    const existingPrice = await this.prisma.price.findUnique({
      where: {
        productId_date_type: {
          productId,
          type,
          date,
        },
      },
    });
    if (existingPrice) {
      await this.prisma.price.update({
        where: {
          productId_date_type: {
            productId,
            type,
            date,
          },
        },
        data: {
          value: value ?? null,
          type,
          date,
          updatedAt: new Date(),
        },
      });
      return;
    }
    await this.prisma.price.create({
      data: {
        productId,
        value,
        type,
        date,
      },
    });
  }

  async getProductPrices(productId: string) {
    const psaGradePrices = await this.prisma.price.findMany({
      where: {
        productId,
        type: {
          in: [
            "cardmarketPsa1",
            "cardmarketPsa2",
            "cardmarketPsa3",
            "cardmarketPsa4",
            "cardmarketPsa5",
            "cardmarketPsa6",
            "cardmarketPsa7",
            "cardmarketPsa8",
            "cardmarketPsa9",
            "cardmarketPsa10",
          ],
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return {
      psaGradePrices: psaGradePrices.map((p) => this.priceMapper.toEntity(p)),
    };
  }

  async getProductsPricesByDate(productIds: string[], date: Date) {
    const prices = await this.prisma.price.findMany({
      where: {
        productId: { in: productIds },
        date,
        type: {
          in: [
            "cardmarketPsa9",
            "cardmarketPsa10",
          ],
        },
      },
    });

    type ResKey =
      | "cardmarketPsa9"
      | "cardmarketPsa10";
    const result: Map<string, Record<ResKey, number | null>> = new Map();

    for (const productId of productIds) {
      result.set(productId, {
        cardmarketPsa9: null,
        cardmarketPsa10: null,
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
    const price = await this.prisma.price.findUnique({
      where: {
        productId_date_type: {
          productId,
          date,
          type,
        },
      },
    });

    return price ? this.priceMapper.toEntity(price) : null;
  }
}
