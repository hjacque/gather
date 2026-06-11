/**
 * Active-listings link builder (pure). A Card's curated `ebayLink` points at
 * its *completed/sold* search on ebay.com; the Listings Sync walks the same
 * search term against live Buy-It-Now items, restricted to the EU:
 *
 *   - host www.ebay.fr + `LH_PrefLoc=3` ("Union européenne") — the buyer is in
 *     the EU, and non-EU asks carry customs + shipping that make their face
 *     value incomparable. ebay.com has no Europe item-location filter, so the
 *     EU restriction requires the French site (verified live 2026-06-11:
 *     ebay.fr LH_PrefLoc — 1 France, 4 border countries, 3 EU, 6 continental
 *     Europe, 2 worldwide).
 *   - drop `LH_Sold` / `LH_Complete` (completed-listings filters)
 *   - set `LH_BIN=1` — fixed-price asks only; an auction's current bid is not a
 *     price you can buy at, so it must not feed the buy-side min
 *   - set `_sop=15` — sort by price + shipping, lowest first, so the cheapest
 *     asks per grade land inside the bounded page walk
 */
export function activeListingsLinkFromEbayLink(
  ebayLink: string | null
): string | null {
  if (!ebayLink) return null;
  try {
    const url = new URL(ebayLink);
    url.host = "www.ebay.fr";
    url.searchParams.delete("LH_Sold");
    url.searchParams.delete("LH_Complete");
    // The curated sold-link carries a US "from-country" param (_fcid=1) with no
    // place in an EU search; drop it so only LH_PrefLoc governs item location.
    url.searchParams.delete("_fcid");
    url.searchParams.set("LH_BIN", "1");
    url.searchParams.set("LH_PrefLoc", "3");
    url.searchParams.set("_sop", "15");
    return url.toString();
  } catch {
    return null;
  }
}
