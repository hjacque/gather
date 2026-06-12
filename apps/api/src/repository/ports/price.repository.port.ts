import { PriceType } from "@gather/types";
import { PriceEntity } from "../../entities/price.entity";

export abstract class PriceRepositoryPort {
  abstract upsertPrice(
    cardId: string,
    value: number | undefined,
    type: PriceType,
    date: Date
  ): Promise<void>;

  abstract getCardPrices(cardId: string): Promise<{
    psaGradePrices: PriceEntity[];
  }>;

  abstract getOne(
    cardId: string,
    type: PriceType,
    date: Date
  ): Promise<PriceEntity | null>;

  abstract getCardsPricesByDate(
    cardIds: string[],
    date: Date
  ): Promise<
    Map<
      string,
      {
        cardmarketPsa9: number | null;
        cardmarketPsa10: number | null;
      }
    >
  >;

  // Min/max of stored marketSalePsa1–10 snapshots per card per grade over the
  // given date range. Used to compute the 52-week high/low year signal.
  abstract getCardsMarketSaleYearRange(
    cardIds: string[],
    fromDate: Date,
    toDate: Date
  ): Promise<Map<string, Record<number, { min: number; max: number } | null>>>;
}
