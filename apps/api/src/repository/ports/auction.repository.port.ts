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
}
