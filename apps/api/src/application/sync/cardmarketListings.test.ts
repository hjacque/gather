import {
  cardmarketArticlesToListings,
  cardmarketListingItemId,
  mirrorCardmarketListings,
} from "./cardmarketListings";
import { CardmarketArticle, CardmarketArticles } from "./sources/priceSource.port";
import { NewListing } from "../../entities/listing.entity";
import { Platform } from "@gather/types";

const SEEN_AT = new Date("2026-06-12T00:00:00Z");

const article = (over: Partial<CardmarketArticle> = {}): CardmarketArticle => ({
  articleId: null,
  psaGrade: 10,
  price: 100,
  seller: null,
  comment: null,
  ...over,
});

describe("cardmarketArticlesToListings", () => {
  it("builds one EUR cardmarket listing per scraped article, not one per grade", () => {
    const listings = cardmarketArticlesToListings(
      "card-a",
      [
        article({ articleId: "111", psaGrade: 10, price: 140, seller: "bob" }),
        article({ articleId: "222", psaGrade: 9, price: 50, seller: "alice" }),
        article({ articleId: "333", psaGrade: 10, price: 120, seller: "carol" }),
      ],
      SEEN_AT,
    );

    expect(listings).toEqual([
      {
        cardId: "card-a",
        platform: "cardmarket",
        itemId: "cardmarket-222",
        psaGrade: 9,
        price: 50,
        currency: "EUR",
        title: "CardMarket PSA 9 — alice",
        isBestOffer: false,
        seller: "alice",
        location: null,
        seenAt: SEEN_AT,
      },
      {
        cardId: "card-a",
        platform: "cardmarket",
        itemId: "cardmarket-333",
        psaGrade: 10,
        price: 120,
        currency: "EUR",
        title: "CardMarket PSA 10 — carol",
        isBestOffer: false,
        seller: "carol",
        location: null,
        seenAt: SEEN_AT,
      },
      {
        cardId: "card-a",
        platform: "cardmarket",
        itemId: "cardmarket-111",
        psaGrade: 10,
        price: 140,
        currency: "EUR",
        title: "CardMarket PSA 10 — bob",
        isBestOffer: false,
        seller: "bob",
        location: null,
        seenAt: SEEN_AT,
      },
    ]);
  });

  it("skips non-positive prices and out-of-range grades", () => {
    const listings = cardmarketArticlesToListings(
      "card-a",
      [
        article({ psaGrade: 8, price: 0 }),
        article({ psaGrade: 11, price: 30 }),
        article({ psaGrade: 10, price: 75 }),
      ],
      SEEN_AT,
    );

    expect(listings.map((l) => l.psaGrade)).toEqual([10]);
  });

  it("keeps the article comment in the title", () => {
    const [listing] = cardmarketArticlesToListings(
      "card-a",
      [article({ seller: "alice", comment: "PSA 10 GEM MINT" })],
      SEEN_AT,
    );
    expect(listing.title).toBe("CardMarket PSA 10 — alice — PSA 10 GEM MINT");
  });

  it("keys the itemId on CardMarket's article id for invalidation carry-forward", () => {
    expect(cardmarketListingItemId(article({ articleId: "123456" }))).toBe(
      "cardmarket-123456",
    );
  });

  it("falls back to a content key when a row carries no article id", () => {
    expect(
      cardmarketListingItemId(
        article({ psaGrade: 9, price: 42.5, seller: "Big Card Shop" }),
      ),
    ).toBe("cardmarket-psa9-big-card-shop-4250");
  });

  it("suffixes colliding itemIds instead of dropping a real offer", () => {
    const listings = cardmarketArticlesToListings(
      "card-a",
      [
        article({ psaGrade: 10, price: 100, seller: "alice" }),
        article({ psaGrade: 10, price: 100, seller: "alice" }),
      ],
      SEEN_AT,
    );

    expect(listings.map((l) => l.itemId)).toEqual([
      "cardmarket-psa10-alice-10000",
      "cardmarket-psa10-alice-10000-2",
    ]);
  });
});

describe("mirrorCardmarketListings", () => {
  // Captures the replaceCardListings call both sync paths route through.
  const fakeRepo = () => {
    const calls: {
      cardId: string;
      platform: Platform;
      listings: NewListing[];
    }[] = [];
    return {
      calls,
      replaceCardListings: async (
        cardId: string,
        platform: Platform,
        listings: NewListing[],
      ) => {
        calls.push({ cardId, platform, listings });
      },
    } as any;
  };

  it("replaces the card's cardmarket listings from the scraped articles", async () => {
    const articles: CardmarketArticles = [
      article({ articleId: "1", psaGrade: 9, price: 50 }),
      article({ articleId: "2", psaGrade: 10, price: 120 }),
      article({ articleId: "3", psaGrade: 10, price: 130 }),
    ];
    const repo = fakeRepo();

    const written = await mirrorCardmarketListings(
      repo,
      "card-a",
      articles,
      SEEN_AT,
    );

    expect(repo.calls).toHaveLength(1);
    expect(repo.calls[0].cardId).toBe("card-a");
    expect(repo.calls[0].platform).toBe("cardmarket");
    expect(repo.calls[0].listings).toBe(written);
    expect(written.map((l) => l.psaGrade)).toEqual([9, 10, 10]);
    expect(written.map((l) => l.price)).toEqual([50, 120, 130]);
  });

  it("replaces with an empty set when the card has no cardmarket articles (prunes stale rows)", async () => {
    const repo = fakeRepo();
    const written = await mirrorCardmarketListings(repo, "card-a", [], SEEN_AT);
    expect(repo.calls[0].listings).toEqual([]);
    expect(written).toEqual([]);
  });
});
