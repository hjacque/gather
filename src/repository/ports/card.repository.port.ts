import { CardEntity } from "../../entities/card.entity";

export abstract class CardRepositoryPort {
  abstract getCards(): Promise<CardEntity[] | undefined>;
  abstract updateCardPrices(
    id: string,
    prices: {
      priceChartingPrice: number;
      cardMarketPrice: number;
      ckBuyListPrice: number;
      abugamesBuyListPrice: number;
      marketPrice: number;
    }
  ): Promise<void>;
}
