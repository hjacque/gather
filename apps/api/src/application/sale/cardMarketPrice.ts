import { SaleEntity } from "../../entities/sale.entity";
import { computeMarketPrices } from "./marketPrice";

export const psa10MarketPriceFromSales = (
  sales: SaleEntity[],
  usdToEur: number,
  now: Date = new Date()
): number | null => {
  const psa10 = computeMarketPrices(sales, usdToEur, now).find(
    (m) => m.psaGrade === 10
  );
  return psa10?.priceEur ?? null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_WINDOW_DAYS = 7;

export const psa10MarketPriceWithPrior = (
  sales: SaleEntity[],
  usdToEur: number,
  now: Date = new Date()
): { today: number | null; prior: number | null } => ({
  today: psa10MarketPriceFromSales(sales, usdToEur, now),
  prior: psa10MarketPriceFromSales(
    sales,
    usdToEur,
    new Date(now.getTime() - TREND_WINDOW_DAYS * DAY_MS)
  ),
});
