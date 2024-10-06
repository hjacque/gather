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

export const CardEntitySchema = z.object({
  id: z.string(),
  number: z.number(),
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
  ratio: z.number().nullable(),
});

export type CardEntity = z.infer<typeof CardEntitySchema>;
