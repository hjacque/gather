import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";

// A CardMarket scrape result: PSA grade (1-10) → lowest ask in EUR. CardMarket
// asks are listings now, so a source yields buyable prices per grade rather than
// dated price points.
export type CardmarketGradePrices = Map<number, number>;

export interface PriceSourcePort {
  appliesTo(card: CardEntity): boolean;
  fetch(
    card: CardEntity,
    page: Page,
    usdToEur: number
  ): Promise<CardmarketGradePrices>;
}
