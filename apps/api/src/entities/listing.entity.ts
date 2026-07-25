export { ListingEntity } from "@gather/types";

import { Platform } from "@gather/types";

export const LISTING_FRESHNESS_DAYS = 3;

export type NewListing = {
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  price: number;
  currency: string;
  title: string;
  isBestOffer: boolean;
  seller: string | null;
  location: string | null;
  seenAt: Date;
};
