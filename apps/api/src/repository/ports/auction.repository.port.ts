import { Platform } from "@gather/types";
import { AuctionEntity, NewAuction } from "../../entities/auction.entity";

export abstract class AuctionRepositoryPort {
  abstract replaceCardAuctions(
    cardId: string,
    platform: Platform,
    auctions: NewAuction[]
  ): Promise<void>;

  abstract getOpenAuctions(now: Date): Promise<AuctionEntity[]>;

  abstract getAuctionById(auctionId: string): Promise<AuctionEntity | null>;

  abstract updateAuctionBid(
    auctionId: string,
    state: {
      currentBid: number;
      currency: string;
      bidCount: number;
      bidCheckedAt: Date;
    }
  ): Promise<void>;

  abstract deleteAuction(auctionId: string): Promise<void>;

  abstract markAuctionInvalid(auctionId: string): Promise<void>;

  abstract markAuctionsInvalidByItemId(
    platform: Platform,
    itemId: string
  ): Promise<number>;

  abstract updateAuctionGrade(auctionId: string, psaGrade: number): Promise<void>;

  abstract pruneEndedAuctions(now: Date): Promise<number>;
}
