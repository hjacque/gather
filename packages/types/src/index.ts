export type Block =
  | 'scarlet_and_violet'
  | 'sword_and_shield'
  | 'sun_and_moon'
  | 'x_y';

export type ProductSet = {
  id: string;
  name: string;
  code: string;
  franchise: Franchise;
  releaseDate: Date;
  block: Block | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductType =
  | 'single'
  | 'booster_box'
  | 'collector_booster_box'
  | 'booster_bundle'
  | 'booster_box_18'
  | 'elite_trainer_box'
  | 'premium_booster_box'
  | 'extra_booster_box';
export type Franchise = 'mtg' | 'pokemon' | 'one_piece' | 'riftbound';

export type ProductEntity = {
  id: string;
  name: string;
  type: ProductType;
  boosterCount: number | null;
  msrp: number | null;
  productSetId: string;
  rarity: string | null;
  cardMarketLink: string;
  cardkingdomBuyListLink: string | null;
  abugamesBuyListLink: string | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};
