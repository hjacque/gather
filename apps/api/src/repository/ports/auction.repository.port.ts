import { Platform } from "@gather/types";
import { AuctionEntity, NewAuction } from "../../entities/auction.entity";

export abstract class AuctionRepositoryPort {
  // Atomically replace a card's auctions for one platform with the given set.
  // Full replacement is the staleness model: auctions the latest sync no longer
  // sees live are dropped.
  abstract replaceCardAuctions(
    cardId: string,
    platform: Platform,
    auctions: NewAuction[]
  ): Promise<void>;

  // All ongoing auctions across all cards (endTime in the future), newest-ending
  // last is not guaranteed — the read layer sorts. A freshly-ended auction is
  // excluded immediately by the endTime filter, before any prune runs.
  abstract getOpenAuctions(now: Date): Promise<AuctionEntity[]>;

  // One auction by id, or null. Used by the per-row bid refresh.
  abstract getAuctionById(auctionId: string): Promise<AuctionEntity | null>;

  // Update an auction's live bid state after re-reading its item page.
  abstract updateAuctionBid(
    auctionId: string,
    state: {
      currentBid: number;
      currency: string;
      bidCount: number;
      bidCheckedAt: Date;
    }
  ): Promise<void>;

  // Hard-delete an auction whose item page shows it has ended.
  abstract deleteAuction(auctionId: string): Promise<void>;

  // Flag an auction as not matching its card. It drops out of the feed and the
  // flag is carried forward by itemId on re-sync.
  abstract markAuctionInvalid(auctionId: string): Promise<void>;

  // Flag every auction sharing one eBay listing id (across all cards) as
  // invalid. The same listing can surface under several cards' feeds; this drops
  // it from all of them at once. Returns the number of rows flagged.
  abstract markAuctionsInvalidByItemId(
    platform: Platform,
    itemId: string
  ): Promise<number>;

  // Correct an auction's scraped PSA grade. The fix is carried forward by itemId
  // on re-sync so the re-parsed grade doesn't overwrite it.
  abstract updateAuctionGrade(auctionId: string, psaGrade: number): Promise<void>;

  // Hard-delete all auctions whose endTime has passed. Storage hygiene run by
  // the Auction Sync; reads already exclude these via the endTime > now filter.
  // Returns the number of rows pruned.
  abstract pruneEndedAuctions(now: Date): Promise<number>;
}
