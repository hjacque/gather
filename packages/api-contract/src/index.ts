import type {
  ProductEntity,
  ProductSetEntity,
  Franchise,
  ProductType,
  PriceType,
  PerformancePeriod,
  PerformanceType,
} from '@gather/types';

export type { Franchise, ProductType, ProductSetEntity };

// ─── Shared shapes ───────────────────────────────────────────────────────────

export type PriceRecord = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  type: PriceType;
};

export type PerformanceRecord = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  periodType: PerformancePeriod;
  type: PerformanceType;
};

export type PerformanceSummary = {
  oneDayMarketPricePerformance: number | null;
  oneDayBuylistPricePerformance: number | null;
  oneWeekMarketPricePerformance: number | null;
  oneWeekBuylistPricePerformance: number | null;
  oneMonthMarketPricePerformance: number | null;
  oneMonthBuylistPricePerformance: number | null;
};

export type DailyPrices = {
  market: number | null;
  buylist: number | null;
  ratio: number | null;
  perBooster: number | null;
  cardmarketListingCount: number | null;
  fullSet: number | null;
  tcgp: number | null;
  bricklinkAverage: number | null;
};

// ─── GET /products ────────────────────────────────────────────────────────────

export type GetProductsQuery = {
  franchise?: Franchise;
  type?: ProductType | ProductType[];
  tags?: string | string[];
  set?: string;
};

export type GetProductsResponseItem = ProductEntity & DailyPrices & {
  productSet: ProductSetEntity;
  performance: PerformanceSummary;
};

export type GetProductsResponse = GetProductsResponseItem[];

// ─── GET /products/:id ────────────────────────────────────────────────────────

export type GetProductResponse = ProductEntity & {
  productSet: ProductSetEntity;
  marketPrices: PriceRecord[];
  buylistPrices: PriceRecord[];
  ratioPrices: PriceRecord[];
  cardmarketListingCount: PriceRecord[];
  fullSetPrices: PriceRecord[];
  tcgpPrices: PriceRecord[];
  bricklinkAveragePrices: PriceRecord[];
};

// ─── GET /product-of-the-day ─────────────────────────────────────────────────

export type GetProductOfTheDayQuery = {
  franchise?: Franchise;
  type?: ProductType;
};

export type GetProductOfTheDayResponse = ProductEntity & {
  topPerformance: PerformanceRecord;
};

// ─── GET /sync/product/:id ───────────────────────────────────────────────────

export type SyncProductResponse = ProductEntity & DailyPrices & {
  productSet: ProductSetEntity;
  performance: PerformanceSummary;
};
