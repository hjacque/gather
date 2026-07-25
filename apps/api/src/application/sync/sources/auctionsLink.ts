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
