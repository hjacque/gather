import type { Page } from "rebrowser-puppeteer-core";
import { PriceType } from "@gather/types";
import { CardEntity } from "../../../entities/card.entity";

export type RawPrices = Partial<Record<PriceType, number | undefined>>;

export interface PriceSourcePort {
  appliesTo(card: CardEntity): boolean;
  fetch(
    card: CardEntity,
    page: Page,
    usdToEur: number
  ): Promise<RawPrices>;
}
