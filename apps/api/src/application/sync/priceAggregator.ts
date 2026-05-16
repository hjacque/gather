import { PriceType } from "@gather/types";
import { ProductEntity } from "../../entities/product.entity";
import { RawPrices } from "./sources/priceSource.port";

export type DerivedPrices = Map<PriceType, number | undefined>;

export function aggregatePrices(
  product: ProductEntity,
  raw: RawPrices
): DerivedPrices {
  const prices: DerivedPrices = new Map([
    ["cardmarket", raw.cardmarket],
    ["cardkingdom", raw.cardkingdom],
    ["abugames", raw.abugames],
    ["cardmarketListingCount", raw.cardmarketListingCount],
    ["fullSet", raw.fullSet],
    ["tcgp", raw.tcgp],
    ["bricklinkAverage", raw.bricklinkAverage],
  ]);

  const marketPrice = Math.min(raw.cardmarket || 0) || undefined;
  prices.set("market", marketPrice);

  const buylistPrice =
    raw.cardkingdom || raw.abugames
      ? Math.max(raw.cardkingdom || 0, raw.abugames || 0)
      : undefined;
  prices.set("buylist", buylistPrice);

  const ratio =
    product.type !== "minifigure"
      ? marketPrice &&
        buylistPrice &&
        Math.round((marketPrice / buylistPrice) * 100) - 100
      : marketPrice &&
        raw.bricklinkAverage &&
        Math.round((marketPrice / raw.bricklinkAverage) * 100) - 100;
  prices.set("ratio", ratio ?? undefined);

  if (product.type !== "single" && typeof product.boosterCount === "number") {
    const pricePerBooster =
      typeof marketPrice === "number"
        ? parseFloat((marketPrice / product.boosterCount).toFixed(2))
        : undefined;
    prices.set("perBooster", pricePerBooster);
  }

  return prices;
}
