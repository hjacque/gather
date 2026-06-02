import { extractSaleRow, RawSaleRow } from "./saleRowExtractor";

const row = (over: Partial<RawSaleRow> = {}): RawSaleRow => ({
  listingId: "396556820656",
  title: "Cramorant 226/S-P Stamp Box Promo PSA 10",
  priceText: "$1,009.00",
  soldText: "Sold May 31, 2026",
  isBestOffer: false,
  ...over,
});

describe("extractSaleRow", () => {
  it("extracts a USD candidate from a typical sold row", () => {
    const result = extractSaleRow(row());
    expect(result).toEqual({
      itemId: "396556820656",
      title: "Cramorant 226/S-P Stamp Box Promo PSA 10",
      price: 1009,
      currency: "USD",
      soldAt: new Date("2026-05-31T00:00:00Z"),
      isBestOffer: false,
    });
  });

  it("strips thousands separators from the price", () => {
    expect(extractSaleRow(row({ priceText: "US $6,529.04" }))?.price).toBe(6529.04);
  });

  it.each([
    ["$850.00", "USD"],
    ["€850,00", "EUR"],
    ["£740.00", "GBP"],
    ["C $1,200.00", "CAD"],
    ["AU $990.00", "AUD"],
  ])("detects currency for %s", (priceText, currency) => {
    expect(extractSaleRow(row({ priceText }))?.currency).toBe(currency);
  });

  it("carries the Best Offer flag through", () => {
    expect(extractSaleRow(row({ isBestOffer: true }))?.isBestOffer).toBe(true);
  });

  it("drops carousel ad rows (title 'Shop on eBay')", () => {
    expect(extractSaleRow(row({ title: "Shop on eBay" }))).toBeNull();
  });

  it("drops rows with no listing id", () => {
    expect(extractSaleRow(row({ listingId: null }))).toBeNull();
  });

  it("drops rows with an unparseable price or sold date", () => {
    expect(extractSaleRow(row({ priceText: "" }))).toBeNull();
    expect(extractSaleRow(row({ soldText: "Brand New" }))).toBeNull();
  });

  it("drops rows in an unsupported currency symbol", () => {
    expect(extractSaleRow(row({ priceText: "¥120,000" }))).toBeNull();
  });
});
