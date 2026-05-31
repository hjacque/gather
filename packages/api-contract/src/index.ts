import type {
  ProductEntity,
  ProductSetEntity,
  Region,
  PriceType,
} from '@gather/types';

export type { ProductSetEntity };

// ─── Collection Entry ─────────────────────────────────────────────────────────

export type CollectionEntry = {
  isOwned: boolean;
  isWanted: boolean;
};

export type UpsertCollectionEntryRequest = {
  isOwned: boolean;
  isWanted: boolean;
};

// ─── Shared shapes ───────────────────────────────────────────────────────────

export type PriceRecord = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  type: PriceType;
};

export type DailyPrices = {
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
  tags?: string | string[];
  set?: string;
  region?: Region | Region[];
};

export type GetProductsResponseItem = ProductEntity & DailyPrices & {
  productSet: ProductSetEntity;
  psaTotal: number | null;
  psaGrade10Pop: number | null;
  cardmarketPsa9Yesterday: number | null;
  cardmarketPsa10Yesterday: number | null;
  collectionEntry: CollectionEntry | null;
};

export type GetProductsResponse = GetProductsResponseItem[];

// ─── GET /products/:id ────────────────────────────────────────────────────────

export type GetProductResponse = ProductEntity & {
  productSet: ProductSetEntity;
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
  psaTotal: number | null;
  psaGrade10Pop: number | null;
  cardmarketPsa9Yesterday: number | null;
  cardmarketPsa10Yesterday: number | null;
  collectionEntry: CollectionEntry | null;
};
