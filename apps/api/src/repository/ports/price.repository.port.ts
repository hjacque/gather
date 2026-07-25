import { PriceType } from "@gather/types";

export type PriceEntry = {
  cardId: string;
  value: number;
  type: PriceType;
  date: Date;
};

export abstract class PriceRepositoryPort {
  abstract upsertPrice(
    cardId: string,
    value: number | undefined,
    type: PriceType,
    date: Date
  ): Promise<void>;

  abstract upsertPrices(entries: PriceEntry[]): Promise<void>;

  abstract getCardsMarketSaleYearRange(
    cardIds: string[],
    fromDate: Date,
    toDate: Date
  ): Promise<Map<string, Record<number, { min: number; max: number } | null>>>;
}
