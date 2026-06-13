import type { SignalLevel } from "@gather/api-contract";
import type { PsaPopReportEntity } from "../../repository/ports/psaPopReport.repository.port";

// Discounts inside the dead zone score 0: the Market Sale Price is a median
// over scattered comps, so a few percent "below market" is estimation noise —
// a fair price, not a deal. Sized for collecting; a flipper would raise this
// to the ~13–15% sell-side fee hurdle.
export const DISCOUNT_DEAD_ZONE = 0.03;

export function computeListingSignal(
  marketSale: number,
  listing: number | null
): number {
  if (listing === null) return 0;
  const linear = (marketSale - listing) / marketSale;
  // negative side: linear penalty, clamped at -1 (listing 2× market)
  if (linear <= 0) return Math.max(-1, linear);
  if (linear <= DISCOUNT_DEAD_ZONE) return 0;
  // sqrt re-anchored at the dead zone: smooth from zero, still amplifies
  // modest discounts (10% → 0.27, 20% → 0.42, 50% → 0.70)
  return Math.sqrt(
    Math.min(1, (linear - DISCOUNT_DEAD_ZONE) / (1 - DISCOUNT_DEAD_ZONE))
  );
}

// Confidence in a grade's Market Sale Price, used to scale the listing signal:
// a discount against a median built on one stale comp is noise, not opportunity.
// Sample side: linear credit up to FULL_CONFIDENCE_SAMPLE sales. Recency side:
// full credit while the newest sale is within the grace window, then the same
// 30-day half-life decay the weighted median itself uses. Both sides are 1 for
// well-supported prices, so confident discounts score exactly as before.
export const FULL_CONFIDENCE_SAMPLE = 5;
export const CONFIDENCE_GRACE_DAYS = 14;
export const CONFIDENCE_HALF_LIFE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeListingConfidence(
  sampleSize: number,
  newestSoldAt: Date,
  now: Date
): number {
  const sampleFactor = Math.min(1, sampleSize / FULL_CONFIDENCE_SAMPLE);
  const ageDays = Math.max(0, (now.getTime() - newestSoldAt.getTime()) / DAY_MS);
  const staleDays = Math.max(0, ageDays - CONFIDENCE_GRACE_DAYS);
  const recencyFactor = Math.pow(0.5, staleDays / CONFIDENCE_HALF_LIFE_DAYS);
  return sampleFactor * recencyFactor;
}

// Liquidity: how fast this grade trades, i.e. how easily a buyer could exit.
// Log scale because the gap between 1/month and 1/week matters far more than
// the gap between 2/day and 3/day: 0 at one sale per month or slower, 1 at one
// sale per day or faster. Distinct from confidence — five lifetime sales with a
// recent one give a trustworthy price (confidence 1) but can still be a market
// where exiting takes months.
export const LIQUIDITY_FLOOR_PER_DAY = 1 / 30.44; // one sale a month
export const LIQUIDITY_CEIL_PER_DAY = 1; // one sale a day

export function computeLiquiditySignal(salesPerDay: number): number {
  if (salesPerDay <= LIQUIDITY_FLOOR_PER_DAY) return 0;
  const span = Math.log(LIQUIDITY_CEIL_PER_DAY / LIQUIDITY_FLOOR_PER_DAY);
  const position = Math.log(salesPerDay / LIQUIDITY_FLOOR_PER_DAY);
  return Math.min(1, position / span);
}

// Quartile boundaries match population/age. On the log scale: ≥0.75 ≈ 3/week,
// ≥0.50 ≈ 1.3/week, ≥0.25 ≈ 2.3/month.
export function computeLiquidityLevel(liquiditySignal: number): SignalLevel {
  if (liquiditySignal >= 0.75) return 'green-strong';
  if (liquiditySignal >= 0.50) return 'yellow-light';
  if (liquiditySignal >= 0.25) return 'orange-light';
  return 'red-strong';
}

export function computeYearSignal(
  marketSale: number,
  range: { min: number; max: number } | null | undefined
): number {
  if (!range) return 0;
  const { min, max } = range;
  if (max === min) return 0;
  return Math.max(0, Math.min(1, 1 - (marketSale - min) / (max - min)));
}

export function computePopsAtOrAbove(
  report: PsaPopReportEntity,
  grade: number
): number {
  let sum = 0;
  for (let g = grade; g <= 10; g++) {
    sum += (report[`grade${g}` as keyof PsaPopReportEntity] as number | null) ?? 0;
  }
  return sum;
}

export function computeGradeSignal(
  report: PsaPopReportEntity,
  grade: number
): number {
  const total = report.total;
  if (!total) return 0;
  const popsAtOrAbove = computePopsAtOrAbove(report, grade);
  return 1 - popsAtOrAbove / total;
}

