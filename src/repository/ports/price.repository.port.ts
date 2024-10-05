import { PriceEntity } from "../../entities/price.entity";

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
      | "estimated"
      | "ratio",
    date: Date
  ): Promise<void>;

  abstract getBestRatioCards(startDate: Date, endDate: Date): Promise<any[]>;

  abstract getPerformance(cardId: string): Promise<{
    oneMonthMarketPricePerformance: number | null;
    oneMonthBuylistPricePerformance: number | null;
    oneMonthEstimatedPricePerformance: number | null;
    oneWeekMarketPricePerformance: number | null;
    oneWeekBuylistPricePerformance: number | null;
    oneWeekEstimatedPricePerformance: number | null;
    oneDayMarketPricePerformance: number | null;
    oneDayBuylistPricePerformance: number | null;
    oneDayEstimatedPricePerformance: number | null;
  }>;

  abstract getCardPrices(cardId: string): Promise<{
    marketPrices: PriceEntity[];
    buylistPrices: PriceEntity[];
    estimatedPrices: PriceEntity[];
    ratioPrices: PriceEntity[];
  }>;
}
