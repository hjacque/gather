import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../entities/card.entity";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PriceSourcePort, RawPrices } from "./sources/priceSource.port";
import { aggregatePrices, DerivedPrices } from "./priceAggregator";

export async function syncCard(
  card: CardEntity,
  today: Date,
  page: Page,
  usdToEur: number,
  priceSources: PriceSourcePort[],
  priceRepository: PriceRepositoryPort
): Promise<DerivedPrices> {
  const raw: RawPrices = {};

  for (const source of priceSources) {
    if (source.appliesTo(card)) {
      const result = await source.fetch(card, page, usdToEur);
      Object.assign(raw, result);
    }
  }

  const prices = aggregatePrices(raw);

  for (const key of prices.keys()) {
    await priceRepository.upsertPrice(card.id, prices.get(key), key, today);
  }

  console.debug(card, prices);

  return prices;
}
