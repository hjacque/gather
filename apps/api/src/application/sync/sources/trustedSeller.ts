import { TRUSTED_EBAY_SELLERS } from "../../../constants";

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

// Whether a parsed store slug belongs to a trusted seller whose Sales are
// auto-validated. See TRUSTED_EBAY_SELLERS.
export function isTrustedSeller(slug: string | null): boolean {
  return slug != null && TRUSTED_EBAY_SELLERS.includes(slug.toLowerCase());
}
