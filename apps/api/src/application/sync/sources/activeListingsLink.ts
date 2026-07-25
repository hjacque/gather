export function activeListingsLinkFromEbayLink(
  ebayLink: string | null
): string | null {
  if (!ebayLink) return null;
  try {
    const url = new URL(ebayLink);
    url.host = "www.ebay.fr";
    url.searchParams.delete("LH_Sold");
    url.searchParams.delete("LH_Complete");
    url.searchParams.delete("_fcid");
    url.searchParams.set("LH_BIN", "1");
    url.searchParams.set("LH_PrefLoc", "3");
    url.searchParams.set("_sop", "15");
    return url.toString();
  } catch {
    return null;
  }
}
