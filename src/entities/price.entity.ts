import { PriceType } from "../types/priceType";
import { z } from "zod";

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

// model Price {
//   id        String      @id @default(uuid())
//   product   Product     @relation("ProductPrices", fields: [productId], references: [id])
//   productId String
//   date      DateTime
//   value     Float?
//   type      PriceType

//   createdAt DateTime    @default(now())
//   updatedAt   DateTime  @updatedAt

//   @@unique([productId, date, type])
// }

export type NewPriceEntity = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  type: PriceType;
  createdAt: Date;
  updatedAt: Date;
}