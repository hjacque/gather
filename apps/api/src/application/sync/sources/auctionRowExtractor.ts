/**
 * Auction Row Extractor — pure conversion of one eBay *auction* search result
 * row (already reduced to its visible text fields in the browser) into a
 * platform-agnostic Auction candidate. The auction sibling of the Listing Row
 * Extractor: same ebay.fr row markup and French formatting, but the price is the
 * current bid (not a buyable ask) and the row carries two auction-only captions
 * — a bid count and a relative "time left".
 *
 * The PSA grade is intentionally NOT extracted here — that is the card-aware
 * Listing Title Parser's job, run by the use case over `title`.
 */

import {
  detectListingCurrency,
  parseListingAmount,
} from "./listingRowExtractor";
import {
  parseSellerFeedbackCount,
  parseSellerFeedbackPct,
} from "./saleRowExtractor";
import { parseSellerSlug, qualifiesAsTrusted } from "./trustedSeller";
import { isEuCountry, parseListingLocation } from "./euLocation";

// Raw, untyped strings as read straight off an auction result row's DOM.
export type RawAuctionRow = {
  listingId: string | null; // data-listingid
  title: string;
  // Current bid, e.g. "12,50 EUR" / "$12.50". eBay shows the running bid as the
  // row price for an auction.
  priceText: string;
  // The bid-count caption, e.g. "5 enchères" / "1 bid" / "Aucune enchère".
  bidText: string | null;
  // The relative "time left" caption, e.g. "1 j 4 h" / "Se termine dans 30 min".
  timeLeftText: string | null;
  sellerHref: string | null;
  sellerInfoText: string | null;
  locationText: string | null;
};

// A single ongoing-auction candidate, before card/grade classification.
export type AuctionCandidate = {
  itemId: string;
  title: string;
  currentBid: number;
  currency: string;
  bidCount: number;
  // Absolute end instant, computed from the relative caption against the scrape
  // time. Immutable thereafter.
  endTime: Date;
  seller: string | null;
  trustedSeller: boolean;
  // False when the row's seller line shows zero feedback (a fake-listing
  // signal). Inert on the EU walk (ebay.fr rows carry no seller line); the real
  // gate is the item-page check the use case applies.
  sellerHasActivity: boolean;
  location: string | null;
  isEuLocation: boolean;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MINUTE_MS = 60 * 1000;

// Parse eBay's relative "time left" caption into an absolute end instant,
// measured from `now`. Handles both site languages and the day/hour/minute/
// second tokens eBay renders ("1 j 4 h", "4 h 30 min", "30 min 12 s", "1d 4h").
// A leading "Se termine dans" / "Ends in" prefix is ignored. Returns null when
// no time tokens are found (so a missing/garbage caption drops the row rather
// than inventing an end time).
export function parseTimeLeft(
  caption: string | null,
  now: Date
): Date | null {
  if (!caption) return null;
  const text = caption.toLowerCase();
  // "j" (jour) or "d" (day); "h"; "min" or a bare "m"; "s". Order matters: try
  // "min" before "m" so "30 min" isn't read as 30 months/minutes ambiguously.
  const num = (re: RegExp): number => {
    const m = text.match(re);
    return m ? parseInt(m[1], 10) : 0;
  };
  const days = num(/(\d+)\s*(?:j|d)\b/);
  const hours = num(/(\d+)\s*h\b/);
  const minutes = num(/(\d+)\s*(?:min|m)\b/);
  const seconds = num(/(\d+)\s*s\b/);
  const offset =
    days * DAY_MS + hours * HOUR_MS + minutes * MINUTE_MS + seconds * 1000;
  if (offset <= 0) return null;
  return new Date(now.getTime() + offset);
}

// Parse the bid count from an auction row's caption. "Aucune enchère" / "0 bids"
// → 0; "1 enchère" / "5 bids" → the number. null when the caption is absent or
// carries no recognizable bid wording (so the caller can treat it as unknown).
export function parseBidCount(bidText: string | null): number | null {
  if (!bidText) return null;
  const text = bidText.toLowerCase();
  if (/aucune\s+enchère|aucune\s+enchere|no\s+bids?/.test(text)) return 0;
  const m = text.match(/(\d+)\s*(?:enchère|enchere|bid)/);
  return m ? parseInt(m[1], 10) : null;
}

export function extractAuctionRow(
  raw: RawAuctionRow,
  now: Date
): AuctionCandidate | null {
  const title = raw.title.trim();
  if (!title) return null;
  if (!raw.listingId) return null;

  const currency = detectListingCurrency(raw.priceText);
  const currentBid = parseListingAmount(raw.priceText);
  if (!currency || currentBid === null) return null;

  const endTime = parseTimeLeft(raw.timeLeftText, now);
  if (!endTime) return null;

  // Unknown bid wording is treated as zero bids: the row is a live auction, it
  // just has no countable bids yet (or eBay rendered the caption oddly).
  const bidCount = parseBidCount(raw.bidText) ?? 0;

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
    currentBid,
    currency,
    bidCount,
    endTime,
    seller,
    trustedSeller,
    sellerHasActivity,
    location,
    isEuLocation,
  };
}
