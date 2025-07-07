import { ObjectId } from "mongodb";

export type PriceModel = {
  _id: ObjectId;
  productId: ObjectId;
  date: Date;
  value: number | null;
  type:
    | "cardmarket"
    | "pricecharting"
    | "cardkingdom"
    | "abugames"
    | "starcitygames"
    | "buylist"
    | "market"
    | "ratio"
    | "perBooster";
};
