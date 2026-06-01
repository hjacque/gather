export { SaleEntity } from "@gather/types";

import { Platform } from "@gather/types";

// Shape required to upsert a Sale scraped from a marketplace. Status and
// verification stage default to their initial values in the repository.
export type NewSale = {
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  price: number;
  currency: string;
  title: string;
  isBestOffer: boolean;
  soldAt: Date;
};
