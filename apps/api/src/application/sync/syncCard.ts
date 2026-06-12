import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../entities/card.entity";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { CardmarketGradePrices, PriceSourcePort } from "./sources/priceSource.port";
import { mirrorCardmarketListings } from "./cardmarketListings";

// Scrape a card's CardMarket asks and mirror them into the Listing model.
// CardMarket asks are listings now, so there is nothing to persist as a dated
// price point here — the lowest ask per grade is written as a cardmarket
// Listing, the same as the per-card CardMarket sync.
export async function syncCard(
  card: CardEntity,
  today: Date,
  page: Page,
  usdToEur: number,
  priceSources: PriceSourcePort[],
  listingRepository: ListingRepositoryPort
): Promise<CardmarketGradePrices> {
  const gradePrices: CardmarketGradePrices = new Map();

  for (const source of priceSources) {
    if (source.appliesTo(card)) {
      const result = await source.fetch(card, page, usdToEur);
      for (const [grade, price] of result) gradePrices.set(grade, price);
    }
  }

  await mirrorCardmarketListings(listingRepository, card.id, gradePrices, today);

  console.debug(card, gradePrices);

  return gradePrices;
}
