import { z } from "zod";

export enum PriceType {
  cardmarket = "cardmarket",
  pricecharting = "pricecharting",
  cardkingdom = "cardkingdom",
  abugames = "abugames",
  starcitygames = "starcitygames",
  buylist = "buylist",
  market = "market",
  ratio = "ratio",
  perBooster = "perBooster",
}

export const PriceEntitySchema = z.object({
  id: z.string(),
  productId: z.string(),
  date: z.date(),
  value: z.number().nullable(),
  type: z.union([
    z.literal("cardmarket"),
    z.literal("pricecharting"),
    z.literal("cardkingdom"),
    z.literal("abugames"),
    z.literal("starcitygames"),
    z.literal("buylist"),
    z.literal("market"),
    z.literal("ratio"),
    z.literal("perBooster"),
  ]),
});

export type PriceEntity = z.infer<typeof PriceEntitySchema>;
