import { z } from 'zod';

export const syncProductResSchema = z.object({
  id: z.string(),
  type: z.union([
    z.literal('single'),
    z.literal('booster_box'),
    z.literal('collector_booster_box'),
  ]),
  name: z.string(),
  releaseDate: z.date().optional(),
  msrp: z.number().optional(),
  block: z.string(),
  productSetId: z.string(),
  rarity: z.union([
    z.literal('common'),
    z.literal('uncommon'),
    z.literal('rare'),
  ]),
  cardMarketLink: z.string(),
  cardkingdomBuyListLink: z.string(),
  abugamesBuyListLink: z.string(),
  productSet: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    franchise: z.union([z.literal('mtg'), z.literal('pokemon')]),
    releaseDate: z.date(),
    block: z
      .union([z.literal('scarlet_and_violet'), z.literal('sword_and_shield')])
      .nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
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
  cardmarketListingCount: z.number().nullable(),
  fullSetLink: z.string().nullable(),
  tcgpLink: z.string().nullable(),
  fullSet: z.number().nullable(),
  tcgp: z.number().nullable(),
  tags: z.array(z.string()).nullable(),
});

export type SyncProductRes = z.infer<typeof syncProductResSchema>;

export async function syncProduct(productId: string): Promise<SyncProductRes> {
  const data = await fetch(`http://localhost:3000/sync/product/${productId}`);
  return await data.json();
}
