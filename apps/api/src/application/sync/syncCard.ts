import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../entities/card.entity";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { CardmarketArticles, PriceSourcePort } from "./sources/priceSource.port";
import { mirrorCardmarketListings } from "./cardmarketListings";

export async function syncCard(
  card: CardEntity,
  today: Date,
  page: Page,
  usdToEur: number,
  priceSources: PriceSourcePort[],
  listingRepository: ListingRepositoryPort
): Promise<CardmarketArticles> {
  const articles: CardmarketArticles = [];

  for (const source of priceSources) {
    if (source.appliesTo(card)) {
      articles.push(...(await source.fetch(card, page, usdToEur)));
    }
  }

  await mirrorCardmarketListings(listingRepository, card.id, articles, today);

  console.debug(card, articles);

  return articles;
}
