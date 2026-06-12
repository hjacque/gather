import {
  cardmarketGradePricesToListings,
  cardmarketListingItemId,
  mirrorCardmarketListings,
} from "./cardmarketListings";
import { DerivedPrices } from "./priceAggregator";
import { NewListing } from "../../entities/listing.entity";
import { Platform } from "@gather/types";

const SEEN_AT = new Date("2026-06-12T00:00:00Z");

describe("cardmarketGradePricesToListings", () => {
  it("builds one EUR cardmarket listing per priced grade", () => {
    const listings = cardmarketGradePricesToListings(
      "card-a",
      new Map([
        [9, 50],
        [10, 120],
      ]),
      SEEN_AT
    );

    expect(listings).toEqual([
      {
        cardId: "card-a",
        platform: "cardmarket",
        itemId: cardmarketListingItemId(9),
        psaGrade: 9,
        price: 50,
        currency: "EUR",
        title: "CardMarket PSA 9 lowest ask",
        isBestOffer: false,
        seller: null,
        seenAt: SEEN_AT,
      },
      {
        cardId: "card-a",
        platform: "cardmarket",
        itemId: cardmarketListingItemId(10),
        psaGrade: 10,
        price: 120,
        currency: "EUR",
        title: "CardMarket PSA 10 lowest ask",
        isBestOffer: false,
        seller: null,
        seenAt: SEEN_AT,
      },
    ]);
  });

  it("skips grades with no price or a non-positive price", () => {
    const listings = cardmarketGradePricesToListings(
      "card-a",
      new Map([
        [8, 0],
        [10, 75],
      ]),
      SEEN_AT
    );

    expect(listings.map((l) => l.psaGrade)).toEqual([10]);
  });

  it("gives each grade a stable itemId for invalidation carry-forward", () => {
    expect(cardmarketListingItemId(10)).toBe("cardmarket-psa10");
  });
});

describe("mirrorCardmarketListings", () => {
  // Captures the replaceCardListings call both sync paths route through.
  const fakeRepo = () => {
    const calls: { cardId: string; platform: Platform; listings: NewListing[] }[] = [];
    return {
      calls,
      replaceCardListings: async (
        cardId: string,
        platform: Platform,
        listings: NewListing[]
      ) => {
        calls.push({ cardId, platform, listings });
      },
    } as any;
  };

  it("extracts cardmarket grade prices from DerivedPrices and replaces the card's cardmarket listings", async () => {
    const prices: DerivedPrices = new Map([
      ["cardmarketPsa9", 50],
      ["cardmarketPsa10", 120],
      // Non-listing price types and missing grades are ignored.
      ["marketSalePsa10", 999],
      ["cardmarketPsa8", undefined],
    ] as any);
    const repo = fakeRepo();

    const written = await mirrorCardmarketListings(repo, "card-a", prices, SEEN_AT);

    expect(repo.calls).toHaveLength(1);
    expect(repo.calls[0].cardId).toBe("card-a");
    expect(repo.calls[0].platform).toBe("cardmarket");
    expect(repo.calls[0].listings).toBe(written);
    expect(written.map((l) => l.psaGrade)).toEqual([9, 10]);
    expect(written.map((l) => l.price)).toEqual([50, 120]);
  });

  it("replaces with an empty set when the card has no cardmarket prices (prunes stale rows)", async () => {
    const repo = fakeRepo();
    const written = await mirrorCardmarketListings(
      repo,
      "card-a",
      new Map() as DerivedPrices,
      SEEN_AT
    );
    expect(repo.calls[0].listings).toEqual([]);
    expect(written).toEqual([]);
  });
});
