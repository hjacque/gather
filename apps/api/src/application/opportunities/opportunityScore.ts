import type { SignalLevel } from "@gather/api-contract";
import type { PsaPopReportEntity } from "../../repository/ports/psaPopReport.repository.port";

export function computeListingSignal(
  marketSale: number,
  listing: number | null
): number {
  if (listing === null) return 0;
  const linear = (marketSale - listing) / marketSale;
  // positive side: sqrt amplifies small discounts (1% → 0.10, 5% → 0.22, 20% → 0.45)
  // negative side: linear penalty, clamped at -1 (listing 2× market)
  if (linear >= 0) return Math.sqrt(Math.min(1, linear));
  return Math.max(-1, linear);
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

export function computeScoreLevel(score: number): SignalLevel {
  if (score >= 75) return 'green-strong';
  if (score >= 55) return 'yellow-light';
  if (score >= 0)  return 'orange-light';
  return 'red-strong';
}

export function computeScore(
  listingSignal: number,
  yearSignal: number,
  ageSignal: number,
  populationSignal: number,
  gradeSignal: number,
  premiumSignal: number
): number {
  return (
    listingSignal    * 0.75 +
    yearSignal       * 0.01 +
    populationSignal * 0.08 +
    gradeSignal      * 0.06 +
    ageSignal        * 0.07 +
    premiumSignal    * 0.03
  ) * 100;
}
