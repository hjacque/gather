export type Block =
  | 'scarlet_and_violet'
  | 'sword_and_shield'
  | 'sun_and_moon'
  | 'x_y'
  | 'ex'
  | 'web'
  | 'vs'
  | 'wotc'
  | 'e_series';

export type Franchise = 'mtg' | 'pokemon' | 'one_piece' | 'riftbound' | 'lego';

export type ProductType =
  | 'single'
  | 'booster_box'
  | 'collector_booster_box'
  | 'booster_bundle'
  | 'booster_box_18'
  | 'elite_trainer_box'
  | 'premium_booster_box'
  | 'extra_booster_box'
  | 'minifigure';

export type PriceType =
  | 'cardmarket'
  | 'cardkingdom'
  | 'abugames'
  | 'buylist'
  | 'market'
  | 'ratio'
  | 'perBooster'
  | 'cardmarketListingCount'
  | 'fullSet'
  | 'tcgp'
  | 'bricklink'
  | 'bricklinkAverage';

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
  rarity: string | null;
  cardMarketLink: string | null;
  cardkingdomBuyListLink: string | null;
  abugamesBuyListLink: string | null;
  fullSetLink: string | null;
  tcgpLink: string | null;
  bricklinkLink: string | null;
  tags: string[];
  keyword: string | null;
  blocked: string[];
  createdAt: Date;
  updatedAt: Date;
};
