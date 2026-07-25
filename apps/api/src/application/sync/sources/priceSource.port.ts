import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";

export type CardmarketArticle = {
  articleId: string | null;
  psaGrade: number;
  price: number;
  seller: string | null;
  comment: string | null;
};

export type CardmarketArticles = CardmarketArticle[];

export interface PriceSourcePort {
  appliesTo(card: CardEntity): boolean;
  fetch(
    card: CardEntity,
    page: Page,
    usdToEur: number
  ): Promise<CardmarketArticles>;
}
