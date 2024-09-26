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
      starcitygamesBuyListPrice: number | undefined;
      marketPrice: number | undefined;
      buylistPrice: number | undefined;
      estimatedValue: number | undefined;
    }
  ): Promise<void>;
}
