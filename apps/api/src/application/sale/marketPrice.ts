// Per-grade "market price" from a card's eBay sale history. Each PSA grade is a
// separate market, priced independently. The estimate is a recency-weighted
// median of the grade's EUR sale prices (exponential age decay, default 30-day
// half-life). The median resists off comps; genuinely wrong listings are
// excluded upstream by moderation (status invalid/cancelled), so there is no
// automatic outlier rejection here.

export type SaleForPricing = {
  psaGrade: number;
  priceEur: number;
  soldAt: Date;
};

export type GradeMarketPrice = {
  psaGrade: number;
  priceEur: number;
  sampleSize: number;
  newestSoldAt: Date;
  // Sales per day over the span from the oldest sale to `now`, so a recent
  // drought lowers the rate. Rendered in whatever unit reads cleanly (/day…/yr).
  salesPerDay: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_HALF_LIFE_DAYS = 30;

export const computeMarketPrices = (
  sales: SaleForPricing[],
  now: Date = new Date(),
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS
): GradeMarketPrice[] => {
  const byGrade = new Map<number, SaleForPricing[]>();
  for (const sale of sales) {
    // Ignore sales after `now` so callers can reconstruct the price as of a past
    // date (used for the 7-day trend baseline).
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

    // Floor the span at one day so a cluster of same-day sales can't drive the
    // rate to infinity.
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

// Median of `priceEur` where each sale is weighted by exp-decay on its age.
// Returns the price at which cumulative weight first crosses half the total;
// on an exact boundary the two straddling prices are averaged.
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
