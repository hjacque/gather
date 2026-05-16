interface Product {
  id: string;
  type: ProductType;
  franchise: Franchise;
  name: string;
  set: string;
  rarity: string;
  cardMarketLink: string;
  priceChartingLink: string;
  oneDayMarketPricePerformance?: number | null;
  oneDayBuylistPricePerformance?: number | null;
  oneWeekMarketPricePerformance?: number | null;
  oneWeekBuylistPricePerformance?: number | null;
  oneMonthMarketPricePerformance?: number | null;
  oneMonthBuylistPricePerformance?: number | null;
  market?: number | null;
  buylist?: number | null;
  ratio?: number | null;
  topPerformance?: {
    value: number;
    type: 'market' | 'buylist';
    periodType: 'daily' | 'weekly' | 'monthly';
  };
  performance?: {
    oneDayMarketPricePerformance?: number | null;
    oneDayBuylistPricePerformance?: number | null;
    oneWeekMarketPricePerformance?: number | null;
    oneWeekBuylistPricePerformance?: number | null;
    oneMonthMarketPricePerformance?: number | null;
    oneMonthBuylistPricePerformance?: number | null;
    market?: number | null;
    buylist?: number | null;
    ratio?: number | null;
  };
}

type ProductType = 'single' | 'booster_box' | 'collector_booster_box';
type Franchise = 'mtg' | 'pokemon';

type GetProductOfTheDayFilter = {
  type?: ProductType | ProductType[];
  franchise?: Franchise;
};

export async function getProductOfTheDay(
  filter: GetProductOfTheDayFilter,
): Promise<Product> {
  const params = new URLSearchParams();
  for (const key of Object.keys(filter)) {
    if (typeof filter[key as keyof GetProductOfTheDayFilter] !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (filter[key as keyof GetProductOfTheDayFilter] as any).map((t: any) =>
        params.append(key, t),
      );
    } else {
      params.append(
        key,
        filter[key as keyof GetProductOfTheDayFilter] as string,
      );
    }
  }

  const res = await fetch(
    'http://localhost:3000/product-of-the-day?' + params.toString(),
  );
  return res.json();
}
