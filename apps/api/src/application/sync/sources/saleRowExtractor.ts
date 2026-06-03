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

import { parseSellerSlug } from "./trustedSeller";

// Raw, untyped strings as read straight off a result row's DOM.
export type RawSaleRow = {
  listingId: string | null; // data-listingid
  title: string;
  priceText: string; // e.g. "$1,009.00", "US $1,009.00", "€850,00"
  soldText: string; // e.g. "Sold May 31, 2026"
  isBestOffer: boolean;
  sellerHref: string | null; // href of the store seller link, when present
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
};

// eBay's carousel ad rows reuse this placeholder title.
const AD_TITLE = "Shop on eBay";

// Currency symbols eBay renders, mapped to ISO codes. "$" defaults to USD
// (eBay.com); a "C $" / "A $" prefix narrows it to the local dollar.
function detectCurrency(priceText: string): string | null {
  if (priceText.includes("€")) return "EUR";
  if (priceText.includes("£")) return "GBP";
  if (/C\s*\$/.test(priceText)) return "CAD";
  if (/A(?:U)?\s*\$/.test(priceText)) return "AUD";
  if (priceText.includes("$")) return "USD";
  return null;
}

// Parse the numeric amount from eBay's US-formatted price text ("1,009.00").
// Commas are thousands separators; the last dot is the decimal point.
function parseAmount(priceText: string): number | null {
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

export function extractSaleRow(raw: RawSaleRow): SaleCandidate | null {
  const title = raw.title.replace(/Opens in a new window or tab\s*$/i, "").trim();
  if (!title || title === AD_TITLE) return null;
  if (!raw.listingId) return null;

  const currency = detectCurrency(raw.priceText);
  const price = parseAmount(raw.priceText);
  const soldAt = parseSoldAt(raw.soldText);
  if (!currency || price === null || soldAt === null) return null;

  return {
    itemId: raw.listingId,
    title,
    price,
    currency,
    soldAt,
    isBestOffer: raw.isBestOffer,
    seller: parseSellerSlug(raw.sellerHref),
  };
}
