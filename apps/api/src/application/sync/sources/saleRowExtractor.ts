import { parseSellerSlug, qualifiesAsTrusted } from "./trustedSeller";

export type RawSaleRow = {
  listingId: string | null;
  title: string;
  priceText: string;
  soldText: string;
  isBestOffer: boolean;
  sellerHref: string | null;
  sellerInfoText: string | null;
};

export type SaleCandidate = {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  soldAt: Date;
  isBestOffer: boolean;
  seller: string | null;
  trustedSeller: boolean;
  sellerHasActivity: boolean;
};

const AD_TITLE = "Shop on eBay";

export function detectCurrency(priceText: string): string | null {
  if (priceText.includes("€")) return "EUR";
  if (priceText.includes("£")) return "GBP";
  if (/C\s*\$/.test(priceText)) return "CAD";
  if (/A(?:U)?\s*\$/.test(priceText)) return "AUD";
  if (priceText.includes("$")) return "USD";
  return null;
}

export function parseAmount(priceText: string): number | null {
  const match = priceText.match(/[\d][\d.,]*/);
  if (!match) return null;
  const normalized = match[0].replace(/,/g, "");
  const amount = parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseSoldAt(soldText: string): Date | null {
  const match = soldText.match(/Sold\s+(.+)$/i);
  if (!match) return null;
  const date = new Date(`${match[1].trim()} UTC`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseSellerFeedbackCount(infoText: string | null): number | null {
  if (!infoText) return null;
  const match = infoText.match(/\(\s*([\d.,]+)\s*([KkMm]?)\s*\)/);
  if (!match) return null;
  const n = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const mult = /[Kk]/.test(match[2]) ? 1_000 : /[Mm]/.test(match[2]) ? 1_000_000 : 1;
  return Math.round(n * mult);
}

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
