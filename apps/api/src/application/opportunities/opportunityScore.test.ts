import { computeListingConfidence } from "./opportunityScore";

const NOW = new Date("2026-06-11T12:00:00Z");

const daysAgo = (days: number): Date =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

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
