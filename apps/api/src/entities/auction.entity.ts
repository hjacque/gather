export { AuctionEntity } from "@gather/types";

import { Platform } from "@gather/types";

export const AUCTION_FRESHNESS_DAYS = 3;

export type NewAuction = {
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  currentBid: number;
  currency: string;
  bidCount: number;
  endTime: Date;
  title: string;
  seller: string | null;
  location: string | null;
  bidCheckedAt: Date;
  seenAt: Date;
};
