import { z } from "zod";

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
  | "elite_trainer_box";
export type Franchise = "mtg" | "pokemon";

export const ProductEntitySchema = z.object({
  id: z.string(),
  type: z.union([
    z.literal("single"),
    z.literal("booster_box"),
    z.literal("collector_booster_box"),
    z.literal("booster_bundle"),
    z.literal("booster_box_18"),
    z.literal("elite_trainer_box"),
  ]),
  franchise: z.union([z.literal("mtg"), z.literal("pokemon")]),
  name: z.string(),
  releaseDate: z.date().optional(),
  msrp: z.number().optional(),
  block: z.string(),
  set: z.union([
    z.literal("alpha"),
    z.literal("beta"),
    z.literal("unlimited"),
    z.literal("arabian_nights"),
    z.literal("antiquities"),
    z.literal("legends"),
    z.literal("the_dark"),
  ]),
  // setId: z.string(),
  rarity: z.union([
    z.literal("common"),
    z.literal("uncommon"),
    z.literal("rare"),
  ]),
  // imageUrl: z.string(),
  cardMarketLink: z.string(),
  priceChartingLink: z.string(),
  cardkingdomBuyListLink: z.string(),
  abugamesBuyListLink: z.string(),
  starcitygamesBuyListLink: z.string(),
  performance: z
    .object({
      oneMonthMarketPricePerformance: z.number().nullable(),
      oneMonthBuylistPricePerformance: z.number().nullable(),
      oneWeekMarketPricePerformance: z.number().nullable(),
      oneWeekBuylistPricePerformance: z.number().nullable(),
      oneDayMarketPricePerformance: z.number().nullable(),
      oneDayBuylistPricePerformance: z.number().nullable(),
    })
    .nullable(),
  market: z.number().nullable(),
  buylist: z.number().nullable(),
  ratio: z.number().nullable(),
  perBooster: z.number().nullable(),
  boosterCount: z.number().nullable().optional(),
});

export type ProductEntity = z.infer<typeof ProductEntitySchema>;

export type NewProductEntity = {
  id: string;
  name: string;
  type: ProductType;
  boosterCount: number | null;
  msrp: number | null;
  productSetId: string;
  rarity: string | null;
  cardMarketLink: string;
  cardkingdomBuyListLink: string |  null;
  abugamesBuyListLink: string |  null;
  createdAt: Date;
  updatedAt: Date;
}