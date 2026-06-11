import { activeListingsLinkFromEbayLink } from "./activeListingsLink";

const SOLD_LINK =
  "https://www.ebay.com/sch/i.html?_from=R40&_nkw=pokemon+cramorant+226+psa+2021&_sacat=0&_fcid=1&rt=nc&LH_Sold=1&LH_Complete=1";

describe("activeListingsLinkFromEbayLink", () => {
  it("drops the completed filters and pins Buy-It-Now sorted by lowest price", () => {
    const link = activeListingsLinkFromEbayLink(SOLD_LINK)!;
    const params = new URL(link).searchParams;
    expect(params.get("LH_Sold")).toBeNull();
    expect(params.get("LH_Complete")).toBeNull();
    expect(params.get("LH_BIN")).toBe("1");
    expect(params.get("_sop")).toBe("15");
  });

  it("moves the search to ebay.fr restricted to EU item location", () => {
    const link = activeListingsLinkFromEbayLink(SOLD_LINK)!;
    const url = new URL(link);
    expect(url.host).toBe("www.ebay.fr");
    expect(url.searchParams.get("LH_PrefLoc")).toBe("3");
  });

  it("preserves the curated search term", () => {
    const link = activeListingsLinkFromEbayLink(SOLD_LINK)!;
    expect(new URL(link).searchParams.get("_nkw")).toBe(
      "pokemon cramorant 226 psa 2021"
    );
  });

  it("returns null for absent or malformed links", () => {
    expect(activeListingsLinkFromEbayLink(null)).toBeNull();
    expect(activeListingsLinkFromEbayLink("not a url")).toBeNull();
  });
});
