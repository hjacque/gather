import { extractListingRow, RawListingRow } from "./listingRowExtractor";

const row = (over: Partial<RawListingRow> = {}): RawListingRow => ({
  listingId: "396556820656",
  title: "Cramorant 226/S-P Stamp Box Promo PSA 10",
  priceText: "$1,009.00",
  isBestOffer: false,
  sellerHref: null,
  sellerInfoText: null,
  locationText: "de Allemagne",
  ...over,
});

describe("extractListingRow", () => {
  it("extracts a USD candidate from a typical active row", () => {
    const result = extractListingRow(row());
    expect(result).toEqual({
      itemId: "396556820656",
      title: "Cramorant 226/S-P Stamp Box Promo PSA 10",
      price: 1009,
      currency: "USD",
      isBestOffer: false,
      seller: null,
      trustedSeller: false,
      sellerHasActivity: true,
      location: "Allemagne",
      isEuLocation: true,
    });
  });

  it("parses the item location and flags EU vs non-EU provenance", () => {
    expect(extractListingRow(row({ locationText: "de Italie" }))).toMatchObject(
      {
        location: "Italie",
        isEuLocation: true,
      },
    );
    expect(extractListingRow(row({ locationText: "de Japon" }))).toMatchObject({
      location: "Japon",
      isEuLocation: false,
    });
    // No location line on the row → unverifiable provenance, treated as non-EU.
    expect(extractListingRow(row({ locationText: null }))).toMatchObject({
      location: null,
      isEuLocation: false,
    });
  });

  it("keeps the Best Offer flag", () => {
    expect(extractListingRow(row({ isBestOffer: true }))?.isBestOffer).toBe(
      true,
    );
  });

  it("detects EUR asks", () => {
    const result = extractListingRow(row({ priceText: "€850.00" }));
    expect(result?.currency).toBe("EUR");
    expect(result?.price).toBe(850);
  });

  it("parses ebay.fr French-formatted EUR prices", () => {
    expect(extractListingRow(row({ priceText: "120,00 EUR" }))?.price).toBe(
      120,
    );
    // Thousands grouped with a non-breaking space, comma decimal.
    const result = extractListingRow(row({ priceText: "2 499,00 EUR" }));
    expect(result?.price).toBe(2499);
    expect(result?.currency).toBe("EUR");
    expect(extractListingRow(row({ priceText: "7 500,00 EUR" }))?.price).toBe(
      7500,
    );
  });

  it("rejects multi-variation price ranges in either locale", () => {
    expect(
      extractListingRow(row({ priceText: "$10.00 to $25.00" })),
    ).toBeNull();
    expect(
      extractListingRow(row({ priceText: "10,00 EUR à 25,00 EUR" })),
    ).toBeNull();
  });

  it("rejects the carousel ad placeholder row", () => {
    expect(
      extractListingRow(
        row({ title: "Shop on eBay", listingId: "3965568206561234" }),
      ),
    ).toBeNull();
  });

  it("rejects rows without a listing id or parseable price", () => {
    expect(extractListingRow(row({ listingId: null }))).toBeNull();
    expect(extractListingRow(row({ priceText: "Contact seller" }))).toBeNull();
  });

  it("strips the screen-reader suffix from titles in either language", () => {
    expect(
      extractListingRow(
        row({ title: "Cramorant PSA 10 Opens in a new window or tab" }),
      )?.title,
    ).toBe("Cramorant PSA 10");
    expect(
      extractListingRow(
        row({
          title:
            "2022 POKEMON GO #053 DITTO-HOLO PSA 7La page s'ouvre dans une nouvelle fenêtre ou un nouvel onglet",
        }),
      )?.title,
    ).toBe("2022 POKEMON GO #053 DITTO-HOLO PSA 7");
  });

  it("marks a seller with zero feedback as having no activity", () => {
    expect(
      extractListingRow(row({ sellerInfoText: "newbie 0% positive (0)" }))
        ?.sellerHasActivity,
    ).toBe(false);
  });

  it("grants trust to a seller clearing the reputation bar", () => {
    expect(
      extractListingRow(row({ sellerInfoText: "psa 99.9% positive (580.2K)" }))
        ?.trustedSeller,
    ).toBe(true);
  });
});
