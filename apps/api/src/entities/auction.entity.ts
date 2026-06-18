export { AuctionEntity } from "@gather/types";

import { Platform } from "@gather/types";

// Ongoing auctions whose endTime has passed are excluded by the read layer and
// pruned by the sync; this window bounds how stale a surfaced auction can be if
// a sync is missed (mirrors LISTING_FRESHNESS_DAYS for the buy-side asks).
export const AUCTION_FRESHNESS_DAYS = 3;

// Shape required to persist one ongoing auction observed by the Auction Sync.
export type NewAuction = {
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  // Current highest bid in its original currency — a moving asking price, never
  // a buyable one, so it never feeds a Derived Price.
  currentBid: number;
  currency: string;
  bidCount: number;
  // Absolute end instant, computed from eBay's relative "time left" caption at
  // scrape time. Immutable thereafter.
  endTime: Date;
  title: string;
  seller: string | null;
  // Item-location country, verified EU at ingest. null when no location line.
  location: string | null;
  // When the current bid + bid count were last read.
  bidCheckedAt: Date;
  seenAt: Date;
};
