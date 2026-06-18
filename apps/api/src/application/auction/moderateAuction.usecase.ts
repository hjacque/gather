import { AuctionRepositoryPort } from "../../repository/ports/auction.repository.port";

// User moderation of a scraped Auction from the Live Auctions feed: flag one as
// not matching its card (drops it from the feed), or correct its scraped PSA
// grade. Both edits are persisted on the Auction row and carried forward by
// itemId across the full-replacement Auction Sync, so a later re-sync that still
// sees the item keeps the moderation.
export class ModerateAuctionUsecase {
  constructor(private readonly auctionRepository: AuctionRepositoryPort) {}

  invalidate(auctionId: string): Promise<void> {
    return this.auctionRepository.markAuctionInvalid(auctionId);
  }

  editGrade(auctionId: string, psaGrade: number): Promise<void> {
    return this.auctionRepository.updateAuctionGrade(auctionId, psaGrade);
  }
}
