/**
 * Sale Row Extractor (gather-gj4.2) — pure conversion of one eBay completed-
 * listing result row (already reduced to its visible text fields in the browser)
 * into a platform-agnostic Sale candidate. No I/O, no DOM walking here: the
 * Puppeteer source pulls the raw strings out of the row, this turns them into a
 * typed candidate (or null when the row is an ad / unparseable).
 *
 * The PSA grade is intentionally NOT extracted here — that is the card-aware
 * Listing Title Parser's job, run by the use case over `title`.
 */

import { parseSellerSlug, qualifiesAsTrusted } from "./trustedSeller";

// Raw, untyped strings as read straight off a result row's DOM.
export type RawSaleRow = {
  listingId: string | null; // data-listingid
  title: string;
  priceText: string; // e.g. "$1,009.00", "US $1,009.00", "€850,00"
  soldText: string; // e.g. "Sold May 31, 2026"
  isBestOffer: boolean;
  sellerHref: string | null; // href of the store seller link, when present
  // Text of the row's seller line, e.g. "dxbdxb 99.3% positive (460)". Present
  // for store and non-store sellers alike; null when no seller line was found.
  sellerInfoText: string | null;
};

// A single sold transaction candidate, before card/grade classification.
export type SaleCandidate = {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  soldAt: Date;
  isBestOffer: boolean;
  seller: string | null; // parsed store slug, e.g. "psa"; null for non-stores
  // True when the row's seller line clears the reputation bar (feedback volume
  // at a high positive rate). Derived from the row for all sellers.
  trustedSeller: boolean;
  // False when the row's seller line shows zero feedback — a fake-listing
  // signal. Derived from the row for all sellers.
  sellerHasActivity: boolean;
};

// eBay's carousel ad rows reuse this placeholder title.
const AD_TITLE = "Shop on eBay";

// Currency symbols eBay renders, mapped to ISO codes. "$" defaults to USD
// (eBay.com); a "C $" / "A $" prefix narrows it to the local dollar. Shared
// with the Terapeak extractor, which reads the same eBay-formatted price text.
export function detectCurrency(priceText: string): string | null {
  if (priceText.includes("€")) return "EUR";
  if (priceText.includes("£")) return "GBP";
  if (/C\s*\$/.test(priceText)) return "CAD";
  if (/A(?:U)?\s*\$/.test(priceText)) return "AUD";
  if (priceText.includes("$")) return "USD";
  return null;
}

// Parse the numeric amount from eBay's US-formatted price text ("1,009.00").
// Commas are thousands separators; the last dot is the decimal point. Shared
// with the Terapeak extractor.
export function parseAmount(priceText: string): number | null {
  const match = priceText.match(/[\d][\d.,]*/);
  if (!match) return null;
  const normalized = match[0].replace(/,/g, "");
  const amount = parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

// "Sold May 31, 2026" / "Sold  May 31, 2026" -> Date (UTC midnight).
function parseSoldAt(soldText: string): Date | null {
  const match = soldText.match(/Sold\s+(.+)$/i);
  if (!match) return null;
  const date = new Date(`${match[1].trim()} UTC`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Parse the seller feedback count from a row's seller line, e.g.
// "dxbdxb 99.3% positive (460)" -> 460, "psa 99.9% positive (580.2K)" -> 580200,
// "newbie 0% positive (0)" -> 0. Returns null when no parenthetical count is
// present (e.g. a seller with no feedback history shown at all) — distinct from
// a parsed 0, so an unparseable line never reads as "no activity".
export function parseSellerFeedbackCount(infoText: string | null): number | null {
  if (!infoText) return null;
  const match = infoText.match(/\(\s*([\d.,]+)\s*([KkMm]?)\s*\)/);
  if (!match) return null;
  const n = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const mult = /[Kk]/.test(match[2]) ? 1_000 : /[Mm]/.test(match[2]) ? 1_000_000 : 1;
  return Math.round(n * mult);
}

// Parse the positive-feedback percentage from a row's seller line, e.g.
// "dxbdxb 99.3% positive (460)" -> 99.3, "maokayangcards 100% positive (387)"
// -> 100. Returns null when no "% positive" rate is present.
export function parseSellerFeedbackPct(infoText: string | null): number | null {
  if (!infoText) return null;
  const match = infoText.match(/([\d.]+)\s*%\s*positive/i);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function extractSaleRow(raw: RawSaleRow): SaleCandidate | null {
  const title = raw.title.replace(/Opens in a new window or tab\s*$/i, "").trim();
  if (!title || title === AD_TITLE) return null;
  if (!raw.listingId) return null;

  const currency = detectCurrency(raw.priceText);
  const price = parseAmount(raw.priceText);
  const soldAt = parseSoldAt(raw.soldText);
  if (!currency || price === null || soldAt === null) return null;

  const seller = parseSellerSlug(raw.sellerHref);

  // Decide trust + activity from the row's own seller line, for store and
  // non-store sellers alike (the line carries the same feedback count + positive
  // rate for both): a feedback count of exactly 0 is no activity, and clearing
  // the reputation bar grants trust. An unparseable line leaves count/pct null,
  // which reads as "has activity, not trusted" — never invalidating on a miss.
  const feedbackCount = parseSellerFeedbackCount(raw.sellerInfoText);
  const feedbackPct = parseSellerFeedbackPct(raw.sellerInfoText);
  const sellerHasActivity = feedbackCount !== 0;
  const trustedSeller = qualifiesAsTrusted(feedbackCount, feedbackPct);

  return {
    itemId: raw.listingId,
    title,
    price,
    currency,
    soldAt,
    isBestOffer: raw.isBestOffer,
    seller,
    trustedSeller,
    sellerHasActivity,
  };
}
