import { z } from "zod";

export const enum Set {
  alpha = "alpha",
  beta = "beta",
  unlimited = "unlimited",
  arabian_nights = "arabian_nights",
  antiquities = "antiquities",
  legends = "legends",
  the_dark = "the_dark",
}
export type SetType = keyof typeof Set;

export type ProductType = "single" | "booster_box" | "collector_booster_box";
export type Franchise = "mtg" | "pokemon";

export const ProductEntitySchema = z.object({
  id: z.string(),
  type: z.union([
    z.literal("single"),
    z.literal("booster_box"),
    z.literal("collector_booster_box")
  ]),
  franchise: z.union([
    z.literal("mtg"),
    z.literal("pokemon")
  ]),
  name: z.string(),
  set: z.union([
    z.literal("alpha"),
    z.literal("beta"),
    z.literal("unlimited"),
    z.literal("arabian_nights"),
    z.literal("antiquities"),
    z.literal("legends"),
    z.literal("the_dark"),
    z.literal("fallen_empires"),
    z.literal("ice_age"),
    z.literal("chronicles"),
    z.literal("homelands"),
    z.literal("alliances"),
    z.literal("mirage"),
    z.literal("visions"),
    z.literal("weatherlight"),
    z.literal("portal"),
    z.literal("stronghold"),
    z.literal("exodus"),
    z.literal("urzas_saga"),
    z.literal("urzas_legacy"),
    z.literal("urzas_destiny"),
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
});

export type ProductEntity = z.infer<typeof ProductEntitySchema>;
