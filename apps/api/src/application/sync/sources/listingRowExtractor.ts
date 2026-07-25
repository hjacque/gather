import {
  parseSellerFeedbackCount,
  parseSellerFeedbackPct,
} from "./saleRowExtractor";
import { parseSellerSlug, qualifiesAsTrusted } from "./trustedSeller";
import { isEuCountry, parseListingLocation } from "./euLocation";

export type RawListingRow = {
  listingId: string | null;
  title: string;
  priceText: string;
  isBestOffer: boolean;
  sellerHref: string | null;
  sellerInfoText: string | null;
  locationText: string | null;
};

export type ListingCandidate = {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  isBestOffer: boolean;
  seller: string | null;
  trustedSeller: boolean;
  sellerHasActivity: boolean;
  location: string | null;
  isEuLocation: boolean;
};

const AD_TITLE = "Shop on eBay";

const TITLE_SUFFIX =
  /(?:Opens in a new window or tab|La page s'ouvre dans une nouvelle fenêtre.*)$/i;

const PRICE_RANGE = /\bto\b|\sà\s/i;

export function detectListingCurrency(priceText: string): string | null {
  if (/\bEUR\b/.test(priceText) || priceText.includes("€")) return "EUR";
  if (/\bGBP\b/.test(priceText) || priceText.includes("£")) return "GBP";
  if (/C\s*\$/.test(priceText)) return "CAD";
  if (/A(?:U)?\s*\$/.test(priceText)) return "AUD";
  if (priceText.includes("$")) return "USD";
  return null;
}

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
