import { SaleEntity } from "../../entities/sale.entity";
import { convertToEur } from "./eurConverter";
import { computeMarketPrices } from "./marketPrice";

// Reduce a card's raw sales to its PSA 10 market price in EUR: drop
// cancelled/invalid sales and unconvertible currencies, convert to EUR, then
// take the recency-weighted median of the PSA 10 grade. Null when no usable
// PSA 10 sales.
export const psa10MarketPriceFromSales = (
  sales: SaleEntity[],
  usdToEur: number,
  now: Date = new Date()
): number | null => {
  const forPricing = sales.flatMap((sale) => {
    if (sale.status === "cancelled" || sale.status === "invalid") return [];
    const priceEur = convertToEur(sale.price, sale.currency, usdToEur);
    if (priceEur === null) return [];
    return [{ psaGrade: sale.psaGrade, priceEur, soldAt: sale.soldAt }];
  });

  const psa10 = computeMarketPrices(forPricing, now).find(
    (m) => m.psaGrade === 10
  );
  return psa10?.priceEur ?? null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_WINDOW_DAYS = 7;

// PSA 10 market price now and as of TREND_WINDOW_DAYS ago. The prior figure
// re-runs the weighted median with the clock wound back, so the delta tracks the
// market price itself rather than the CardMarket listing. A 7-day window is wide
// enough that infrequently-traded cards still register a move.
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