// Normalize values to [0,1] where smaller original value → higher output (invert).
// Null values → 0. When all valid values are equal → 0.5.
export function normalizeInverted(rawValues: (number | null)[]): number[] {
  const valid = rawValues.filter((v): v is number => v !== null);
  if (valid.length === 0) return rawValues.map(() => 0);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return rawValues.map((v) => {
    if (v === null) return 0;
    if (min === max) return 0.5;
    return 1 - (v - min) / (max - min);
  });
}

// ── Signal level functions ────────────────────────────────────────────────────
// Each function encodes the agreed threshold rules so the frontend only renders.

export function computeDiscountLevel(marketSale: number, listing: number | null): SignalLevel {
  if (listing === null) return 'yellow-light';
  const pct = ((listing - marketSale) / marketSale) * 100;
  if (pct <= -10) return 'green-strong';
  if (pct <=   5) return 'yellow-light';
  if (pct <=  15) return 'orange-light';
  return 'red-strong';
}

export function computeYearLevel(yearSignal: number): SignalLevel {
  if (yearSignal >= 0.70) return 'green-strong';
  if (yearSignal >= 0.45) return 'yellow-light';
  if (yearSignal >= 0.20) return 'orange-light';
  return 'red-strong';
}

// populationSignal is normalized across the collection (higher = scarcer = better).
// Quartile boundaries: Q1 ≥0.75, Q2 ≥0.50, Q3 ≥0.25, Q4 <0.25.
export function computePopulationLevel(populationSignal: number): SignalLevel {
  if (populationSignal >= 0.75) return 'green-strong';
  if (populationSignal >= 0.50) return 'yellow-light';
  if (populationSignal >= 0.25) return 'orange-light';
  return 'red-strong';
}

// gradeSignal normalized across collection (higher = rarer grade = better).
// Top 10% → strong, 10–25% → light, 25–50% → orange, bottom 50% → strong bad.
export function computeGradeLevel(gradeSignal: number): SignalLevel {
  if (gradeSignal >= 0.90) return 'green-strong';
  if (gradeSignal >= 0.75) return 'yellow-light';
  if (gradeSignal >= 0.50) return 'orange-light';
  return 'red-strong';
}

// ageSignal normalized across collection (higher = older = better).
// Quartile boundaries match population.
export function computeAgeLevel(ageSignal: number): SignalLevel {
  if (ageSignal >= 0.75) return 'green-strong';
  if (ageSignal >= 0.50) return 'yellow-light';
  if (ageSignal >= 0.25) return 'orange-light';
  return 'red-strong';
}

export function computePremiumSignal(grade: number): number {
  return grade === 10 ? 1 : 0;
}

export function computePremiumLevel(grade: number): SignalLevel {
  return grade === 10 ? 'green-strong' : 'red-strong';
}

// Calibrated to the multiplicative scale: 35 ≈ a 20% discount on a strong
// card, 20 ≈ a 10% discount on a decent one. Non-positive scores never reach
// the page (rankOpportunities filters them), so red is vestigial.
export function computeScoreLevel(score: number): SignalLevel {
  if (score >= 35) return 'green-strong';
  if (score >= 20) return 'yellow-light';
  if (score >   0) return 'orange-light';
  return 'red-strong';
}

// How desirable the card itself is, independent of today's listing.
// The PSA 10 premium weight scales with modernity: vintage cards tolerate PSA 9
// (weight stays near 0.05), modern cards strongly prefer PSA 10 (weight → 0.35).
// All other weights are fixed; the denominator adjusts so the result stays in [0,1].
export const PREMIUM_WEIGHT_VINTAGE = 0.05;
export const PREMIUM_WEIGHT_MODERN  = 0.35;
const QUALITY_FIXED_WEIGHTS = 0.18 + 0.20 + 0.08 + 0.08; // 0.54

export function computeQualitySignal(
  populationSignal: number,
  gradeSignal: number,
  ageSignal: number,
  premiumSignal: number,
  liquiditySignal: number
): number {
  const premiumWeight =
    PREMIUM_WEIGHT_VINTAGE +
    (PREMIUM_WEIGHT_MODERN - PREMIUM_WEIGHT_VINTAGE) * (1 - ageSignal);
  return (
    (populationSignal * 0.18 +
      gradeSignal     * 0.20 +
      ageSignal       * 0.08 +
      premiumSignal   * premiumWeight +
      liquiditySignal * 0.08) /
    (QUALITY_FIXED_WEIGHTS + premiumWeight)
  );
}

// Quality modulates the deal instead of substituting for it: a card at market
// price is not an opportunity no matter how desirable it is. The floor caps
// quality's leverage — it scales a given discount by 0.4×–1×, so a grail can
// outrank a junk card with up to 2.5× its deal signal, never "no deal".
export const QUALITY_FLOOR = 0.4;

export function computeScore(
  listingSignal: number,
  qualitySignal: number
): number {
  return (
    listingSignal * (QUALITY_FLOOR + (1 - QUALITY_FLOOR) * qualitySignal) * 100
  );
}
