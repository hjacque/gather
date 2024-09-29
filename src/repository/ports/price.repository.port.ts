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
}
