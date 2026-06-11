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

// ─── Market Price ─────────────────────────────────────────────────────────────

// Per-grade market price: the recency-weighted median of that grade's eBay sale
// prices, in EUR. Only grades with at least one sale appear.
export type MarketPriceRecord = {
  psaGrade: number;
  priceEur: number;
  // Number of sales behind the estimate.
  sampleSize: number;
  // soldAt of the most recent sale in the set.
  newestSoldAt: Date;
  // Sales per day, rendered in a readable unit (/day…/yr).
  salesPerDay: number;
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
  // PSA 10 market price in EUR; null when the card has no PSA 10 sales. Paired
  // with cardmarketPsa10 (lowest PSA 10 listing) to surface under-priced cards.
  marketPsa10: number | null;
  // Same market price as of 7 days ago, for the column's trend delta.
  marketPsa10Prior7d: number | null;
  collectionEntry: CollectionEntry | null;
};

export type GetCardsResponse = GetCardsResponseItem[];

// ─── GET /cards/:id ───────────────────────────────────────────────────────────

export type GetCardResponse = CardEntity & {
  cardSet: CardSetEntity;
  psaGradePrices: PriceRecord[];
  sales: SaleRecord[];
  marketPrices: MarketPriceRecord[];
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

// Sale Review action from the backoffice page. `approve` stamps the Sale reviewed
// and applies any corrections (a misparsed grade, a Best-Offer's true price);
// `invalidate` flags it invalid (which also counts as reviewed).
export type ReviewSaleRequest =
  | { action: 'approve'; psaGrade?: number; price?: number }
  | { action: 'invalidate' };

// ─── GET /sales/unreviewed ────────────────────────────────────────────────────

// One unreviewed Sale as shown on the Sale Review page. Unlike SaleRecord this
// carries the raw `title` (the primary signal for judging grade/card) and the
// original price + currency alongside the EUR conversion (null when the currency
// is not yet convertible).
export type ReviewSaleRecord = {
  id: string;
  title: string;
  psaGrade: number;
  price: number;
  currency: string;
  priceEur: number | null;
  soldAt: Date;
  isBestOffer: boolean;
  status: SaleStatus;
  url: string;
};

export type UnreviewedSalesCard = {
  id: string;
  name: string;
  number: string | null;
  set: string;
  imageUrl: string | null;
  sales: ReviewSaleRecord[];
};

export type GetUnreviewedSalesResponse = {
  cards: UnreviewedSalesCard[];
  // Total number of Cards with unreviewed Sales, for pagination.
  totalCards: number;
  page: number;
  pageSize: number;
};

// ─── GET /sales/unreviewed/count ──────────────────────────────────────────────

export type GetUnreviewedCountResponse = {
  count: number;
};

// ─── GET /opportunities ───────────────────────────────────────────────────────

// Four-level evaluation scale returned by the backend for each signal and the
// overall score. The frontend maps these to colours; the thresholds live in the
// backend so they are easy to tune without touching UI code.
export type SignalLevel = 'green-strong' | 'yellow-light' | 'orange-light' | 'red-strong';

export type GradeOpportunity = {
  psaGrade: number;
  score: number;
  scoreLevel: SignalLevel;
  // Listing signal: sqrt discount of listing vs Market Sale Price (negative when
  // listed above market), scaled by listingConfidence — how trustworthy the
  // Market Sale Price is, from its sample size and the recency of the last sale.
  listingSignal: number;
  listingConfidence: number;
  sampleSize: number;
  newestSoldAt: Date;
  listingPrice: number | null;
  marketSalePrice: number;
  listingLevel: SignalLevel;
  // Year signal: where Market Sale Price sits in its 52-week range (0=high, 1=low).
  yearSignal: number;
  yearLow: number | null;
  yearHigh: number | null;
  yearLevel: SignalLevel;
  // Collectability signals (normalized across the collection, 0–1 each).
  ageSignal: number;
  ageLevel: SignalLevel;
  populationSignal: number;
  populationLevel: SignalLevel;
  gradeSignal: number;
  gradeLevel: SignalLevel;
  premiumSignal: number;
  premiumLevel: SignalLevel;
  popsAtOrAbove: number | null;
  psaTotal: number | null;
};

export type OpportunityEntry = {
  id: string;
  name: string;
  imageUrl: string | null;
  cardSetName: string;
  releaseDate: Date | null;
  bestGrade: GradeOpportunity;
};

export type GetOpportunitiesResponse = OpportunityEntry[];

// ─── GET /sync/card/:id/cardmarket | GET /sync/card/:id/psa ─────────────────

export type SyncCardResponse = CardEntity & DailyPrices & {
  cardSet: CardSetEntity;
  psaTotal: number | null;
  psaGrade10Pop: number | null;
  cardmarketPsa9Yesterday: number | null;
  cardmarketPsa10Yesterday: number | null;
  marketPsa10: number | null;
  marketPsa10Prior7d: number | null;
  collectionEntry: CollectionEntry | null;
};
