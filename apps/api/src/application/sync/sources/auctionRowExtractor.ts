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

export type RawAuctionRow = {
  listingId: string | null;
  title: string;
  priceText: string;
  bidText: string | null;
  timeLeftText: string | null;
  sellerHref: string | null;
  sellerInfoText: string | null;
  locationText: string | null;
};

export type AuctionCandidate = {
  itemId: string;
  title: string;
  currentBid: number;
  currency: string;
  bidCount: number;
  endTime: Date;
  seller: string | null;
  trustedSeller: boolean;
  sellerHasActivity: boolean;
  location: string | null;
  isEuLocation: boolean;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MINUTE_MS = 60 * 1000;

export function parseTimeLeft(
  caption: string | null,
  now: Date
): Date | null {
  if (!caption) return null;
  const text = caption.toLowerCase();
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
