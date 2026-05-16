import { PriceType } from "@gather/types";

export type PriceEntity = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  type: PriceType;
};

export type NewPriceEntity = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  type: PriceType;
  createdAt: Date;
  updatedAt: Date;
};
