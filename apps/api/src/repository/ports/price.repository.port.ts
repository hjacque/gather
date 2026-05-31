import { PriceType } from "@gather/types";
import { PriceEntity } from "../../entities/price.entity";

export abstract class PriceRepositoryPort {
  abstract upsertPrice(
    productId: string,
    value: number | undefined,
    type: PriceType,
    date: Date
  ): Promise<void>;

  abstract getProductPrices(productId: string): Promise<{
    psaGradePrices: PriceEntity[];
  }>;

  abstract getOne(
    productId: string,
    type: PriceType,
    date: Date
  ): Promise<PriceEntity | null>;

  abstract getProductsPricesByDate(
    productIds: string[],
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
}
