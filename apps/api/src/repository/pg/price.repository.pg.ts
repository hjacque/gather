import { PriceEntry, PriceRepositoryPort } from "../ports/price.repository.port";
import { PriceType } from "@gather/types";
import { PrismaClient } from "@prisma/client";

const UPSERT_CHUNK = 250;

export class PriceRepositoryPg implements PriceRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertPrice(
    cardId: string,
    value: number | undefined,
    type: PriceType,
    date: Date
  ): Promise<void> {
    await this.prisma.price.upsert({
      where: { cardId_date_type: { cardId, type, date } },
      create: { cardId, value: value ?? null, type, date },
      update: { value: value ?? null },
    });
  }

  async upsertPrices(entries: PriceEntry[]): Promise<void> {
    for (let i = 0; i < entries.length; i += UPSERT_CHUNK) {
      await this.prisma.$transaction(
        entries.slice(i, i + UPSERT_CHUNK).map(({ cardId, value, type, date }) =>
          this.prisma.price.upsert({
            where: { cardId_date_type: { cardId, type, date } },
            create: { cardId, value, type, date },
            update: { value },
          })
        )
      );
    }
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
