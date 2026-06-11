import { SaleEntity } from "../../entities/sale.entity";
import { computeMarketPrices } from "./marketPrice";

// A card's PSA 10 Market Sale Price in EUR, or null when the grade has no
// usable sales. Eligibility and conversion live in computeMarketPrices.
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
