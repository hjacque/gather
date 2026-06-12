/**
 * Listing Row Extractor — pure conversion of one eBay *active* Buy-It-Now
 * result row (already reduced to its visible text fields in the browser) into a
 * platform-agnostic Listing candidate. The active-listings sibling of the Sale
 * Row Extractor: same row markup, but there is no "Sold <date>" caption and the
 * price is a live ask rather than a realized price.
 *
 * Unlike the sales walk (ebay.com), the active walk runs on ebay.fr for its EU
 * item-location filter (see activeListingsLink.ts), so rows render in French:
 * prices like "2 499,00 EUR" (comma decimal, space-grouped thousands), Best
 * Offer as "ou Faire une offre", and a French screen-reader title suffix. Both
 * the US and French shapes are accepted here.
 *
 * The PSA grade is intentionally NOT extracted here — that is the card-aware
 * Listing Title Parser's job, run by the use case over `title`.
 */

import {
  parseSellerFeedbackCount,
  parseSellerFeedbackPct,
} from "./saleRowExtractor";
import { parseSellerSlug, qualifiesAsTrusted } from "./trustedSeller";
import { isEuCountry, parseListingLocation } from "./euLocation";

// Raw, untyped strings as read straight off an active result row's DOM.
export type RawListingRow = {
  listingId: string | null; // data-listingid
  title: string;
  priceText: string; // e.g. "$1,009.00", "120,00 EUR", "2 499,00 EUR"
  isBestOffer: boolean; // row shows "or Best Offer" / "ou Faire une offre"
  sellerHref: string | null; // href of the store seller link, when present
  // Text of the row's seller line, e.g. "dxbdxb 99.3% positive (460)". eBay.fr
  // result rows carry no seller line at all, so this is null there and the
  // zero-feedback guard downstream is inert for the EU walk.
  sellerInfoText: string | null;
  // The row's item-location line, e.g. "de Allemagne" / "de Japon". null when
  // eBay renders no location (some store / free-shipping rows). eBay's EU
  // search filter leaks non-EU items, so this is the only trustworthy
  // provenance signal — see euLocation.ts.
  locationText: string | null;
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
  // Parsed item-location country (e.g. "Allemagne"), or null when the row
  // carried no location line.
  location: string | null;
  // True only when `location` is a confirmed EU member state. Unknown / null
  // and non-EU provenance are both false; the use case drops those rows.
  isEuLocation: boolean;
};

// eBay's carousel ad rows reuse this placeholder title.
const AD_TITLE = "Shop on eBay";

// Screen-reader suffix appended to row titles, per site language.
const TITLE_SUFFIX =
  /(?:Opens in a new window or tab|La page s'ouvre dans une nouvelle fenêtre.*)$/i;

// Multi-variation listings render a price range ("$10.00 to $25.00" /
// "10,00 EUR à 25,00 EUR"); a single ask can't be read off them, so they are
// rejected (and for a PSA-graded single they are ambiguous bundles anyway).
const PRICE_RANGE = /\bto\b|\sà\s/i;

// Currency markers eBay renders, mapped to ISO codes. ebay.fr suffixes the
// code ("120,00 EUR"); ebay.com prefixes a symbol, where "$" defaults to USD
// and a "C $" / "A $" prefix narrows it to the local dollar.
export function detectListingCurrency(priceText: string): string | null {
  if (/\bEUR\b/.test(priceText) || priceText.includes("€")) return "EUR";
  if (/\bGBP\b/.test(priceText) || priceText.includes("£")) return "GBP";
  if (/C\s*\$/.test(priceText)) return "CAD";
  if (/A(?:U)?\s*\$/.test(priceText)) return "AUD";
  if (priceText.includes("$")) return "USD";
  return null;
}

// Parse the numeric amount from either locale's price text. French format is
// recognized by a trailing comma decimal ("2 499,00", incl. NBSP grouping);
// anything else is read as US-formatted ("1,009.00").
export function parseListingAmount(priceText: string): number | null {
  const match = priceText.match(/\d[\d\s.,  ]*/);
  if (!match) return null;
  const token = match[0].replace(/[\s  ]/g, "");
  const normalized = /,\d{1,2}$/.test(token)
    ? token.replace(/\./g, "").replace(",", ".")
    : token.replace(/,/g, "");
  const amount = parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function extractListingRow(raw: RawListingRow): ListingCandidate | null {
  const title = raw.title.replace(TITLE_SUFFIX, "").trim();
  if (!title || title === AD_TITLE) return null;
  if (!raw.listingId) return null;
  if (PRICE_RANGE.test(raw.priceText)) return null;

  const currency = detectListingCurrency(raw.priceText);
  const price = parseListingAmount(raw.priceText);
  if (!currency || price === null) return null;

  const seller = parseSellerSlug(raw.sellerHref);
  const feedbackCount = parseSellerFeedbackCount(raw.sellerInfoText);
  const feedbackPct = parseSellerFeedbackPct(raw.sellerInfoText);
  const sellerHasActivity = feedbackCount !== 0;
  const trustedSeller = qualifiesAsTrusted(feedbackCount, feedbackPct);

  const location = parseListingLocation(raw.locationText);
  const isEuLocation = isEuCountry(location);

  return {
    itemId: raw.listingId,
    title,
    price,
    currency,
    isBestOffer: raw.isBestOffer,
    seller,
    trustedSeller,
    sellerHasActivity,
    location,
    isEuLocation,
  };
}
