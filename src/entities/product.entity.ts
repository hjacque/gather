export const enum MtgSet {
  alpha = "alpha",
  beta = "beta",
  unlimited = "unlimited",
  arabian_nights = "arabian_nights",
  antiquities = "antiquities",
  legends = "legends",
  the_dark = "the_dark",
}
export const enum PokemonSet {
  scarlet_and_violet = "scarlet_and_violet",
  sword_and_shield = "sword_and_shield",
}

export type Set = keyof typeof MtgSet & keyof typeof PokemonSet;

export type ProductType =
  | "single"
  | "booster_box"
  | "collector_booster_box"
  | "booster_bundle"
  | "booster_box_18"
  | "elite_trainer_box"
  | "premium_booster_box";
export type Franchise = "mtg" | "pokemon" | "one_piece" | "riftbound";

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
  fullSetLink: string | null;
  tcgpLink: string | null;
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
};
