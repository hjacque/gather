import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";

export class InvalidateListingUsecase {
  constructor(private readonly listingRepository: ListingRepositoryPort) {}

  async execute(listingId: string): Promise<void> {
    await this.listingRepository.markListingInvalid(listingId);
  }

  async executeByItem(listingId: string): Promise<void> {
    const listing = await this.listingRepository.getListingById(listingId);
    if (!listing) return;
    await this.listingRepository.markListingsInvalidByItemId(
      listing.platform,
      listing.itemId,
    );
  }
}
