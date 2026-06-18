import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";

// Flag one active listing as not matching its card. It drops out of the read
// layer (card panel + opportunities buy-side); the flag is persisted on the
// Listing row and carried forward by itemId across the full-replacement sync,
// so a later refresh that still sees the item keeps it hidden.
export class InvalidateListingUsecase {
  constructor(private readonly listingRepository: ListingRepositoryPort) {}

  async execute(listingId: string): Promise<void> {
    await this.listingRepository.markListingInvalid(listingId);
  }

  // Flag every listing sharing this listing's eBay listing id (the listing may
  // appear under several cards' panels). Resolves the listing id off the row so
  // the caller only needs the listing id; a missing row is a no-op.
  async executeByItem(listingId: string): Promise<void> {
    const listing = await this.listingRepository.getListingById(listingId);
    if (!listing) return;
    await this.listingRepository.markListingsInvalidByItemId(
      listing.platform,
      listing.itemId,
    );
  }
}
