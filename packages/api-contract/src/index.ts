import type {
  CardEntity,
  CardSetEntity,
  Region,
  SaleSource,
  SaleStatus,
} from '@gather/types';

export type { CardSetEntity };

export type CollectionEntry = {
  isOwned: boolean;
  isWanted: boolean;
};

export type UpsertCollectionEntryRequest = {
  isOwned: boolean;
  isWanted: boolean;
};

export type SaleRecord = {
  id: string;
  psaGrade: number;
  priceEur: number;
  soldAt: Date;
  status: SaleStatus;
  isBestOffer: boolean;
  source: SaleSource;
  url: string;
};

export type ListingRecord = {
  id: string;
  psaGrade: number;
  priceEur: number;
  isBestOffer: boolean;
  source: 'cardmarket' | 'ebay';
  title: string;
  url: string;
  seenAt: Date;
};

export type AuctionRecord = {
  id: string;
  itemId: string;
  cardId: string;
  cardName: string;
  cardSetName: string;
  imageUrl: string | null;
  psaGrade: number;
  currentBidEur: number;
  bidCount: number;
  endTime: Date;
  bidCheckedAt: Date;
  location: string | null;
  url: string;
};

export type GetAuctionsResponse = AuctionRecord[];

export type UpdateAuctionRequest =
  | { action: 'invalidate' }
  | { action: 'invalidateByItem' }
  | { action: 'editGrade'; psaGrade: number };

export type RefreshAuctionBidResponse = {
  auctionId: string;
  removed: boolean;
  currentBidEur?: number;
  bidCount?: number;
  bidCheckedAt?: Date;
  unchanged?: boolean;
};

export type MarketPriceRecord = {
  psaGrade: number;
  priceEur: number;
  sampleSize: number;
  newestSoldAt: Date;
  salesPerDay: number;
};

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

export type GetCardsQuery = {
  tags?: string | string[];
  set?: string;
  region?: Region | Region[];
};

export type GetCardsResponseItem = CardEntity & {
  cardSet: CardSetEntity;
  psaTotal: number | null;
  psaGrade10Pop: number | null;
  marketPsa10: number | null;
  marketPsa10Prior7d: number | null;
  collectionEntry: CollectionEntry | null;
};

export type GetCardsResponse = GetCardsResponseItem[];

export type GetCardResponse = CardEntity & {
  cardSet: CardSetEntity;
  sales: SaleRecord[];
  listings: ListingRecord[];
  marketPrices: MarketPriceRecord[];
  psaPopReport: PsaPopReportSummary | null;
  collectionEntry: CollectionEntry | null;
};

export type UpdateCardNoteRequest = {
  note: string | null;
};

export type UpdateSaleStatusRequest = {
  status: 'invalid';
};

export type UpdateListingStatusRequest =
  | { action: 'invalidate' }
  | { action: 'invalidateByItem' };

export type SyncCardListingsResponse = {
  cardsSynced: number;
  cardsSkipped: number;
  scraped: number;
  stored: number;
  skippedTitle: number;
  skippedSeller: number;
};

export type SyncListingResponse = {
  listingId: string;
  removed: boolean;
  priceEur?: number;
  isBestOffer?: boolean;
  unchanged?: boolean;
};

export type ReviewSaleRequest =
  | { action: 'approve'; psaGrade?: number; price?: number }
  | { action: 'invalidate' };

export type ReviewSaleRecord = {
  id: string;
  title: string;
  psaGrade: number;
  price: number;
  currency: string;
  priceEur: number | null;
  soldAt: Date;
  status: SaleStatus;
  isBestOffer: boolean;
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
  totalCards: number;
  pageSize: number;
  nextCursor: string | null;
};

export type GetUnreviewedCountResponse = {
  count: number;
};

export type SignalLevel = 'green-strong' | 'yellow-light' | 'orange-light' | 'red-strong';

export type GradeOpportunity = {
  psaGrade: number;
  score: number;
  scoreLevel: SignalLevel;
  qualitySignal: number;
  listingSignal: number;
  listingConfidence: number;
  sampleSize: number;
  newestSoldAt: Date;
  salesPerDay: number;
  liquiditySignal: number;
  liquidityLevel: SignalLevel;
  listingPrice: number | null;
  listingSource: 'cardmarket' | 'ebay' | null;
  listingUrl: string | null;
  listingIsBestOffer: boolean;
  marketSalePrice: number;
  listingLevel: SignalLevel;
  yearSignal: number;
  yearLow: number | null;
  yearHigh: number | null;
  yearLevel: SignalLevel;
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

export type SyncCardResponse = CardEntity & {
  cardSet: CardSetEntity;
  psaTotal: number | null;
  psaGrade10Pop: number | null;
  marketPsa10: number | null;
  marketPsa10Prior7d: number | null;
  collectionEntry: CollectionEntry | null;
};
