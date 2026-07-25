import type { SignalLevel } from "@gather/api-contract";
import type { PsaPopReportEntity } from "../../repository/ports/psaPopReport.repository.port";

export const BEST_OFFER_BOOST = 0.09;

export function computeListingSignal(
  marketSale: number,
  listing: number | null
): number {
  if (listing === null) return 0;
  const linear = (marketSale - listing) / marketSale;
  if (linear <= 0) return Math.max(-1, linear);
  return Math.sqrt(Math.min(1, linear));
}

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

export const LIQUIDITY_FLOOR_PER_DAY = 1 / 30.44;
export const LIQUIDITY_CEIL_PER_DAY = 1;

export function computeLiquiditySignal(salesPerDay: number): number {
  if (salesPerDay <= LIQUIDITY_FLOOR_PER_DAY) return 0;
  const span = Math.log(LIQUIDITY_CEIL_PER_DAY / LIQUIDITY_FLOOR_PER_DAY);
  const position = Math.log(salesPerDay / LIQUIDITY_FLOOR_PER_DAY);
  return Math.min(1, position / span);
}

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

export function computePopulationLevel(populationSignal: number): SignalLevel {
  if (populationSignal >= 0.75) return 'green-strong';
  if (populationSignal >= 0.50) return 'yellow-light';
  if (populationSignal >= 0.25) return 'orange-light';
  return 'red-strong';
}

export function computeGradeLevel(gradeSignal: number): SignalLevel {
  if (gradeSignal >= 0.90) return 'green-strong';
  if (gradeSignal >= 0.75) return 'yellow-light';
  if (gradeSignal >= 0.50) return 'orange-light';
  return 'red-strong';
}

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

export function computeScoreLevel(score: number): SignalLevel {
  if (score >= 35) return 'green-strong';
  if (score >= 20) return 'yellow-light';
  if (score >   0) return 'orange-light';
  return 'red-strong';
}

export const PREMIUM_WEIGHT_VINTAGE = 0.05;
export const PREMIUM_WEIGHT_MODERN  = 0.35;
const QUALITY_FIXED_WEIGHTS = 0.18 + 0.20 + 0.08;

export function computeQualitySignal(
  populationSignal: number,
  gradeSignal: number,
  ageSignal: number,
  premiumSignal: number,
): number {
  const premiumWeight =
    PREMIUM_WEIGHT_VINTAGE +
    (PREMIUM_WEIGHT_MODERN - PREMIUM_WEIGHT_VINTAGE) * (1 - ageSignal);
  return (
    (populationSignal * 0.18 +
      gradeSignal     * 0.20 +
      ageSignal       * 0.08 +
      premiumSignal   * premiumWeight) /
    (QUALITY_FIXED_WEIGHTS + premiumWeight)
  );
}

export const QUALITY_FLOOR = 0.25;

export function computeScore(
  listingSignal: number,
  qualitySignal: number
): number {
  return (
    listingSignal * (QUALITY_FLOOR + (1 - QUALITY_FLOOR) * qualitySignal) * 100
  );
}
