import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../entities/card.entity";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { PriceSourcePort, RawPrices } from "./sources/priceSource.port";
import { aggregatePrices, DerivedPrices } from "./priceAggregator";
import { mirrorCardmarketListings } from "./cardmarketListings";

export async function syncCard(
  card: CardEntity,
  today: Date,
  page: Page,
  usdToEur: number,
  priceSources: PriceSourcePort[],
  priceRepository: PriceRepositoryPort,
  listingRepository: ListingRepositoryPort
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

  // Mirror the scraped CardMarket grade prices into the unified Listing model,
  // same as the per-card CardMarket sync — so a full/per-set sync populates the
  // buy side too, not just the dated price history.
  await mirrorCardmarketListings(listingRepository, card.id, prices, today);

  console.debug(card, prices);

  return prices;
}
