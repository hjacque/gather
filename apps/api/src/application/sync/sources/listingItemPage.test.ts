import { parseItemPageState, RawItemPage } from "./listingItemPage";

const raw = (over: Partial<RawItemPage> = {}): RawItemPage => ({
  title: "Some Pokemon Card PSA 10 | eBay",
  primaryText: "415,00 EUR",
  binText: "415,00 EUR",
  bodyText: "Achat immédiat",
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
