export const AUCTION_SELLER_ALLOWLIST = ["slapauction"] as const;

export type AllowedAuctionSeller = (typeof AUCTION_SELLER_ALLOWLIST)[number];

export function isAllowedAuctionSeller(seller: string | null): boolean {
  if (!seller) return false;
  const needle = seller.toLowerCase();
  return AUCTION_SELLER_ALLOWLIST.some((s) => s === needle);
}
