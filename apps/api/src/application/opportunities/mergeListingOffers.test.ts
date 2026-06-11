import { CardEntity } from "../../entities/card.entity";
import { ListingEntity } from "../../entities/listing.entity";
import { mergeListingOffers } from "./mergeListingOffers";

const NOW = new Date("2026-06-11T12:00:00Z");
const RATE = 0.9; // EUR per USD

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
  overrides: Partial<ListingEntity> = {}
): ListingEntity => {
  seq++;
  return {
    id: `listing-${seq}`,
    cardId,
    platform: "ebay",
    itemId: `item-${seq}`,
    psaGrade,
    price,
    currency: "USD",
    title: `Card ${cardId} PSA ${psaGrade}`,
    isBestOffer: false,
    seller: null,
    seenAt: NOW,
    invalidatedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
};

const merge = (init: {
  cards: CardEntity[];
  cardmarket?: Record<string, Record<number, number | null>>;
  ebay?: ListingEntity[];
}) => {
  const ebayListingsByCard = new Map<string, ListingEntity[]>();
  for (const l of init.ebay ?? []) {
    const list = ebayListingsByCard.get(l.cardId);
    if (list) list.push(l);
    else ebayListingsByCard.set(l.cardId, [l]);
  }
  return mergeListingOffers({
    cards: init.cards,
    cardmarketPricesByCard: new Map(Object.entries(init.cardmarket ?? {})),
    ebayListingsByCard,
    usdToEur: RATE,
  });
};

describe("mergeListingOffers", () => {
  it("keeps the CardMarket offer when it is the only source", () => {
    const result = merge({
      cards: [card("a")],
      cardmarket: { a: { 10: 100 } },
    });
    expect(result.get("a")![10]).toEqual({
      priceEur: 100,
      source: "cardmarket",
      url: "https://www.cardmarket.com/card-a",
      isBestOffer: false,
    });
    expect(result.get("a")![9]).toBeNull();
  });

  it("fills a grade CardMarket has no listing for from eBay, converted to EUR", () => {
    const result = merge({
      cards: [card("a")],
      ebay: [listing("a", 10, 100, { itemId: "396556820656" })],
    });
    expect(result.get("a")![10]).toEqual({
      priceEur: 90, // 100 USD × 0.9
      source: "ebay",
      url: "https://www.ebay.fr/itm/396556820656",
      isBestOffer: false,
    });
  });

  it("takes the cheaper source per grade, in EUR terms", () => {
    const result = merge({
      cards: [card("a")],
      cardmarket: { a: { 10: 100, 9: 50 } },
      ebay: [listing("a", 10, 100), listing("a", 9, 100)],
    });
    // grade 10: eBay 100 USD = 90 EUR beats CardMarket 100 EUR.
    expect(result.get("a")![10]!.source).toBe("ebay");
    expect(result.get("a")![10]!.priceEur).toBe(90);
    // grade 9: CardMarket 50 EUR beats eBay 90 EUR.
    expect(result.get("a")![9]!.source).toBe("cardmarket");
    expect(result.get("a")![9]!.priceEur).toBe(50);
  });

  it("picks the cheapest eBay ask per grade and carries its Best Offer flag", () => {
    const result = merge({
      cards: [card("a")],
      ebay: [
        listing("a", 10, 120),
        listing("a", 10, 100, { itemId: "cheap", isBestOffer: true }),
      ],
    });
    expect(result.get("a")![10]).toEqual({
      priceEur: 90,
      source: "ebay",
      url: "https://www.ebay.fr/itm/cheap",
      isBestOffer: true,
    });
  });

  it("breaks ties toward CardMarket", () => {
    const result = merge({
      cards: [card("a")],
      cardmarket: { a: { 10: 90 } },
      ebay: [listing("a", 10, 100)], // = 90 EUR
    });
    expect(result.get("a")![10]!.source).toBe("cardmarket");
  });

  it("skips eBay asks in unsupported currencies rather than mispricing them", () => {
    const result = merge({
      cards: [card("a")],
      ebay: [listing("a", 10, 100, { currency: "GBP" })],
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
