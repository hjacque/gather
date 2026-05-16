import { z } from 'zod';

// interface Product {
//   id: string;
//   number: number;
//   name: string;
//   set: string;
//   rarity: string;
//   cardMarketLink: string;
//   priceChartingLink: string;
//   performance?: {
//     oneDayMarketPricePerformance: number | null;
//     oneWeekMarketPricePerformance: number | null;
//     oneMonthMarketPricePerformance: number | null;
//   };
//   marketPrices?: {
//     type: "market";
//     date: Date;
//     value: number;
//   }[];
//   buylistPrices?: {
//     type: "buylist";
//     date: Date;
//     value: number;
//   }[];
//   ratioPrices?: {
//     type: "ratio";
//     date: Date;
//     value: number;
//   }[];
// }

export const getProductResSchema = z.object({
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
  cardkingdomBuyListLink: z.string(),
  abugamesBuyListLink: z.string(),
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
      oneWeekMarketPricePerformance: z.number().nullable(),
      oneDayMarketPricePerformance: z.number().nullable(),
    })
    .nullable(),
  marketPrices: z
    .array(
      z.object({
        type: z.literal('market'),
        date: z.date(),
        value: z.number().nullable(),
      }),
    )
    .optional(),
  buylistPrices: z
    .array(
      z.object({
        type: z.literal('buylist'),
        date: z.date(),
        value: z.number().nullable(),
      }),
    )
    .optional(),
  cardmarketListingCount: z
    .array(
      z.object({
        type: z.literal('cardmarketListingCount'),
        date: z.date(),
        value: z.number().nullable(),
      }),
    )
    .optional(),
  fullSetPrices: z
    .array(
      z.object({
        type: z.literal('fullSet'),
        date: z.date(),
        value: z.number().nullable(),
      }),
    )
    .optional(),
  tcgpPrices: z
    .array(
      z.object({
        type: z.literal('tcgp'),
        date: z.date(),
        value: z.number().nullable(),
      }),
    )
    .optional(),
});

export type GetProductRes = z.infer<typeof getProductResSchema>;

export async function getProduct(productId: string): Promise<GetProductRes> {
  const data = await fetch(`http://localhost:3000/products/${productId}`);
  return await data.json();
}
