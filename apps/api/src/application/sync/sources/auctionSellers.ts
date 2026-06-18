/**
 * Auction seller allowlist (the buy-side curation gate). The Auction Sync only
 * ingests live auctions for *known cards* (driven per-Card off `ebayLink`) sold
 * by *known sellers* — sellers we have hand-picked as reliable graded-card
 * vendors. The restriction is applied at the search URL via eBay's `_ssn`
 * (seller) filter, so other sellers' auctions are never walked or item-page
 * visited in the first place (see auctionsLink.ts / ebayAuctions.source.ts).
 *
 * Seed list is `slapauction`; extend it as more trusted sellers are vetted.
 * Entries are eBay seller usernames (the `_ssn` value), lowercased.
 */
export const AUCTION_SELLER_ALLOWLIST = ["slapauction"] as const;

export type AllowedAuctionSeller = (typeof AUCTION_SELLER_ALLOWLIST)[number];

// Whether a seller (eBay username or store slug) is on the allowlist. A null /
// unparseable seller never qualifies. Case-insensitive.
export function isAllowedAuctionSeller(seller: string | null): boolean {
  if (!seller) return false;
  const needle = seller.toLowerCase();
  return AUCTION_SELLER_ALLOWLIST.some((s) => s === needle);
}
