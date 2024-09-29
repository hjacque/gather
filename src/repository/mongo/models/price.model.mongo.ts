import { ObjectId } from "mongodb";

export type PriceModel = {
  _id: ObjectId;
  cardId: ObjectId;
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
    | "estimated"
    | "ratio";
};
