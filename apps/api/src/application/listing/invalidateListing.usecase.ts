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
}
