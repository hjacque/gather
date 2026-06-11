export { ListingEntity } from "@gather/types";

import { Platform } from "@gather/types";

// Shape required to persist one active listing observed by the Listings Sync.
export type NewListing = {
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  // Ask price in its original currency — an offer ceiling, not a realized price.
  price: number;
  currency: string;
  title: string;
  // Best Offer enabled: still buyable at `price`, but negotiable below it.
  isBestOffer: boolean;
  // eBay store slug of the seller, or null for non-store listings.
  seller: string | null;
  seenAt: Date;
};
