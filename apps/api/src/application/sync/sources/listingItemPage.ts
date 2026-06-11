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
