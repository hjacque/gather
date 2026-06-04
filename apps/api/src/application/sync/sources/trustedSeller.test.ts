import { parseSellerSlug } from "./trustedSeller";

describe("parseSellerSlug", () => {
  it("parses the legacy stores.ebay.com/<slug> shape", () => {
    expect(parseSellerSlug("http://stores.ebay.com/psa")).toBe("psa");
  });

  it("parses the current ebay.com/str/<slug> shape", () => {
    expect(parseSellerSlug("https://www.ebay.com/str/psa")).toBe("psa");
  });

  it("lowercases the slug and ignores query/hash", () => {
    expect(parseSellerSlug("https://www.ebay.com/str/PSA?_trksid=x#top")).toBe(
      "psa",
    );
  });

  it("returns null for an absent or non-store href", () => {
    expect(parseSellerSlug(null)).toBeNull();
    expect(parseSellerSlug("https://www.ebay.com/itm/123")).toBeNull();
  });
});
