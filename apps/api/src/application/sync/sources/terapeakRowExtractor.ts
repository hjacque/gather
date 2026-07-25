import { detectCurrency, parseAmount } from "./saleRowExtractor";

export type RawTerapeakRow = {
  itemId: string | null;
  title: string;
  priceText: string;
  soldCountText: string;
  soldText: string;
};

export type TerapeakSale = {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  soldAt: Date;
  soldCount: number;
};

function parseSoldCount(text: string): number {
  const n = parseInt(text.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

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
