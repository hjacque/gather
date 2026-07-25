import { Platform } from "@gather/types";
import { ListingEntity, NewListing } from "../../entities/listing.entity";

export abstract class ListingRepositoryPort {
  abstract replaceCardListings(
    cardId: string,
    platform: Platform,
    listings: NewListing[]
  ): Promise<void>;

  abstract getCardsListings(
    cardIds: string[],
    since: Date
  ): Promise<Map<string, ListingEntity[]>>;

  abstract markListingInvalid(listingId: string): Promise<void>;

  abstract markListingsInvalidByItemId(
    platform: Platform,
    itemId: string
  ): Promise<number>;

  abstract getListingById(listingId: string): Promise<ListingEntity | null>;

  abstract updateListingState(
    listingId: string,
    state: { price: number; currency: string; isBestOffer: boolean; seenAt: Date }
  ): Promise<void>;

  abstract deleteListing(listingId: string): Promise<void>;
}
