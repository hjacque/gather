import type {
  ProductEntity,
  ProductSetEntity,
  Franchise,
  ProductType,
  Rarity,
  Region,
  PriceType,
} from '@gather/types';

export type { Franchise, ProductType, ProductSetEntity };

// ─── Collection Entry ─────────────────────────────────────────────────────────

export type CollectionEntry = {
  isOwned: boolean;
  isWanted: boolean;
  grade: number | null;
  paidPrice: number | null;
  acquiredAt: Date | null;
};

export type UpsertCollectionEntryRequest = {
  isOwned: boolean;
  isWanted: boolean;
  grade: number | null;
  paidPrice: number | null;
  acquiredAt: string | null;
};

// ─── Shared shapes ───────────────────────────────────────────────────────────

export type PriceRecord = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  type: PriceType;
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
  cardmarketPsa9: number | null;
  cardmarketPsa10: number | null;
};

// ─── PSA Pop Report ───────────────────────────────────────────────────────────

export type PsaPopReportSummary = {
  grade1: number | null;
  grade2: number | null;
  grade3: number | null;
  grade4: number | null;
  grade5: number | null;
  grade6: number | null;
  grade7: number | null;
  grade8: number | null;
  grade9: number | null;
  grade10: number | null;
  total: number | null;
  syncedAt: Date;
};

// ─── GET /products ────────────────────────────────────────────────────────────

export type GetProductsQuery = {
  franchise?: Franchise;
  type?: ProductType | ProductType[];
  tags?: string | string[];
  set?: string;
  rarity?: Rarity;
  region?: Region | Region[];
};

export type GetProductsResponseItem = ProductEntity & DailyPrices & {
  productSet: ProductSetEntity;
  performance: PerformanceSummary;
  psaTotal: number | null;
  cardmarketPsa9Yesterday: number | null;
  cardmarketPsa10Yesterday: number | null;
  collectionEntry: CollectionEntry | null;
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
  psaGradePrices: PriceRecord[];
  psaPopReport: PsaPopReportSummary | null;
  collectionEntry: CollectionEntry | null;
};

// ─── PATCH /products/:id ─────────────────────────────────────────────────────

export type UpdateProductNoteRequest = {
  note: string | null;
};

// ─── GET /sync/product/:id/cardmarket | GET /sync/product/:id/psa ────────────

export type SyncProductResponse = ProductEntity & DailyPrices & {
  productSet: ProductSetEntity;
  performance: PerformanceSummary;
  psaTotal: number | null;
  cardmarketPsa9Yesterday: number | null;
  cardmarketPsa10Yesterday: number | null;
  collectionEntry: CollectionEntry | null;
};
