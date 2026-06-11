import {
  extractListingRow,
  RawListingRow,
} from "./listingRowExtractor";

const row = (over: Partial<RawListingRow> = {}): RawListingRow => ({
  listingId: "396556820656",
  title: "Cramorant 226/S-P Stamp Box Promo PSA 10",
  priceText: "$1,009.00",
  isBestOffer: false,
  sellerHref: null,
  sellerInfoText: null,
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
    });
  });

  it("keeps the Best Offer flag", () => {
    expect(extractListingRow(row({ isBestOffer: true }))?.isBestOffer).toBe(true);
  });

  it("detects EUR asks", () => {
    const result = extractListingRow(row({ priceText: "€850.00" }));
    expect(result?.currency).toBe("EUR");
    expect(result?.price).toBe(850);
  });

  it("rejects multi-variation price ranges", () => {
    expect(extractListingRow(row({ priceText: "$10.00 to $25.00" }))).toBeNull();
  });

  it("rejects the carousel ad placeholder row", () => {
    expect(
      extractListingRow(row({ title: "Shop on eBay", listingId: "3965568206561234" }))
    ).toBeNull();
  });

  it("rejects rows without a listing id or parseable price", () => {
    expect(extractListingRow(row({ listingId: null }))).toBeNull();
    expect(extractListingRow(row({ priceText: "Contact seller" }))).toBeNull();
  });

  it("strips the screen-reader suffix from titles", () => {
    expect(
      extractListingRow(
        row({ title: "Cramorant PSA 10 Opens in a new window or tab" })
      )?.title
    ).toBe("Cramorant PSA 10");
  });

  it("marks a seller with zero feedback as having no activity", () => {
    expect(
      extractListingRow(row({ sellerInfoText: "newbie 0% positive (0)" }))
        ?.sellerHasActivity
    ).toBe(false);
  });

  it("grants trust to a seller clearing the reputation bar", () => {
    expect(
      extractListingRow(row({ sellerInfoText: "psa 99.9% positive (580.2K)" }))
        ?.trustedSeller
    ).toBe(true);
  });
});
