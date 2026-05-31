import type { Page } from "rebrowser-puppeteer-core";
import { ProductEntity } from "../../entities/product.entity";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PriceSourcePort, RawPrices } from "./sources/priceSource.port";
import { aggregatePrices, DerivedPrices } from "./priceAggregator";

export async function syncProduct(
  product: ProductEntity,
  today: Date,
  page: Page,
  usdToEur: number,
  priceSources: PriceSourcePort[],
  priceRepository: PriceRepositoryPort
): Promise<DerivedPrices> {
  const raw: RawPrices = {};

  for (const source of priceSources) {
    if (source.appliesTo(product)) {
      const result = await source.fetch(product, page, usdToEur);
      Object.assign(raw, result);
    }
  }

  const prices = aggregatePrices(raw);

  for (const key of prices.keys()) {
    await priceRepository.upsertPrice(product.id, prices.get(key), key, today);
  }

  console.debug(product, prices);

  return prices;
}
