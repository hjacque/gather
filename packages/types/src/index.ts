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

export const FRANCHISES = [
  'mtg',
  'pokemon',
  'one_piece',
  'riftbound',
  'lego',
] as const;
export type Franchise = typeof FRANCHISES[number];

export const PRODUCT_TYPES = [
  'single',
  'booster_box',
  'collector_booster_box',
  'booster_bundle',
  'booster_box_18',
  'elite_trainer_box',
  'premium_booster_box',
  'extra_booster_box',
  'minifigure',
] as const;
export type ProductType = typeof PRODUCT_TYPES[number];

export const PRICE_TYPES = [
  'cardmarket',
  'cardkingdom',
  'abugames',
  'buylist',
  'market',
  'ratio',
  'perBooster',
  'cardmarketListingCount',
  'fullSet',
  'tcgp',
  'bricklink',
  'bricklinkAverage',
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
] as const;
export type PriceType = typeof PRICE_TYPES[number];

export const PERFORMANCE_PERIODS = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const;
export type PerformancePeriod = typeof PERFORMANCE_PERIODS[number];

export const PERFORMANCE_TYPES = ['market', 'buylist'] as const;
export type PerformanceType = typeof PERFORMANCE_TYPES[number];

export const REGIONS = ['japan', 'korea', 'taiwan_hong_kong'] as const;
export type Region = typeof REGIONS[number];

export const RARITIES = [
  'common',
  'uncommon',
  'rare',
  'land',
  'special_illustration_rare',
  'rainbow_rare',
  'promo',
  'holo_rare',
] as const;
export type Rarity = typeof RARITIES[number];

export const FOIL_PATTERNS = ['rareHolo', 'reverse', 'regularHolo'] as const;
export type FoilPattern = typeof FOIL_PATTERNS[number];

export type CollectionEntryEntity = {
  id: string;
  productId: string;
  isOwned: boolean;
  isWanted: boolean;
  grade: number | null;
  paidPrice: number | null;
  acquiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductSetEntity = {
  id: string;
  name: string;
  code: string;
  franchise: Franchise;
  releaseDate: Date;
  block: Block | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductEntity = {
  id: string;
  name: string;
  type: ProductType;
  boosterCount: number | null;
  msrp: number | null;
  productSetId: string;
  rarity: Rarity | null;
  foilPattern: FoilPattern | null;
  imageUrl: string | null;
  releaseDate: Date | null;
  cardMarketLink: string | null;
  cardkingdomBuyListLink: string | null;
  abugamesBuyListLink: string | null;
  fullSetLink: string | null;
  tcgpLink: string | null;
  bricklinkLink: string | null;
  psaLink: string | null;
  number: string | null;
  note: string | null;
  tags: string[];
  keyword: string | null;
  blocked: string[];
  regions: Region[];
  createdAt: Date;
  updatedAt: Date;
};
