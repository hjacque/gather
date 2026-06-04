// Parse the eBay store slug from a seller-link href. Handles both the legacy
// `stores.ebay.<tld>/<slug>` and the current `ebay.<tld>/str/<slug>` shapes.
// Returns the lowercased slug, or null when the href is absent / unparseable
// (most non-store sellers have no store link at all).
export function parseSellerSlug(href: string | null): string | null {
  if (!href) return null;
  const match = href.match(
    /(?:stores\.ebay\.[a-z.]+\/|ebay\.[a-z.]+\/str\/)([^/?#]+)/i
  );
  return match ? decodeURIComponent(match[1]).toLowerCase() : null;
}
