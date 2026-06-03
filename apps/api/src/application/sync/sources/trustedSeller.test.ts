import { parseSellerSlug, isTrustedSeller } from "./trustedSeller";

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

describe("isTrustedSeller", () => {
  it("is true for a configured trusted slug", () => {
    expect(isTrustedSeller("psa")).toBe(true);
  });

  it("is false for an unknown or null slug", () => {
    expect(isTrustedSeller("randomseller")).toBe(false);
    expect(isTrustedSeller(null)).toBe(false);
  });
});
