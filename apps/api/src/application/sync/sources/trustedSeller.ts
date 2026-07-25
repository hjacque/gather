export const MIN_FEEDBACK_SCORE = 5_000;
export const MIN_POSITIVE_PCT = 99.5;

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

export function parseSellerSlug(href: string | null): string | null {
  if (!href) return null;
  const match = href.match(
    /(?:stores\.ebay\.[a-z.]+\/|ebay\.[a-z.]+\/str\/)([^/?#]+)/i
  );
  return match ? decodeURIComponent(match[1]).toLowerCase() : null;
}
