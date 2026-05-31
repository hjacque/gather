import { PriceType } from "@gather/types";
import { RawPrices } from "./sources/priceSource.port";

export type DerivedPrices = Map<PriceType, number | undefined>;

export function aggregatePrices(raw: RawPrices): DerivedPrices {
  const prices: DerivedPrices = new Map([
    ["cardmarketPsa1", raw.cardmarketPsa1],
    ["cardmarketPsa2", raw.cardmarketPsa2],
    ["cardmarketPsa3", raw.cardmarketPsa3],
    ["cardmarketPsa4", raw.cardmarketPsa4],
    ["cardmarketPsa5", raw.cardmarketPsa5],
    ["cardmarketPsa6", raw.cardmarketPsa6],
    ["cardmarketPsa7", raw.cardmarketPsa7],
    ["cardmarketPsa8", raw.cardmarketPsa8],
    ["cardmarketPsa9", raw.cardmarketPsa9],
    ["cardmarketPsa10", raw.cardmarketPsa10],
  ]);

  return prices;
}
