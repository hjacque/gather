import { AuctionRepositoryPort } from "../../repository/ports/auction.repository.port";

export class ModerateAuctionUsecase {
  constructor(private readonly auctionRepository: AuctionRepositoryPort) {}

  invalidate(auctionId: string): Promise<void> {
    return this.auctionRepository.markAuctionInvalid(auctionId);
  }

  async invalidateByItem(auctionId: string): Promise<void> {
    const auction = await this.auctionRepository.getAuctionById(auctionId);
    if (!auction) return;
    await this.auctionRepository.markAuctionsInvalidByItemId(
      auction.platform,
      auction.itemId,
    );
  }

  editGrade(auctionId: string, psaGrade: number): Promise<void> {
    return this.auctionRepository.updateAuctionGrade(auctionId, psaGrade);
  }
}
