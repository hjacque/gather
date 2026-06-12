import { PriceType } from "@gather/types";

export abstract class PriceRepositoryPort {
  abstract upsertPrice(
    cardId: string,
    value: number | undefined,
    type: PriceType,
    date: Date
  ): Promise<void>;

  // Min/max of stored marketSalePsa1–10 snapshots per card per grade over the
  // given date range. Used to compute the 52-week high/low year signal.
  abstract getCardsMarketSaleYearRange(
    cardIds: string[],
    fromDate: Date,
    toDate: Date
  ): Promise<Map<string, Record<number, { min: number; max: number } | null>>>;
}
