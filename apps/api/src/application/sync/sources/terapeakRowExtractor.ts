/**
 * Terapeak Row Extractor — pure conversion of one Terapeak (Seller Hub →
 * Research → Product Research) sold-results row into a Sale candidate. No I/O.
 *
 * Terapeak is the sales source: eBay hides the actual accepted price of a sale
 * on the public completed-listings search and item pages, while Terapeak — eBay's
 * own seller-research surface — reports the authoritative transaction price.
 * Each row carries the listing title (PSA grade lives here, parsed downstream by
 * the Listing Title Parser), the eBay item id (`data-item-id`), an *average*
 * sold price over `soldCount` transactions, and the last-sold date.
 *
 * For graded singles `soldCount` is almost always 1, so the average is that one
 * sale's true price and the last-sold date is its sale date; a multi-quantity
 * GTC listing can show soldCount > 1, where the price is a genuine average and
 * the date is the most recent of its sales.
 *
 * Currency/amount parsing is shared with the Sale Row Extractor: Terapeak
 * renders the same eBay-formatted price text ("$357.20 Fixed price").
 */

import { detectCurrency, parseAmount } from "./saleRowExtractor";

// Raw strings read straight off one Terapeak results-table row.
export type RawTerapeakRow = {
  // data-item-id on the product-name span: a real eBay listing item id.
  itemId: string | null;
  // Listing title from the product-name span (carries the PSA grade).
  title: string;
  // Avg sold price cell text, e.g. "$357.20 Fixed price", "$3,025.00 Auction".
  priceText: string;
  // Total-sold-count cell text, e.g. "1", "5". Null/empty reads as a single sale.
  soldCountText: string;
  // Date-last-sold cell text, e.g. "Aug 24, 2024".
  soldText: string;
};

// A single sold transaction candidate, before card/grade classification.
export type TerapeakSale = {
  itemId: string;
  title: string;
  price: number; // avg sold price (= the exact sale price when soldCount === 1)
  currency: string;
  soldAt: Date; // date last sold
  soldCount: number; // how many transactions the price averages over (>= 1)
};

function parseSoldCount(text: string): number {
  const n = parseInt(text.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// "Aug 24, 2024" -> Date (UTC midnight). Null when absent / unparseable.
function parseSoldAt(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed} UTC`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function extractTerapeakRow(raw: RawTerapeakRow): TerapeakSale | null {
  const itemId = raw.itemId?.trim() || null;
  const title = raw.title.trim();
  const currency = detectCurrency(raw.priceText);
  const price = parseAmount(raw.priceText);
  const soldAt = parseSoldAt(raw.soldText);
  if (
    !itemId ||
    !/^\d{9,}$/.test(itemId) ||
    !title ||
    !currency ||
    price === null ||
    soldAt === null
  ) {
    return null;
  }
  return {
    itemId,
    title,
    price,
    currency,
    soldAt,
    soldCount: parseSoldCount(raw.soldCountText),
  };
}
