export { ListingEntity } from "@gather/types";

import { Platform } from "@gather/types";

// eBay listings older than this are ignored by the read layer: CardMarket
// prices are read for today only, but pruning eBay asks just as hard would
// empty the buy side whenever a sync is missed. Three days bounds how stale a
// surfaced ask can be.
export const LISTING_FRESHNESS_DAYS = 3;

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
  // Item-location country (e.g. "Allemagne") for eBay asks, verified EU at
  // ingest. null for CardMarket (inherently EU) and rows with no location line.
  location: string | null;
  seenAt: Date;
};
