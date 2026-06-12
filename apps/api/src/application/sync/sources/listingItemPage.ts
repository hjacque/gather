/**
 * eBay item-page reader (pure). The Listings Sync walks a card's *search*;
 * this verifies a *single* live listing by reading its own item page
 * (ebay.fr/itm/<id>), so a stored ask can be refreshed on demand when its
 * price may have moved or the listing may have ended.
 *
 * Item pages render the native price in `.x-price-primary` and, when the
 * native currency isn't EUR, the converted value in `.x-bin-price__content`
 * as "<native>Environ<eur> EUR". Listings were stored from the search rows in
 * their EUR-displayed value, so verification standardizes on the same EUR
 * figure (the last "… EUR" amount on the page).
 */
import { parseListingAmount } from "./listingRowExtractor";

// Raw fields read off a single item page in the browser.
export type RawItemPage = {
  title: string; // document.title — "Error Page | eBay" when the item is gone
  primaryText: string; // .x-price-primary
  binText: string; // .x-bin-price__content (native + "Environ <eur> EUR")
  bodyText: string; // a slice of body innerText, for offer / ended markers
  // Seller-card text, e.g. "vendeurpro (12 345) 99,2% d'évaluations positives".
  // ebay.fr search rows carry no seller line, so the item page is the only place
  // a listing's seller feedback is exposed (see parseItemPageSellerFeedback).
  sellerInfoText: string;
};

export type ItemPageState =
  | { status: "gone" }
  | { status: "active"; priceEur: number; isBestOffer: boolean }
  | { status: "unknown" };

// Markers (title or body) that mean the listing no longer exists / is over.
const ENDED =
  /Error Page|Annonce termin|n'est plus disponible|Cet objet a été vendu|Objet vendu|This listing (?:has|was) ended|no longer available/i;

const OFFER = /Offre directe|Faire une offre|Proposer un prix|Best Offer/i;

// Last "<number> EUR" amount in a string (native EUR, or the "Environ <eur>"
// conversion eBay appends for foreign-currency listings).
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

  // No price and an ended marker in the body → gone; otherwise we can't tell
  // (e.g. a transient load), so leave the stored listing untouched.
  if (ENDED.test(raw.bodyText)) return { status: "gone" };
  return { status: "unknown" };
}

// Parse the seller's feedback score from an item page's seller-card text, e.g.
// "vendeurpro (12 345) 99,2% d'évaluations positives" -> 12345, "newbie (0)
// Aucune évaluation" -> 0, "psa (580,2 k) ..." -> 580200. The score is the
// parenthetical count next to the seller name; ebay.fr groups thousands with
// (non-breaking) spaces and a "k"/"M" suffix uses a comma decimal. Returns null
// when no score is present (unreadable page / not the seller card) — distinct
// from a parsed 0, so a missing read never reads as a zero-reputation seller.
export function parseItemPageSellerFeedback(text: string): number | null {
  if (!text) return null;
  const match = text.match(/\(\s*(\d[\d.,\s  ]*?)\s*([KkMm]?)\s*\)/);
  if (!match) return null;
  const grouped = match[1].replace(/[\s  ]/g, "");
  const mult = /[Kk]/.test(match[2]) ? 1_000 : /[Mm]/.test(match[2]) ? 1_000_000 : 1;
  // With a k/M suffix the separator is a decimal point ("580,2 k"); otherwise
  // commas/dots are thousands separators in an integer count ("12,345").
  const normalized =
    mult > 1 ? grouped.replace(/\./g, "").replace(",", ".") : grouped.replace(/[.,]/g, "");
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * mult);
}
