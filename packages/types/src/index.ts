export const BLOCKS = [
  'scarlet_and_violet',
  'sword_and_shield',
  'sun_and_moon',
  'x_y',
  'ex',
  'web',
  'vs',
  'wotc',
  'e_series',
] as const;
export type Block = typeof BLOCKS[number];



export const PRICE_TYPES = [
  'cardmarketPsa1',
  'cardmarketPsa2',
  'cardmarketPsa3',
  'cardmarketPsa4',
  'cardmarketPsa5',
  'cardmarketPsa6',
  'cardmarketPsa7',
  'cardmarketPsa8',
  'cardmarketPsa9',
  'cardmarketPsa10',
  'marketSalePsa1',
  'marketSalePsa2',
  'marketSalePsa3',
  'marketSalePsa4',
  'marketSalePsa5',
  'marketSalePsa6',
  'marketSalePsa7',
  'marketSalePsa8',
  'marketSalePsa9',
  'marketSalePsa10',
] as const;
export type PriceType = typeof PRICE_TYPES[number];

export const REGIONS = ['japan', 'korea', 'taiwan_hong_kong'] as const;
export type Region = typeof REGIONS[number];


export const FOIL_PATTERNS = ['rareHolo', 'reverse', 'regularHolo'] as const;
export type FoilPattern = typeof FOIL_PATTERNS[number];

export const PLATFORMS = ['ebay'] as const;
export type Platform = typeof PLATFORMS[number];

export const SALE_STATUSES = ['pending', 'confirmed', 'invalid'] as const;
export type SaleStatus = typeof SALE_STATUSES[number];

export const VERIFICATION_STAGES = ['unverified', 'checked_7d', 'complete'] as const;
export type VerificationStage = typeof VERIFICATION_STAGES[number];

export type CollectionEntryEntity = {
  id: string;
  cardId: string;
  isOwned: boolean;
  isWanted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CardSetEntity = {
  id: string;
  name: string;
  code: string;
  releaseDate: Date;
  block: Block | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CardEntity = {
  id: string;
  name: string;
  foilPattern: FoilPattern | null;
  imageUrl: string | null;
  releaseDate: Date | null;
  cardSetId: string;
  cardMarketLink: string | null;
  psaLink: string | null;
  ebayLink: string | null;
  number: string | null;
  note: string | null;
  tags: string[];
  regions: Region[];
  createdAt: Date;
  updatedAt: Date;
};

// An active marketplace ask (buyable now), as opposed to a Sale (realized
// transaction). One row per live listing seen by the last Listings Sync;
// listings that disappear are pruned by full per-card replacement on each sync.
export type ListingEntity = {
  id: string;
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  // Ask price in its original currency — an offer ceiling, not a realized price.
  price: number;
  currency: string;
  title: string;
  // Best Offer enabled: still buyable at `price`, but negotiable below it.
  isBestOffer: boolean;
  // eBay store slug of the seller, when the listing came from a store
  // (e.g. "psa"); null otherwise.
  seller: string | null;
  // When the last Listings Sync saw this listing live.
  seenAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type SaleEntity = {
  id: string;
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  price: number;
  currency: string;
  title: string;
  isBestOffer: boolean;
  // eBay store slug of the seller, when the listing came from a store
  // (e.g. "psa"); null otherwise.
  seller: string | null;
  status: SaleStatus;
  verificationStage: VerificationStage;
  // Manual adjudication marker: null = unreviewed. Orthogonal to status and
  // verificationStage. See Sale Review in CONTEXT.md.
  reviewedAt: Date | null;
  soldAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
