import { parseAuctionItemPage } from "./auctionItemPage";
import { RawItemPage } from "./listingItemPage";

const base: RawItemPage = {
  title: "Pokemon Cramorant 226 PSA 10 | eBay",
  primaryText: "12,50 EUR",
  binText: "",
  bodyText: "Enchère actuelle 12,50 EUR 3 enchères Se termine dans 1 j",
  sellerInfoText: "vendeurpro (1 234) 99,2% d'évaluations positives",
};

describe("parseAuctionItemPage", () => {
  it("reads the current bid (EUR) and bid count from an active auction page", () => {
    const state = parseAuctionItemPage(base);
    expect(state).toEqual({
      status: "active",
      currentBidEur: 12.5,
      bidCount: 3,
    });
  });

  it("reports gone when the listing has ended", () => {
    const state = parseAuctionItemPage({
      ...base,
      title: "Error Page | eBay",
    });
    expect(state.status).toBe("gone");
  });

  it("yields a null bid count when the page has no bid caption", () => {
    const state = parseAuctionItemPage({
      ...base,
      bodyText: "Enchère actuelle 12,50 EUR",
    });
    expect(state).toEqual({
      status: "active",
      currentBidEur: 12.5,
      bidCount: null,
    });
  });

  it("is unknown when no price can be read (transient load)", () => {
    const state = parseAuctionItemPage({
      ...base,
      primaryText: "",
      binText: "",
      bodyText: "loading",
    });
    expect(state.status).toBe("unknown");
  });
});
