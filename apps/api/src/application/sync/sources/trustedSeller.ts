// Reputation bar a seller must clear to have their sales auto-validated
// (skip the manual review queue): a high feedback volume at a high positive
// rate. Applied identically to all sellers, with stats read from the
// search-result row's seller line.
export const MIN_FEEDBACK_SCORE = 5_000;
export const MIN_POSITIVE_PCT = 99.5;

// Whether a seller's feedback volume + positive rate clear the trust bar. A
// null stat (unparseable) never qualifies, so missing data is never trusted.
export function qualifiesAsTrusted(
  feedbackScore: number | null,
  positivePct: number | null
): boolean {
  return (
    feedbackScore !== null &&
    positivePct !== null &&
    feedbackScore >= MIN_FEEDBACK_SCORE &&
    positivePct >= MIN_POSITIVE_PCT
  );
}

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
