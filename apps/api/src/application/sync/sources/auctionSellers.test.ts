import {
  AUCTION_SELLER_ALLOWLIST,
  isAllowedAuctionSeller,
} from "./auctionSellers";

describe("auctionSellers", () => {
  it("seeds the allowlist with slapauction", () => {
    expect(AUCTION_SELLER_ALLOWLIST).toContain("slapauction");
  });

  it("accepts an allowlisted seller (case-insensitively)", () => {
    expect(isAllowedAuctionSeller("slapauction")).toBe(true);
    expect(isAllowedAuctionSeller("SlapAuction")).toBe(true);
  });

  it("rejects sellers not on the allowlist", () => {
    expect(isAllowedAuctionSeller("randomseller")).toBe(false);
  });

  it("rejects a null / empty seller", () => {
    expect(isAllowedAuctionSeller(null)).toBe(false);
    expect(isAllowedAuctionSeller("")).toBe(false);
  });
});
