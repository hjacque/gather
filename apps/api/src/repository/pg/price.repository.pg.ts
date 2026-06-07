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
    cardId: string,
    value: number | undefined,
    type: PriceType,
    date: Date
  ): Promise<void> {
    const existingPrice = await this.prisma.price.findUnique({
      where: {
        cardId_date_type: {
          cardId,
          type,
          date,
        },
      },
    });
    if (existingPrice) {
      await this.prisma.price.update({
        where: {
          cardId_date_type: {
            cardId,
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
        cardId,
        value,
        type,
        date,
      },
    });
  }

  async getCardPrices(cardId: string) {
    const psaGradePrices = await this.prisma.price.findMany({
      where: {
        cardId,
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

  async getCardsPricesByDate(cardIds: string[], date: Date) {
    const prices = await this.prisma.price.findMany({
      where: {
        cardId: { in: cardIds },
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

    for (const cardId of cardIds) {
      result.set(cardId, {
        cardmarketPsa9: null,
        cardmarketPsa10: null,
      });
    }

    for (const price of prices) {
      result.set(price.cardId.toString(), {
        ...result.get(price.cardId.toString()),
        [price.type]: price.value,
      } as Record<ResKey, number | null>);
    }

    return result;
  }

  async getOne(cardId: string, type: PriceType, date: Date) {
    const price = await this.prisma.price.findUnique({
      where: {
        cardId_date_type: {
          cardId,
          date,
          type,
        },
      },
    });

    return price ? this.priceMapper.toEntity(price) : null;
  }

  async getCardsListingGradePricesByDate(cardIds: string[], date: Date) {
    const listingTypes: PriceType[] = [
      "cardmarketPsa1", "cardmarketPsa2", "cardmarketPsa3", "cardmarketPsa4",
      "cardmarketPsa5", "cardmarketPsa6", "cardmarketPsa7", "cardmarketPsa8",
      "cardmarketPsa9", "cardmarketPsa10",
    ];

    const prices = await this.prisma.price.findMany({
      where: { cardId: { in: cardIds }, date, type: { in: listingTypes } },
    });

    const result = new Map<string, Record<number, number | null>>();
    for (const cardId of cardIds) {
      result.set(cardId, {1:null,2:null,3:null,4:null,5:null,6:null,7:null,8:null,9:null,10:null});
    }
    for (const price of prices) {
      const grade = parseInt(price.type.replace("cardmarketPsa", ""));
      const entry = result.get(price.cardId);
      if (entry) entry[grade] = price.value;
    }
    return result;
  }

  async getCardsMarketSaleYearRange(cardIds: string[], fromDate: Date, toDate: Date) {
    const marketTypes: PriceType[] = [
      "marketSalePsa1", "marketSalePsa2", "marketSalePsa3", "marketSalePsa4",
      "marketSalePsa5", "marketSalePsa6", "marketSalePsa7", "marketSalePsa8",
      "marketSalePsa9", "marketSalePsa10",
    ];

    const rows = await this.prisma.price.groupBy({
      by: ["cardId", "type"],
      where: {
        cardId: { in: cardIds },
        type: { in: marketTypes },
        date: { gte: fromDate, lte: toDate },
        value: { not: null },
      },
      _min: { value: true },
      _max: { value: true },
    });

    const result = new Map<string, Record<number, { min: number; max: number } | null>>();
    for (const cardId of cardIds) {
      result.set(cardId, {});
    }
    for (const row of rows) {
      const grade = parseInt(row.type.replace("marketSalePsa", ""));
      const entry = result.get(row.cardId);
      if (entry && row._min.value !== null && row._max.value !== null) {
        entry[grade] = { min: row._min.value, max: row._max.value };
      }
    }
    return result;
  }
}
