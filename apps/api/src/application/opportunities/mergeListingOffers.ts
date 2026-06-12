// Collapse the day's live listings into one offer per (card, grade): the
// cheapest live ask in EUR, whatever its platform. Pure — both the use case and
// the funnel diagnostic build their ranking input through this, so they cannot
// disagree on what "today's cheapest listing" means.
//
// CardMarket and eBay asks now share the Listing model, so this no longer
// special-cases a source: each listing rides along with its provenance
// (platform, item URL, Best Offer flag). An eBay Best Offer ask is buyable at
// face value but negotiable below it, which the UI surfaces. Asks in
// unsupported currencies (convertToEur → null) are skipped rather than
// mispriced.

import { CardEntity } from "../../entities/card.entity";
import { ListingEntity } from "../../entities/listing.entity";
import { convertToEur } from "../sale/eurConverter";

export type ListingOffer = {
  priceEur: number;
  source: "cardmarket" | "ebay";
  url: string | null;
  isBestOffer: boolean;
};

// eBay listings are scraped on ebay.fr (EU item-location filter); link back
// there so the item page shows its true EU origin + EUR price, not the ebay.com
// ships-to-Europe framing. CardMarket asks link to the card's curated page.
const listingUrl = (listing: ListingEntity, card: CardEntity): string | null =>
  listing.platform === "cardmarket"
    ? card.cardMarketLink
    : `https://www.ebay.fr/itm/${listing.itemId}`;

export function mergeListingOffers({
  cards,
  listingsByCard,
  usdToEur,
}: {
  cards: CardEntity[];
  // cardId → live listings across all platforms, as returned by
  // ListingRepositoryPort.getCardsListings.
  listingsByCard: Map<string, ListingEntity[]>;
  usdToEur: number;
}): Map<string, Record<number, ListingOffer | null>> {
  const result = new Map<string, Record<number, ListingOffer | null>>();

  for (const card of cards) {
    const listings = listingsByCard.get(card.id) ?? [];

    // Cheapest ask per grade, in EUR. Ties go to CardMarket: a firm ask with no
    // negotiation ambiguity. Since CardMarket is encountered for a grade at most
    // once, `<` (not `<=`) keeps it ahead of an equally-priced eBay ask seen
    // later only if CardMarket was seen first — so prefer it explicitly.
    const best: Record<number, ListingOffer> = {};
    for (const listing of listings) {
      const priceEur = convertToEur(listing.price, listing.currency, usdToEur);
      if (priceEur === null) continue;
      const source = listing.platform === "cardmarket" ? "cardmarket" : "ebay";
      const current = best[listing.psaGrade];
      const wins =
        !current ||
        priceEur < current.priceEur ||
        (priceEur === current.priceEur && source === "cardmarket");
      if (wins) {
        best[listing.psaGrade] = {
          priceEur,
          source,
          url: listingUrl(listing, card),
          isBestOffer: listing.isBestOffer,
        };
      }
    }

    const merged: Record<number, ListingOffer | null> = {};
    for (let grade = 1; grade <= 10; grade++) {
      merged[grade] = best[grade] ?? null;
    }
    result.set(card.id, merged);
  }

  return result;
}
