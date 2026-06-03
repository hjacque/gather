import { computeMarketPrices, SaleForPricing } from "./marketPrice";

const daysAgo = (now: Date, days: number): Date =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("computeMarketPrices", () => {
  const now = new Date("2026-06-02T00:00:00Z");

  it("returns no entries when there are no sales", () => {
    expect(computeMarketPrices([], now)).toEqual([]);
  });

  it("computes one estimate per grade, sorted by grade", () => {
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 500, soldAt: daysAgo(now, 1) },
      { psaGrade: 9, priceEur: 200, soldAt: daysAgo(now, 1) },
      { psaGrade: 9, priceEur: 220, soldAt: daysAgo(now, 1) },
    ];
    const result = computeMarketPrices(sales, now);
    expect(result.map((r) => r.psaGrade)).toEqual([9, 10]);
    expect(result.find((r) => r.psaGrade === 9)?.sampleSize).toBe(2);
  });

  it("never blends grades — a PSA 9 sale does not move the PSA 10 price", () => {
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 500, soldAt: daysAgo(now, 1) },
      { psaGrade: 9, priceEur: 100, soldAt: daysAgo(now, 1) },
    ];
    const result = computeMarketPrices(sales, now);
    expect(result.find((r) => r.psaGrade === 10)?.priceEur).toBe(500);
  });

  it("returns the median of equally-recent sales", () => {
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 100, soldAt: now },
      { psaGrade: 10, priceEur: 200, soldAt: now },
      { psaGrade: 10, priceEur: 900, soldAt: now },
    ];
    // Median resists the high outlier — mean would be 400.
    expect(computeMarketPrices(sales, now)[0].priceEur).toBe(200);
  });

  it("weights recent sales above old ones via exponential decay", () => {
    // One fresh sale at 100, many old (one half-life+) sales at 300. The fresh
    // sale carries enough weight that the weighted median sits at 100, not 300.
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 100, soldAt: now },
      { psaGrade: 10, priceEur: 300, soldAt: daysAgo(now, 60) },
      { psaGrade: 10, priceEur: 300, soldAt: daysAgo(now, 60) },
    ];
    // weights ≈ 1.0, 0.25, 0.25 → half = 0.75; cumulative hits the 100 bucket.
    expect(computeMarketPrices(sales, now, 30)[0].priceEur).toBe(100);
  });

  it("reports the newest sale date and sample size", () => {
    const newest = daysAgo(now, 2);
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 100, soldAt: daysAgo(now, 40) },
      { psaGrade: 10, priceEur: 120, soldAt: newest },
    ];
    const [record] = computeMarketPrices(sales, now);
    expect(record.sampleSize).toBe(2);
    expect(record.newestSoldAt).toEqual(newest);
  });

  it("derives sales-per-day over the oldest-sale-to-now span", () => {
    // 4 sales, oldest 20 days ago → span 20 days → 0.2 sales/day.
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 100, soldAt: daysAgo(now, 20) },
      { psaGrade: 10, priceEur: 100, soldAt: daysAgo(now, 10) },
      { psaGrade: 10, priceEur: 100, soldAt: daysAgo(now, 5) },
      { psaGrade: 10, priceEur: 100, soldAt: daysAgo(now, 1) },
    ];
    expect(computeMarketPrices(sales, now)[0].salesPerDay).toBeCloseTo(0.2);
  });

  it("a recent drought lowers the rate (span runs to now, not to newest sale)", () => {
    // 2 sales a year apart, newest 200 days ago → span 565 days → ~0.0035/day.
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 100, soldAt: daysAgo(now, 565) },
      { psaGrade: 10, priceEur: 100, soldAt: daysAgo(now, 200) },
    ];
    expect(computeMarketPrices(sales, now)[0].salesPerDay).toBeCloseTo(2 / 565);
  });

  it("floors the span at one day so same-day clusters stay finite", () => {
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 100, soldAt: now },
      { psaGrade: 10, priceEur: 100, soldAt: now },
      { psaGrade: 10, priceEur: 100, soldAt: now },
    ];
    expect(computeMarketPrices(sales, now)[0].salesPerDay).toBe(3);
  });

  it("ignores sales after the as-of instant (for day-over-day reconstruction)", () => {
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 100, soldAt: daysAgo(now, 3) },
      { psaGrade: 10, priceEur: 500, soldAt: now }, // sold "today"
    ];
    // As of yesterday, today's 500 sale doesn't exist yet → price is just 100.
    const asOfYesterday = computeMarketPrices(sales, daysAgo(now, 1));
    expect(asOfYesterday[0].priceEur).toBe(100);
    expect(asOfYesterday[0].sampleSize).toBe(1);
  });

  it("handles a single sale", () => {
    const sales: SaleForPricing[] = [
      { psaGrade: 10, priceEur: 420, soldAt: daysAgo(now, 5) },
    ];
    expect(computeMarketPrices(sales, now)[0].priceEur).toBe(420);
  });

  describe("Best-Offer / review gating", () => {
    it("excludes an unreviewed Best-Offer (inflated ask, not a realized price)", () => {
      const sales: SaleForPricing[] = [
        { psaGrade: 10, priceEur: 500, soldAt: now },
        {
          psaGrade: 10,
          priceEur: 9999,
          soldAt: now,
          isBestOffer: true,
          reviewedAt: null,
        },
      ];
      const record = computeMarketPrices(sales, now)[0];
      // The 9999 Best-Offer ask is ignored; only the 500 realized sale counts.
      expect(record.priceEur).toBe(500);
      expect(record.sampleSize).toBe(1);
    });

    it("includes a reviewed Best-Offer (true price entered)", () => {
      const sales: SaleForPricing[] = [
        {
          psaGrade: 10,
          priceEur: 480,
          soldAt: now,
          isBestOffer: true,
          reviewedAt: now,
        },
      ];
      const record = computeMarketPrices(sales, now)[0];
      expect(record.priceEur).toBe(480);
      expect(record.sampleSize).toBe(1);
    });

    it("includes non-Best-Offer sales regardless of review state", () => {
      const sales: SaleForPricing[] = [
        {
          psaGrade: 10,
          priceEur: 300,
          soldAt: now,
          isBestOffer: false,
          reviewedAt: null,
        },
      ];
      expect(computeMarketPrices(sales, now)[0].sampleSize).toBe(1);
    });

    it("yields no estimate for a grade whose only sale is an unreviewed Best-Offer", () => {
      const sales: SaleForPricing[] = [
        {
          psaGrade: 9,
          priceEur: 250,
          soldAt: now,
          isBestOffer: true,
          reviewedAt: null,
        },
      ];
      expect(computeMarketPrices(sales, now)).toEqual([]);
    });
  });
});
