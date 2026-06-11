/**
 * Active-listings link builder (pure). A Card's curated `ebayLink` points at
 * its *completed/sold* search; the Listings Sync walks the same search filtered
 * to live Buy-It-Now items instead:
 *
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
    url.searchParams.delete("LH_Sold");
    url.searchParams.delete("LH_Complete");
    url.searchParams.set("LH_BIN", "1");
    url.searchParams.set("_sop", "15");
    return url.toString();
  } catch {
    return null;
  }
}
