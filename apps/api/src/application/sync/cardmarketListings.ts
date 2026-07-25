import { NewListing } from "../../entities/listing.entity";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { CardmarketArticle, CardmarketArticles } from "./sources/priceSource.port";

export const cardmarketListingItemId = (article: CardmarketArticle): string => {
  if (article.articleId) return `cardmarket-${article.articleId}`;
  const seller = (article.seller ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `cardmarket-psa${article.psaGrade}-${seller || "unknown"}-${Math.round(
    article.price * 100,
  )}`;
};

const listingTitle = (article: CardmarketArticle): string => {
  const base = `CardMarket PSA ${article.psaGrade}`;
  const parts = [article.seller, article.comment].filter(Boolean);
  return parts.length ? `${base} — ${parts.join(" — ")}` : base;
};

export const cardmarketArticlesToListings = (
  cardId: string,
  articles: CardmarketArticles,
  seenAt: Date,
): NewListing[] => {
  const usable = articles
    .filter(
      (a) =>
        a.price > 0 &&
        Number.isFinite(a.price) &&
        a.psaGrade >= 1 &&
        a.psaGrade <= 10,
    )
    .sort((a, b) => a.psaGrade - b.psaGrade || a.price - b.price);

  const usedItemIds = new Map<string, number>();

  return usable.map((article) => {
    const baseItemId = cardmarketListingItemId(article);
    const seen = usedItemIds.get(baseItemId) ?? 0;
    usedItemIds.set(baseItemId, seen + 1);
    const itemId = seen === 0 ? baseItemId : `${baseItemId}-${seen + 1}`;

    return {
      cardId,
      platform: "cardmarket" as const,
      itemId,
      psaGrade: article.psaGrade,
      price: article.price,
      currency: "EUR",
      title: listingTitle(article),
      isBestOffer: false,
      seller: article.seller,
      location: null,
      seenAt,
    };
  });
};

export const mirrorCardmarketListings = async (
  listingRepository: ListingRepositoryPort,
  cardId: string,
  articles: CardmarketArticles,
  seenAt: Date,
): Promise<NewListing[]> => {
  const listings = cardmarketArticlesToListings(cardId, articles, seenAt);
  await listingRepository.replaceCardListings(cardId, "cardmarket", listings);
  return listings;
};
