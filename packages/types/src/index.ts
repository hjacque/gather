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

export const PLATFORMS = ['ebay', 'cardmarket'] as const;
export type Platform = typeof PLATFORMS[number];

export const SALE_STATUSES = ['pending', 'confirmed', 'invalid'] as const;
export type SaleStatus = typeof SALE_STATUSES[number];

export const VERIFICATION_STAGES = ['unverified', 'checked_7d', 'complete'] as const;
export type VerificationStage = typeof VERIFICATION_STAGES[number];

export const SALE_SOURCES = ['terapeak', 'ebay_search', 'terapeak_verified'] as const;
export type SaleSource = typeof SALE_SOURCES[number];

export const isTerapeakPriced = (source: SaleSource): boolean =>
  source === 'terapeak' || source === 'terapeak_verified';

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
  ebayFrLink: string | null;
  number: string | null;
  note: string | null;
  tags: string[];
  regions: Region[];
  createdAt: Date;
  updatedAt: Date;
};

export type ListingEntity = {
  id: string;
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  price: number;
  currency: string;
  title: string;
  isBestOffer: boolean;
  seller: string | null;
  location: string | null;
  seenAt: Date;
  invalidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuctionEntity = {
  id: string;
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  currentBid: number;
  currency: string;
  bidCount: number;
  endTime: Date;
  title: string;
  seller: string | null;
  location: string | null;
  bidCheckedAt: Date;
  seenAt: Date;
  invalidatedAt: Date | null;
  gradeEditedAt: Date | null;
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
  seller: string | null;
  status: SaleStatus;
  verificationStage: VerificationStage;
  source: SaleSource;
  reviewedAt: Date | null;
  soldAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
