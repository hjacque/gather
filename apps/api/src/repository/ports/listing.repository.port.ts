import { Platform } from "@gather/types";
import { ListingEntity, NewListing } from "../../entities/listing.entity";

export abstract class ListingRepositoryPort {
  // Atomically replace a card's listings for one platform with the given set.
  // Full replacement is the staleness model: anything the latest sync no longer
  // sees live (sold, ended, removed) is pruned.
  abstract replaceCardListings(
    cardId: string,
    platform: Platform,
    listings: NewListing[]
  ): Promise<void>;

  // All non-invalidated listings seen on or after `since`, grouped by card id.
  // Cards with no listings are absent from the map.
  abstract getCardsListings(
    cardIds: string[],
    since: Date
  ): Promise<Map<string, ListingEntity[]>>;

  // Flag one listing as not matching its card. It drops out of getCardsListings
  // (card panel + opportunities) and the flag is carried forward by itemId on
  // re-sync so a refresh that still sees the item keeps it hidden.
  abstract markListingInvalid(listingId: string): Promise<void>;
}
