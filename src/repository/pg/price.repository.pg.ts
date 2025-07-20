import { PriceRepositoryPort } from "../ports/price.repository.port";
import { PriceMapper } from "./mappers/price.mapper.pg";
import { PriceType } from "../../types/priceType";
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
    date: Date,
  ): Promise<void> {
    const existingPrice = await this.prisma.price.findUnique({
        where: {
            productId_date_type: {
                productId,
                type,
                date,
            }
        }
    });
    if (existingPrice) {
      await this.prisma.price.update({
        where: {
            productId_date_type: {
                productId,
                type,
                date,
            }
        },
        data: {
            value: value ?? null,
            type,
            date,
            updatedAt: new Date()
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
      }
    });
  }

  async getProductPrices(productId: string) {
    const marketPrices = await this.prisma.price
      .findMany({
        where: {
            productId,
            type: "market",
        },
        orderBy: {
            date: "asc"
        }
      });
    const buylistPrices = await this.prisma.price
      .findMany({
        where: {
            productId,
            type: "buylist",
        },
        orderBy: {
            date: "asc"
        }
      });
    const ratioPrices = await this.prisma.price
      .findMany({
        where: {
            productId,
            type: "ratio",
        },
        orderBy: {
            date: "asc"
        }
      });
    const cardmarketListingCount = await this.prisma.price.findMany({
      where: {
          productId,
          type: "cardmarketListingCount",
      },
      orderBy: {
          date: "asc"
      }
    })
    const fullSetPrices = await this.prisma.price.findMany({
      where: {
          productId,
          type: "fullSet",
      },
      orderBy: {
          date: "asc"
      }
    });
    const tcgpPrices = await this.prisma.price.findMany({
      where: {
          productId,
          type: "tcgp",
      },
      orderBy: {
          date: "asc"
      }
    });

    return {
      marketPrices: marketPrices.map((p) => this.priceMapper.toEntity(p)),
      buylistPrices: buylistPrices.map((p) => this.priceMapper.toEntity(p)),
      ratioPrices: ratioPrices.map((p) => this.priceMapper.toEntity(p)),
      cardmarketListingCount: cardmarketListingCount.map((p) => this.priceMapper.toEntity(p)),
      fullSetPrices: fullSetPrices.map((p) => this.priceMapper.toEntity(p)),
      tcgpPrices: tcgpPrices.map((p) => this.priceMapper.toEntity(p)),
    };
  }

  async getProductsPricesByDate(productIds: string[], date: Date) {
    const prices = await this.prisma.price
      .findMany({
        where: {
            productId: { in: productIds },
            date,
            type: { in: ["market", "buylist", "ratio", "perBooster", "cardmarketListingCount", "fullSet", "tcgp"] },
        }
      });

    type ResKey =
      | "market"
      | "buylist"
      | "ratio"
      | "perBooster"
      | "cardmarketListingCount"
      | "fullSet"
      | "tcgp";
    const result: Map<string, Record<ResKey, number | null>> = new Map();

    for (const productId of productIds) {
      result.set(productId, {
        market: null,
        buylist: null,
        ratio: null,
        perBooster: null,
        cardmarketListingCount: null,
        fullSet: null,
        tcgp: null,
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
            }
        }
    });

    return price ? this.priceMapper.toEntity(price) : null;
  }
}
