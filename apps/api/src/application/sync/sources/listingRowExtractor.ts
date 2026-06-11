/**
 * Listing Row Extractor — pure conversion of one eBay *active* Buy-It-Now
 * result row (already reduced to its visible text fields in the browser) into a
 * platform-agnostic Listing candidate. The active-listings sibling of the Sale
 * Row Extractor: same row markup, but there is no "Sold <date>" caption and the
 * price is a live ask rather than a realized price.
 *
 * The PSA grade is intentionally NOT extracted here — that is the card-aware
 * Listing Title Parser's job, run by the use case over `title`.
 */

import {
  detectCurrency,
  parseAmount,
  parseSellerFeedbackCount,
  parseSellerFeedbackPct,
} from "./saleRowExtractor";
import { parseSellerSlug, qualifiesAsTrusted } from "./trustedSeller";

// Raw, untyped strings as read straight off an active result row's DOM.
export type RawListingRow = {
  listingId: string | null; // data-listingid
  title: string;
  priceText: string; // e.g. "$1,009.00", "US $1,009.00", "€850,00"
  isBestOffer: boolean; // row shows "or Best Offer"
  sellerHref: string | null; // href of the store seller link, when present
  // Text of the row's seller line, e.g. "dxbdxb 99.3% positive (460)". Present
  // for store and non-store sellers alike; null when no seller line was found.
  sellerInfoText: string | null;
};

// A single active-ask candidate, before card/grade classification.
export type ListingCandidate = {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  isBestOffer: boolean;
  seller: string | null; // parsed store slug, e.g. "psa"; null for non-stores
  // True when the row's seller line clears the reputation bar.
  trustedSeller: boolean;
  // False when the row's seller line shows zero feedback — a fake-listing
  // signal; such asks must not feed the buy-side min price.
  sellerHasActivity: boolean;
};

// eBay's carousel ad rows reuse this placeholder title.
const AD_TITLE = "Shop on eBay";

// Multi-variation listings render a price range; a single ask can't be read
// off them, so they are rejected (and for a PSA-graded single they are
// ambiguous bundles anyway).
const PRICE_RANGE = /\bto\b/i;

export function extractListingRow(raw: RawListingRow): ListingCandidate | null {
  const title = raw.title.replace(/Opens in a new window or tab\s*$/i, "").trim();
  if (!title || title === AD_TITLE) return null;
  if (!raw.listingId) return null;
  if (PRICE_RANGE.test(raw.priceText)) return null;

  const currency = detectCurrency(raw.priceText);
  const price = parseAmount(raw.priceText);
  if (!currency || price === null) return null;

  const seller = parseSellerSlug(raw.sellerHref);
  const feedbackCount = parseSellerFeedbackCount(raw.sellerInfoText);
  const feedbackPct = parseSellerFeedbackPct(raw.sellerInfoText);
  const sellerHasActivity = feedbackCount !== 0;
  const trustedSeller = qualifiesAsTrusted(feedbackCount, feedbackPct);

  return {
    itemId: raw.listingId,
    title,
    price,
    currency,
    isBestOffer: raw.isBestOffer,
    seller,
    trustedSeller,
    sellerHasActivity,
  };
}
