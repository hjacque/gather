import {
  parseItemPageSellerFeedback,
  parseItemPageState,
  RawItemPage,
} from "./listingItemPage";

const raw = (over: Partial<RawItemPage> = {}): RawItemPage => ({
  title: "Some Pokemon Card PSA 10 | eBay",
  primaryText: "415,00 EUR",
  binText: "415,00 EUR",
  bodyText: "Achat immédiat",
  sellerInfoText: "vendeurpro (12 345) 99,2% d'évaluations positives",
  ...over,
});

describe("parseItemPageState", () => {
  it("reports a gone listing from the eBay error page title", () => {
    expect(parseItemPageState(raw({ title: "Error Page | eBay", primaryText: "", binText: "" })))
      .toEqual({ status: "gone" });
  });

  it("reads a native-EUR active listing", () => {
    expect(parseItemPageState(raw())).toEqual({
      status: "active",
      priceEur: 415,
      isBestOffer: false,
    });
  });

  it("prefers the converted EUR value for a foreign-currency listing", () => {
    const r = raw({
      primaryText: "792,00 CAD",
      binText: "792,00 CADEnviron492,44 EUR",
      bodyText: "Achat immédiat",
    });
    expect(parseItemPageState(r)).toEqual({
      status: "active",
      priceEur: 492.44,
      isBestOffer: false,
    });
  });

  it("flags Best Offer from 'ou Offre directe'", () => {
    const r = raw({
      primaryText: "1 800,00 USDou Offre directe",
      binText: "1 800,00 USDou Offre directeEnviron1 560,47 EUR",
    });
    expect(parseItemPageState(r)).toEqual({
      status: "active",
      priceEur: 1560.47,
      isBestOffer: true,
    });
  });

  it("returns unknown when no price and no ended marker (transient)", () => {
    expect(parseItemPageState(raw({ primaryText: "", binText: "", bodyText: "Chargement" })))
      .toEqual({ status: "unknown" });
  });
});

describe("parseItemPageSellerFeedback", () => {
  it("reads a zero-feedback seller as 0 (the fake-listing signal)", () => {
    expect(
      parseItemPageSellerFeedback("nouveauvendeur (0) Aucune évaluation"),
    ).toBe(0);
  });

  it("parses a French space-grouped feedback score", () => {
    expect(
      parseItemPageSellerFeedback("vendeurpro (12 345) 99,2% d'évaluations positives"),
    ).toBe(12345);
    // Non-breaking space grouping, as eBay actually renders it.
    expect(
      parseItemPageSellerFeedback("vendeurpro (1 234) 100% d'évaluations positives"),
    ).toBe(1234);
  });

  it("parses an English comma-grouped score and a k/M suffix", () => {
    expect(
      parseItemPageSellerFeedback("seller (1,234) 99.5% positive feedback"),
    ).toBe(1234);
    expect(parseItemPageSellerFeedback("psa (580,2 k) ...")).toBe(580200);
  });

  it("returns null when no score is present, so a miss never reads as zero", () => {
    expect(parseItemPageSellerFeedback("")).toBeNull();
    expect(parseItemPageSellerFeedback("vendeurpro évaluations positives")).toBeNull();
  });
});
