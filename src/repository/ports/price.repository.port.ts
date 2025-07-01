import { PriceEntity, PriceType } from "../../entities/price.entity";

export abstract class PriceRepositoryPort {
  abstract upsertPrice(
    cardId: string,
    value: number | undefined,
    type:
      | "cardmarket"
      | "pricecharting"
      | "cardkingdom"
      | "abugames"
      | "starcitygames"
      | "buylist"
      | "market"
      | "ratio",
    date: Date
  ): Promise<void>;

  abstract getBestRatioCards(startDate: Date, endDate: Date): Promise<any[]>;

  abstract getCardPrices(cardId: string): Promise<{
    marketPrices: PriceEntity[];
    buylistPrices: PriceEntity[];
    ratioPrices: PriceEntity[];
  }>;

  abstract getOne(
    cardId: string,
    type: PriceType,
    date: Date
  ): Promise<PriceEntity | null>;

  abstract getCardsPricesByDate(
    cardIds: string[],
    date: Date
  ): Promise<Map<string, {
    market: number | null;
    buylist: number | null;
    ratio: number | null;
  }>>;
}
