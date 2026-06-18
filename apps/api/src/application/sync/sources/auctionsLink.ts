/**
 * Auction-search link builder (pure). The buy-side sibling of
 * `activeListingsLinkFromEbayLink`, but for *ongoing auctions* instead of
 * fixed-price asks. A Card's curated `ebayLink` points at its completed/sold
 * search on ebay.com; the Auction Sync walks the same search term against live
 * auction listings, restricted to the EU:
 *
 *   - host www.ebay.fr + `LH_PrefLoc=3` ("Union européenne") — same EU
 *     item-location filter the Listings Sync relies on (ebay.com has no Europe
 *     filter). Provenance still can't be trusted to the URL and is re-checked
 *     per row (see euLocation.ts).
 *   - drop `LH_Sold` / `LH_Complete` (completed-listings filters) and the US
 *     `_fcid` inherited from the curated sold link.
 *   - set `LH_Auction=1` — auctions only (the mirror of the Listings Sync's
 *     `LH_BIN=1`). An auction's current bid is a moving asking price, which is
 *     exactly why auctions live in their own table and never feed a price.
 *   - set `_sop=44` — eBay's "Durée : ventes se terminant en premier + avec
 *     enchères" (ending soonest *with bids*). This is both the feed's default
 *     order (ending soonest) and a server-side zero-bid filter: a live probe of
 *     ebay.fr showed `_sop=44` returns no zero-bid rows (797 vs 975 results,
 *     0/62 zero-bid on the page), so the sync never ingests bid-less auctions
 *     and no per-row bid parsing is needed to exclude them.
 *   - set `_ssn=<seller>` when a seller is given — restrict the search to a
 *     single allowlisted seller (see auctionSellers.ts). The feed only ingests
 *     auctions from known sellers, and filtering server-side means other
 *     sellers' auctions are never walked. Omitted seller → unrestricted (the
 *     pre-allowlist behaviour, kept for callers that don't curate by seller).
 *
 * Derived on the fly from `ebayLink` (no stored column): the transform is purely
 * mechanical and there is nothing to hand-curate that isn't already in
 * `ebayLink`. See ADR 0010.
 */
export function auctionsLinkFromEbayLink(
  ebayLink: string | null,
  seller?: string | null
): string | null {
  if (!ebayLink) return null;
  try {
    const url = new URL(ebayLink);
    url.host = "www.ebay.fr";
    url.searchParams.delete("LH_Sold");
    url.searchParams.delete("LH_Complete");
    url.searchParams.delete("LH_BIN");
    url.searchParams.delete("_fcid");
    url.searchParams.set("LH_Auction", "1");
    url.searchParams.set("LH_PrefLoc", "3");
    url.searchParams.set("_sop", "44");
    if (seller) url.searchParams.set("_ssn", seller);
    return url.toString();
  } catch {
    return null;
  }
}
