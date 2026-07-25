import { parseListingAmount } from "./listingRowExtractor";

export type RawItemPage = {
  title: string;
  primaryText: string;
  binText: string;
  bodyText: string;
  sellerInfoText: string;
};

export type ItemPageState =
  | { status: "gone" }
  | { status: "active"; priceEur: number; isBestOffer: boolean }
  | { status: "unknown" };

const ENDED =
  /Error Page|Annonce termin|n'est plus disponible|Cet objet a été vendu|Objet vendu|This listing (?:has|was) ended|no longer available/i;

const OFFER = /Offre directe|Faire une offre|Proposer un prix|Best Offer/i;

function lastEurAmount(text: string): number | null {
  const matches = [...text.matchAll(/([\d\s.,  ]+)\s*EUR/g)];
  if (matches.length === 0) return null;
  return parseListingAmount(matches[matches.length - 1][1]);
}

export function parseItemPageState(raw: RawItemPage): ItemPageState {
  if (ENDED.test(raw.title)) return { status: "gone" };

  const priceEur = lastEurAmount(raw.binText) ?? lastEurAmount(raw.primaryText);
  if (priceEur !== null) {
    const isBestOffer = OFFER.test(`${raw.primaryText} ${raw.binText} ${raw.bodyText}`);
    return { status: "active", priceEur, isBestOffer };
  }

  if (ENDED.test(raw.bodyText)) return { status: "gone" };
  return { status: "unknown" };
}

export function parseItemPageSellerFeedback(text: string): number | null {
  if (!text) return null;
  const match = text.match(/\(\s*(\d[\d.,\s  ]*?)\s*([KkMm]?)\s*\)/);
  if (!match) return null;
  const grouped = match[1].replace(/[\s  ]/g, "");
  const mult = /[Kk]/.test(match[2]) ? 1_000 : /[Mm]/.test(match[2]) ? 1_000_000 : 1;
  const normalized =
    mult > 1 ? grouped.replace(/\./g, "").replace(",", ".") : grouped.replace(/[.,]/g, "");
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * mult);
}
