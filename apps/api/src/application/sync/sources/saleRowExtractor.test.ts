import {
  extractSaleRow,
  parseSellerFeedbackCount,
  parseSellerFeedbackPct,
  RawSaleRow,
} from "./saleRowExtractor";

const row = (over: Partial<RawSaleRow> = {}): RawSaleRow => ({
  listingId: "396556820656",
  title: "Cramorant 226/S-P Stamp Box Promo PSA 10",
  priceText: "$1,009.00",
  soldText: "Sold May 31, 2026",
  isBestOffer: false,
  sellerHref: null,
  sellerInfoText: null,
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
      seller: null,
      trustedSeller: false,
      sellerHasActivity: true,
    });
  });

  it("parses the store seller slug from the seller-logo href", () => {
    expect(
      extractSaleRow(row({ sellerHref: "http://stores.ebay.com/psa" }))?.seller,
    ).toBe("psa");
    expect(
      extractSaleRow(row({ sellerHref: "https://www.ebay.com/str/PSA" }))?.seller,
    ).toBe("psa");
  });

  it("has a null seller when the row carries no store link", () => {
    expect(extractSaleRow(row({ sellerHref: null }))?.seller).toBeNull();
  });

  it("marks a non-store seller with zero feedback as having no activity", () => {
    expect(
      extractSaleRow(row({ sellerHref: null, sellerInfoText: "newbie 0% positive (0)" }))
        ?.sellerHasActivity,
    ).toBe(false);
  });

  it("keeps a non-store seller with feedback as having activity", () => {
    expect(
      extractSaleRow(row({ sellerHref: null, sellerInfoText: "dxbdxb 99.3% positive (460)" }))
        ?.sellerHasActivity,
    ).toBe(true);
  });

  it("leaves a non-store seller with no parseable feedback line as having activity", () => {
    expect(
      extractSaleRow(row({ sellerHref: null, sellerInfoText: null }))?.sellerHasActivity,
    ).toBe(true);
  });

  it("classifies a store seller's activity from the row too (zero feedback → false)", () => {
    expect(
      extractSaleRow(
        row({ sellerHref: "https://www.ebay.com/str/psa", sellerInfoText: "psa 0% positive (0)" }),
      )?.sellerHasActivity,
    ).toBe(false);
  });

  it("trusts a non-store seller clearing the reputation bar (5000+, 99.5%+)", () => {
    expect(
      extractSaleRow(
        row({ sellerHref: null, sellerInfoText: "bigseller 99.9% positive (44.1K)" }),
      )?.trustedSeller,
    ).toBe(true);
  });

  it.each([
    ["below the feedback floor", "smallseller 100% positive (460)"],
    ["below the positive-rate floor", "spammy 96.2% positive (50K)"],
  ])("does not trust a non-store seller %s", (_label, sellerInfoText) => {
    expect(
      extractSaleRow(row({ sellerHref: null, sellerInfoText }))?.trustedSeller,
    ).toBe(false);
  });

  it("trusts a store seller from the row too (clears the reputation bar)", () => {
    expect(
      extractSaleRow(
        row({ sellerHref: "https://www.ebay.com/str/psa", sellerInfoText: "psa 99.9% positive (580.2K)" }),
      )?.trustedSeller,
    ).toBe(true);
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

describe("parseSellerFeedbackCount", () => {
  it.each([
    ["dxbdxb 99.3% positive (460)", 460],
    ["psa 99.9% positive (580.2K)", 580_200],
    ["bigstore 99.9% positive (1.4M)", 1_400_000],
    ["mid 99.7% positive (1K)", 1_000],
    ["comma 100% positive (12,345)", 12_345],
    ["newbie 0% positive (0)", 0],
  ])("parses %s -> %p", (text, expected) => {
    expect(parseSellerFeedbackCount(text)).toBe(expected);
  });

  it("returns null when there is no parenthetical count", () => {
    expect(parseSellerFeedbackCount("seller with no feedback yet")).toBeNull();
    expect(parseSellerFeedbackCount(null)).toBeNull();
  });
});

describe("parseSellerFeedbackPct", () => {
  it.each([
    ["dxbdxb 99.3% positive (460)", 99.3],
    ["maokayangcards 100% positive (387)", 100],
    ["newbie 0% positive (0)", 0],
  ])("parses %s -> %p", (text, expected) => {
    expect(parseSellerFeedbackPct(text)).toBe(expected);
  });

  it("returns null when there is no positive-feedback rate", () => {
    expect(parseSellerFeedbackPct("seller with no feedback yet")).toBeNull();
    expect(parseSellerFeedbackPct(null)).toBeNull();
  });
});
