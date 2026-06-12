import { NewListing } from "../../entities/listing.entity";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { CardmarketGradePrices } from "./sources/priceSource.port";

// CardMarket is scraped as one lowest ask per PSA grade (CardMarketGradedSource
// keeps only the minimum), so each grade maps to a single synthetic Listing
// rather than a row per real article. The itemId is stable per (card, grade) so
// full-replacement re-sync carries a user's invalidation forward, exactly like
// eBay listings. Prices are already EUR off CardMarket.
export const cardmarketListingItemId = (psaGrade: number): string =>
  `cardmarket-psa${psaGrade}`;

// Build the cardmarket Listing rows for one card from its scraped grade prices.
// `gradePrices` is grade → lowest ask in EUR; grades with no price are skipped.
export const cardmarketGradePricesToListings = (
  cardId: string,
  gradePrices: Map<number, number>,
  seenAt: Date
): NewListing[] => {
  const listings: NewListing[] = [];
  for (let grade = 1; grade <= 10; grade++) {
    const price = gradePrices.get(grade);
    if (price === undefined || price <= 0) continue;
    listings.push({
      cardId,
      platform: "cardmarket",
      itemId: cardmarketListingItemId(grade),
      psaGrade: grade,
      price,
      currency: "EUR",
      title: `CardMarket PSA ${grade} lowest ask`,
      isBestOffer: false,
      seller: null,
      seenAt,
    });
  }
  return listings;
};

// Mirror a card's freshly scraped CardMarket grade asks into the unified
// Listing model. Shared by every sync path (full, per-set, per-card) so they
// can't drift on what a CardMarket listing is. Full per-card replacement prunes
// grades that dropped off, exactly like the eBay listings sync.
export const mirrorCardmarketListings = async (
  listingRepository: ListingRepositoryPort,
  cardId: string,
  gradePrices: CardmarketGradePrices,
  seenAt: Date
): Promise<NewListing[]> => {
  const listings = cardmarketGradePricesToListings(cardId, gradePrices, seenAt);
  await listingRepository.replaceCardListings(cardId, "cardmarket", listings);
  return listings;
};
