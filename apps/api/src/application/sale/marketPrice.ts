import { SaleEntity } from "../../entities/sale.entity";
import { convertToEur } from "./eurConverter";

type SaleForPricing = {
  psaGrade: number;
  priceEur: number;
  soldAt: Date;
};

const toSalesForPricing = (
  sales: SaleEntity[],
  usdToEur: number
): SaleForPricing[] =>
  sales.flatMap((sale) => {
    if (sale.status === "invalid") return [];
    if (sale.isBestOffer && sale.source !== "terapeak") return [];
    const priceEur = convertToEur(sale.price, sale.currency, usdToEur);
    if (priceEur === null) return [];
    return [
      {
        psaGrade: sale.psaGrade,
        priceEur,
        soldAt: sale.soldAt,
      },
    ];
  });

export type GradeMarketPrice = {
  psaGrade: number;
  priceEur: number;
  sampleSize: number;
  newestSoldAt: Date;
  salesPerDay: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_HALF_LIFE_DAYS = 30;

export const computeMarketPrices = (
  sales: SaleEntity[],
  usdToEur: number,
  now: Date = new Date(),
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS
): GradeMarketPrice[] =>
  computeFromEligible(toSalesForPricing(sales, usdToEur), now, halfLifeDays);

const computeFromEligible = (
  sales: SaleForPricing[],
  now: Date,
  halfLifeDays: number
): GradeMarketPrice[] => {
  const byGrade = new Map<number, SaleForPricing[]>();
  for (const sale of sales) {
    if (sale.soldAt > now) continue;
    const list = byGrade.get(sale.psaGrade);
    if (list) list.push(sale);
    else byGrade.set(sale.psaGrade, [sale]);
  }

  const result: GradeMarketPrice[] = [];
  for (const [psaGrade, gradeSales] of byGrade) {
    const priceEur = weightedMedian(gradeSales, now, halfLifeDays);
    if (priceEur === null) continue;

    const newestSoldAt = gradeSales.reduce(
      (max, s) => (s.soldAt > max ? s.soldAt : max),
      gradeSales[0].soldAt
    );
    const oldestSoldAt = gradeSales.reduce(
      (min, s) => (s.soldAt < min ? s.soldAt : min),
      gradeSales[0].soldAt
    );

    const spanDays = Math.max(
      (now.getTime() - oldestSoldAt.getTime()) / DAY_MS,
      1
    );

    result.push({
      psaGrade,
      priceEur,
      sampleSize: gradeSales.length,
      newestSoldAt,
      salesPerDay: gradeSales.length / spanDays,
    });
  }

  return result.sort((a, b) => a.psaGrade - b.psaGrade);
};

const weightedMedian = (
  sales: SaleForPricing[],
  now: Date,
  halfLifeDays: number
): number | null => {
  if (sales.length === 0) return null;

  const weighted = sales.map((s) => {
    const ageDays = (now.getTime() - s.soldAt.getTime()) / DAY_MS;
    const weight = Math.pow(0.5, Math.max(0, ageDays) / halfLifeDays);
    return { price: s.priceEur, weight };
  });

  weighted.sort((a, b) => a.price - b.price);

  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  if (total <= 0) return null;

  const half = total / 2;
  let cum = 0;
  for (let i = 0; i < weighted.length; i++) {
    cum += weighted[i].weight;
    if (cum > half) return weighted[i].price;
    if (cum === half) {
      const next = weighted[i + 1];
      return next ? (weighted[i].price + next.price) / 2 : weighted[i].price;
    }
  }
  return weighted[weighted.length - 1].price;
};
