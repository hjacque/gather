import { CardEntity } from "../../entities/card.entity";
import { ListingEntity } from "../../entities/listing.entity";
import { Platform } from "@gather/types";
import { mergeListingOffers } from "./mergeListingOffers";

const NOW = new Date("2026-06-11T12:00:00Z");
const RATE = 0.9;

const card = (id: string, overrides: Partial<CardEntity> = {}): CardEntity => ({
  id,
  name: `Card ${id}`,
  foilPattern: null,
  imageUrl: null,
  releaseDate: null,
  cardSetId: "set-1",
  cardMarketLink: `https://www.cardmarket.com/card-${id}`,
  psaLink: null,
  ebayLink: null,
  ebayFrLink: null,
  number: null,
  note: null,
  tags: [],
  regions: [],
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

let seq = 0;
const listing = (
  cardId: string,
  psaGrade: number,
  price: number,
  overrides: Partial<ListingEntity> = {},
): ListingEntity => {
  seq++;
  const platform: Platform = overrides.platform ?? "ebay";
  return {
    id: `listing-${seq}`,
    cardId,
    platform,
    itemId: `item-${seq}`,
    psaGrade,
    price,
    currency: platform === "cardmarket" ? "EUR" : "USD",
    title: `Card ${cardId} PSA ${psaGrade}`,
    isBestOffer: false,
    seller: null,
    location: platform === "cardmarket" ? null : "Allemagne",
    seenAt: NOW,
    invalidatedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
};

const cm = (
  cardId: string,
  psaGrade: number,
  priceEur: number,
  overrides: Partial<ListingEntity> = {},
): ListingEntity =>
  listing(cardId, psaGrade, priceEur, { platform: "cardmarket", ...overrides });

const merge = (init: { cards: CardEntity[]; listings?: ListingEntity[] }) => {
  const listingsByCard = new Map<string, ListingEntity[]>();
  for (const l of init.listings ?? []) {
    const list = listingsByCard.get(l.cardId);
    if (list) list.push(l);
    else listingsByCard.set(l.cardId, [l]);
  }
  return mergeListingOffers({
    cards: init.cards,
    listingsByCard,
    usdToEur: RATE,
  });
};

describe("mergeListingOffers", () => {
  it("keeps the CardMarket offer when it is the only source", () => {
    const result = merge({
      cards: [card("a")],
      listings: [cm("a", 10, 100)],
    });
    expect(result.get("a")![10]).toEqual({
      priceEur: 100,
      source: "cardmarket",
      url: "https://www.cardmarket.com/card-a",
      isBestOffer: false,
    });
    expect(result.get("a")![9]).toBeNull();
  });

  it("leaves a grade empty when only eBay has a listing for it", () => {
    const result = merge({
      cards: [card("a")],
      listings: [listing("a", 10, 100, { itemId: "396556820656" })],
    });
    expect(result.get("a")![10]).toBeNull();
  });

  it("ignores a cheaper eBay ask in favour of the CardMarket one", () => {
    const result = merge({
      cards: [card("a")],
      listings: [cm("a", 10, 100), listing("a", 10, 50)],
    });
    expect(result.get("a")![10]!.source).toBe("cardmarket");
    expect(result.get("a")![10]!.priceEur).toBe(100);
  });

  it("picks the cheapest CardMarket ask per grade and carries its Best Offer flag", () => {
    const result = merge({
      cards: [card("a")],
      listings: [
        cm("a", 10, 120),
        cm("a", 10, 100, { isBestOffer: true }),
      ],
    });
    expect(result.get("a")![10]).toEqual({
      priceEur: 100,
      source: "cardmarket",
      url: "https://www.cardmarket.com/card-a",
      isBestOffer: true,
    });
  });

  it("skips asks in unsupported currencies rather than mispricing them", () => {
    const result = merge({
      cards: [card("a")],
      listings: [cm("a", 10, 100, { currency: "GBP" })],
    });
    expect(result.get("a")![10]).toBeNull();
  });

  it("returns an all-null record for a card with no offers anywhere", () => {
    const result = merge({ cards: [card("a")] });
    for (let grade = 1; grade <= 10; grade++) {
      expect(result.get("a")![grade]).toBeNull();
    }
  });
});
