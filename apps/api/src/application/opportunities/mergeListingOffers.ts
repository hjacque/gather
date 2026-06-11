// Merge the day's buy-side sources into one offer per (card, grade): the
// cheaper of the CardMarket listing price and the cheapest live eBay
// Buy-It-Now ask, in EUR. Pure — both the use case and the funnel diagnostic
// build their ranking input through this, so they cannot disagree on what
// "today's cheapest listing" means.
//
// eBay asks ride along with their provenance (item URL, Best Offer flag): an
// ask is buyable at face value, but a Best Offer one is negotiable below it,
// which the UI surfaces. Asks in unsupported currencies (convertToEur → null)
// are skipped rather than mispriced.

import { CardEntity } from "../../entities/card.entity";
import { ListingEntity } from "../../entities/listing.entity";
import { convertToEur } from "../sale/eurConverter";

export type ListingOffer = {
  priceEur: number;
  source: "cardmarket" | "ebay";
  url: string | null;
  isBestOffer: boolean;
};

// Listings are scraped on ebay.fr (EU item-location filter); link back there so
// the item page shows its true EU origin + EUR price, not the ebay.com
// ships-to-Europe framing.
const ebayItemUrl = (itemId: string): string =>
  `https://www.ebay.fr/itm/${itemId}`;

export function mergeListingOffers({
  cards,
  cardmarketPricesByCard,
  ebayListingsByCard,
  usdToEur,
}: {
  cards: CardEntity[];
  // cardId → grade → today's CardMarket listing price (EUR), as returned by
  // PriceRepositoryPort.getCardsListingGradePricesByDate.
  cardmarketPricesByCard: Map<string, Record<number, number | null>>;
  // cardId → live eBay listings, as returned by
  // ListingRepositoryPort.getCardsListings.
  ebayListingsByCard: Map<string, ListingEntity[]>;
  usdToEur: number;
}): Map<string, Record<number, ListingOffer | null>> {
  const result = new Map<string, Record<number, ListingOffer | null>>();

  for (const card of cards) {
    const cardmarket = cardmarketPricesByCard.get(card.id) ?? {};
    const ebayListings = ebayListingsByCard.get(card.id) ?? [];

    // Cheapest eBay ask per grade, in EUR.
    const ebayBest: Record<number, ListingOffer> = {};
    for (const listing of ebayListings) {
      const priceEur = convertToEur(listing.price, listing.currency, usdToEur);
      if (priceEur === null) continue;
      const current = ebayBest[listing.psaGrade];
      if (!current || priceEur < current.priceEur) {
        ebayBest[listing.psaGrade] = {
          priceEur,
          source: "ebay",
          url: ebayItemUrl(listing.itemId),
          isBestOffer: listing.isBestOffer,
        };
      }
    }

    const merged: Record<number, ListingOffer | null> = {};
    for (let grade = 1; grade <= 10; grade++) {
      const cardmarketPrice = cardmarket[grade] ?? null;
      const ebayOffer = ebayBest[grade] ?? null;

      const cardmarketOffer: ListingOffer | null =
        cardmarketPrice === null
          ? null
          : {
              priceEur: cardmarketPrice,
              source: "cardmarket",
              url: card.cardMarketLink,
              isBestOffer: false,
            };

      // Ties go to CardMarket: a firm ask with no negotiation ambiguity.
      merged[grade] =
        cardmarketOffer === null
          ? ebayOffer
          : ebayOffer === null || cardmarketOffer.priceEur <= ebayOffer.priceEur
            ? cardmarketOffer
            : ebayOffer;
    }
    result.set(card.id, merged);
  }

  return result;
}
