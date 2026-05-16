import { Franchise, ProductType } from '@/packages/types/src';
import { z } from 'zod';

export type GetProductFilter = {
  type?: ProductType | ProductType[];
  franchise?: Franchise;
  tags?: string[];
  set?: string | string[];
};

export const getProductsResSchema = z.object({
  id: z.string(),
  type: z.union([
    z.literal('single'),
    z.literal('booster_box'),
    z.literal('collector_booster_box'),
  ]),
  name: z.string(),
  msrp: z.number().optional(),
  productSetId: z.string(),
  rarity: z.union([
    z.literal('common'),
    z.literal('uncommon'),
    z.literal('rare'),
  ]),
  cardMarketLink: z.string(),
  cardkingdomBuyListLink: z.string().nullable(),
  abugamesBuyListLink: z.string().nullable(),
  fullSetLink: z.string().nullable(),
  tcgpLink: z.string().nullable(),
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
  fullSet: z.number().nullable(),
  tcgp: z.number().nullable(),
  tags: z.array(z.string()).nullable(),
});

export type GetProductsRes = z.infer<typeof getProductsResSchema>;

export async function getProducts(
  filter: GetProductFilter,
): Promise<GetProductsRes[]> {
  const params = new URLSearchParams();
  for (const key of Object.keys(filter)) {
    if (typeof filter[key as keyof GetProductFilter] !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (filter[key as keyof GetProductFilter] as any).map((t: any) =>
        params.append(key, t),
      );
    } else {
      params.append(key, filter[key as keyof GetProductFilter] as string);
    }
  }

  const data = await fetch(
    'http://localhost:3000/products?' + params.toString(),
  );
  return data.json();
}
