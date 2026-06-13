import {
  computeListingConfidence,
  computeListingSignal,
  computeLiquiditySignal,
  computeQualitySignal,
  computeScore,
} from "./opportunityScore";

const NOW = new Date("2026-06-11T12:00:00Z");

const daysAgo = (days: number): Date =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("computeListingSignal", () => {
  it("scores 0 at market price, positive for any discount however small", () => {
    expect(computeListingSignal(100, 100)).toBe(0);
    expect(computeListingSignal(100, 99)).toBeGreaterThan(0);
    expect(computeListingSignal(100, 97)).toBeGreaterThan(0);
  });

  it("rises smoothly with sqrt amplification", () => {
    // 10% off: sqrt(0.10) ≈ 0.316
    expect(computeListingSignal(100, 90)).toBeCloseTo(0.316, 2);
    // 20% off: sqrt(0.20) ≈ 0.447
    expect(computeListingSignal(100, 80)).toBeCloseTo(0.447, 2);
    // free card caps at 1
    expect(computeListingSignal(100, 0)).toBe(1);
  });

  it("penalizes listings above market linearly, clamped at -1", () => {
    expect(computeListingSignal(100, 120)).toBeCloseTo(-0.2);
    expect(computeListingSignal(100, 300)).toBe(-1);
  });

  it("is 0 without a listing", () => {
    expect(computeListingSignal(100, null)).toBe(0);
  });
});

describe("computeListingConfidence", () => {
  it("gives full confidence to 5+ recent sales", () => {
    expect(computeListingConfidence(5, daysAgo(0), NOW)).toBe(1);
    expect(computeListingConfidence(50, daysAgo(0), NOW)).toBe(1);
  });

  it("scales linearly with sample size below the full-confidence threshold", () => {
    expect(computeListingConfidence(1, daysAgo(0), NOW)).toBeCloseTo(0.2);
    expect(computeListingConfidence(2, daysAgo(0), NOW)).toBeCloseTo(0.4);
    expect(computeListingConfidence(4, daysAgo(0), NOW)).toBeCloseTo(0.8);
  });

  it("keeps full recency credit within the 14-day grace window", () => {
    expect(computeListingConfidence(5, daysAgo(14), NOW)).toBe(1);
  });

  it("halves recency credit 30 days past the grace window", () => {
    expect(computeListingConfidence(5, daysAgo(44), NOW)).toBeCloseTo(0.5);
    expect(computeListingConfidence(5, daysAgo(74), NOW)).toBeCloseTo(0.25);
  });

  it("multiplies the sample and recency factors", () => {
    // 1 sale (0.2) that is 44 days old (0.5).
    expect(computeListingConfidence(1, daysAgo(44), NOW)).toBeCloseTo(0.1);
  });

  it("treats a future newestSoldAt as fully recent rather than over-crediting", () => {
    expect(computeListingConfidence(5, daysAgo(-3), NOW)).toBe(1);
  });
});

describe("computeLiquiditySignal", () => {
  it("is 0 at one sale per month or slower", () => {
    expect(computeLiquiditySignal(1 / 30.44)).toBe(0);
    expect(computeLiquiditySignal(0.001)).toBe(0);
    expect(computeLiquiditySignal(0)).toBe(0);
  });

  it("is 1 at one sale per day or faster", () => {
    expect(computeLiquiditySignal(1)).toBe(1);
    expect(computeLiquiditySignal(4)).toBe(1);
  });

  it("places one sale per week mid-scale on the log axis", () => {
    // log(30.44/7) / log(30.44) ≈ 0.43
    expect(computeLiquiditySignal(1 / 7)).toBeCloseTo(0.43, 2);
  });

  it("grows monotonically with sale velocity", () => {
    const velocities = [0.05, 0.1, 0.2, 0.5, 0.9];
    const signals = velocities.map(computeLiquiditySignal);
    expect([...signals].sort((a, b) => a - b)).toEqual(signals);
  });
});

describe("computeScore (multiplicative)", () => {
  it("scores 0 with no discount, regardless of card quality", () => {
    expect(computeScore(0, 1)).toBe(0);
  });

  it("goes negative for overpriced listings so they can be filtered out", () => {
    expect(computeScore(-0.5, 1)).toBeLessThan(0);
  });

  it("applies the quality floor: worst-quality card keeps 25% of the deal", () => {
    expect(computeScore(0.5, 0)).toBeCloseTo(12.5);
  });

  it("passes the deal through fully at maximum quality", () => {
    expect(computeScore(0.5, 1)).toBeCloseTo(50);
  });

  it("lets quality leverage a deal by at most 4×", () => {
    expect(computeScore(0.25, 1)).toBeCloseTo(computeScore(1, 0));
  });
});

describe("computeQualitySignal", () => {
  it("is 0 when every component is at its worst and 1 when all are at their best", () => {
    expect(computeQualitySignal(0, 0, 0, 0)).toBe(0);
    expect(computeQualitySignal(1, 1, 1, 1)).toBeCloseTo(1);
  });

  it("penalizes PSA 9 much more on modern cards than on vintage cards", () => {
    // Mid-quality non-premium signals to isolate the premium effect.
    const pop = 0.5, grade = 0.5;
    const modernAge = 0, vintageAge = 1;

    const modernPsa10  = computeQualitySignal(pop, grade, modernAge,  1);
    const modernPsa9   = computeQualitySignal(pop, grade, modernAge,  0);
    const vintagePsa10 = computeQualitySignal(pop, grade, vintageAge, 1);
    const vintagePsa9  = computeQualitySignal(pop, grade, vintageAge, 0);

    const modernGap  = modernPsa10  - modernPsa9;
    const vintageGap = vintagePsa10 - vintagePsa9;

    // Modern gap should be ~4× the vintage gap.
    expect(modernGap).toBeGreaterThan(vintageGap * 3);
  });
});
