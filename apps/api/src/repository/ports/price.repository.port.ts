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
    marketPrices: PriceEntity[];
    buylistPrices: PriceEntity[];
    ratioPrices: PriceEntity[];
    cardmarketListingCount: PriceEntity[];
    fullSetPrices: PriceEntity[];
    tcgpPrices: PriceEntity[];
    bricklinkAveragePrices: PriceEntity[];
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
        market: number | null;
        buylist: number | null;
        ratio: number | null;
        perBooster: number | null;
        cardmarketListingCount: number | null;
        fullSet: number | null;
        tcgp: number | null;
        bricklinkAverage: number | null;
        cardmarketPsa9: number | null;
        cardmarketPsa10: number | null;
      }
    >
  >;
}
