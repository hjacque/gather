import type { Page } from "rebrowser-puppeteer-core";
import { PriceType } from "@gather/types";
import { ProductEntity } from "../../../entities/product.entity";

export type RawPrices = Partial<Record<PriceType, number | undefined>>;

export interface PriceSourcePort {
  appliesTo(product: ProductEntity): boolean;
  fetch(
    product: ProductEntity,
    page: Page,
    usdToEur: number
  ): Promise<RawPrices>;
}
