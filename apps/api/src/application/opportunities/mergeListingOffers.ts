import { CardEntity } from "../../entities/card.entity";
import { ListingEntity } from "../../entities/listing.entity";
import { convertToEur } from "../sale/eurConverter";

export type ListingOffer = {
  priceEur: number;
  source: "cardmarket" | "ebay";
  url: string | null;
  isBestOffer: boolean;
};

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
  listingsByCard: Map<string, ListingEntity[]>;
  usdToEur: number;
}): Map<string, Record<number, ListingOffer | null>> {
  const result = new Map<string, Record<number, ListingOffer | null>>();

  for (const card of cards) {
    const listings = listingsByCard.get(card.id) ?? [];

    const best: Record<number, ListingOffer> = {};
    for (const listing of listings) {
      if (listing.platform !== "cardmarket") continue;
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
