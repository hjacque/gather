import { CardEntity } from "../../entities/card.entity";

export abstract class CardRepositoryPort {
  abstract getCards(): Promise<CardEntity[] | undefined>;
  abstract updateCardPrices(
    id: string,
    prices: {
      priceChartingPrice: number | undefined;
      cardMarketPrice: number | undefined;
      ckBuyListPrice: number | undefined;
      abugamesBuyListPrice: number | undefined;
      marketPrice: number | undefined;
    }
  ): Promise<void>;
}
