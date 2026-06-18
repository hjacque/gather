import { auctionsLinkFromEbayLink } from "./auctionsLink";

const SOLD_LINK =
  "https://www.ebay.com/sch/i.html?_from=R40&_nkw=pokemon+cramorant+226+psa+2021&_sacat=0&_fcid=1&rt=nc&LH_Sold=1&LH_Complete=1";

describe("auctionsLinkFromEbayLink", () => {
  it("drops the completed filters and pins auctions sorted ending-soonest", () => {
    const link = auctionsLinkFromEbayLink(SOLD_LINK)!;
    const params = new URL(link).searchParams;
    expect(params.get("LH_Sold")).toBeNull();
    expect(params.get("LH_Complete")).toBeNull();
    expect(params.get("LH_Auction")).toBe("1");
    expect(params.get("_sop")).toBe("1");
  });

  it("never pins Buy-It-Now (auctions are the opposite of the Listings Sync)", () => {
    const binLink =
      "https://www.ebay.fr/sch/i.html?_nkw=pokemon&LH_BIN=1&_sop=15";
    const link = auctionsLinkFromEbayLink(binLink)!;
    const params = new URL(link).searchParams;
    expect(params.get("LH_BIN")).toBeNull();
    expect(params.get("LH_Auction")).toBe("1");
  });

  it("moves the search to ebay.fr restricted to EU item location", () => {
    const link = auctionsLinkFromEbayLink(SOLD_LINK)!;
    const url = new URL(link);
    expect(url.host).toBe("www.ebay.fr");
    expect(url.searchParams.get("LH_PrefLoc")).toBe("3");
  });

  it("drops the inherited US from-country param (_fcid)", () => {
    const link = auctionsLinkFromEbayLink(SOLD_LINK)!;
    expect(new URL(link).searchParams.get("_fcid")).toBeNull();
  });

  it("preserves the curated search term", () => {
    const link = auctionsLinkFromEbayLink(SOLD_LINK)!;
    expect(new URL(link).searchParams.get("_nkw")).toBe(
      "pokemon cramorant 226 psa 2021"
    );
  });

  it("returns null for absent or malformed links", () => {
    expect(auctionsLinkFromEbayLink(null)).toBeNull();
    expect(auctionsLinkFromEbayLink("not a url")).toBeNull();
  });
});
