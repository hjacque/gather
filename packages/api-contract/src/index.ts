import type {
  CardEntity,
  CardSetEntity,
  Region,
  PriceType,
  SaleStatus,
} from '@gather/types';

export type { CardSetEntity };

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
  cardId: string;
  date: Date;
  value: number | null;
  type: PriceType;
};

export type DailyPrices = {
  cardmarketPsa9: number | null;
  cardmarketPsa10: number | null;
};

// A confirmed-or-pending Sale with its price converted to EUR at read time.
// Cancelled, invalid, and unsupported-currency Sales are excluded by the API.
export type SaleRecord = {
  id: string;
  psaGrade: number;
  priceEur: number;
  soldAt: Date;
  status: SaleStatus;
  isBestOffer: boolean;
  // Link to the original marketplace listing (eBay item page).
  url: string;
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

// ─── GET /cards ───────────────────────────────────────────────────────────────

export type GetCardsQuery = {
  tags?: string | string[];
  set?: string;
  region?: Region | Region[];
};

export type GetCardsResponseItem = CardEntity & DailyPrices & {
  cardSet: CardSetEntity;
  psaTotal: number | null;
  psaGrade10Pop: number | null;
  cardmarketPsa9Yesterday: number | null;
  cardmarketPsa10Yesterday: number | null;
  collectionEntry: CollectionEntry | null;
};

export type GetCardsResponse = GetCardsResponseItem[];

// ─── GET /cards/:id ───────────────────────────────────────────────────────────

export type GetCardResponse = CardEntity & {
  cardSet: CardSetEntity;
  psaGradePrices: PriceRecord[];
  sales: SaleRecord[];
  psaPopReport: PsaPopReportSummary | null;
  collectionEntry: CollectionEntry | null;
};

// ─── PATCH /cards/:id ────────────────────────────────────────────────────────

export type UpdateCardNoteRequest = {
  note: string | null;
};

// ─── PATCH /sales/:id ────────────────────────────────────────────────────────

// User-driven Sale moderation. Currently only used to flag a Sale as invalid
// (e.g. a mismatched listing) so it drops out of the read layer.
export type UpdateSaleStatusRequest = {
  status: 'invalid';
};

// ─── GET /sync/card/:id/cardmarket | GET /sync/card/:id/psa ─────────────────

export type SyncCardResponse = CardEntity & DailyPrices & {
  cardSet: CardSetEntity;
  psaTotal: number | null;
  psaGrade10Pop: number | null;
  cardmarketPsa9Yesterday: number | null;
  cardmarketPsa10Yesterday: number | null;
  collectionEntry: CollectionEntry | null;
};
