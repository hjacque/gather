import { SaleEntity } from "../../entities/sale.entity";
import { computeMarketPrices } from "./marketPrice";

const daysAgo = (now: Date, days: number): Date =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const RATE = 0.9;

let seq = 0;
const sale = (
  overrides: Partial<SaleEntity> &
    Pick<SaleEntity, "psaGrade" | "price" | "soldAt">
): SaleEntity => {
  seq++;
  return {
    id: `sale-${seq}`,
    cardId: "card-1",
    platform: "ebay",
    itemId: `item-${seq}`,
    currency: "EUR",
    title: "test listing",
    isBestOffer: false,
    seller: null,
    status: "confirmed",
    verificationStage: "complete",
    source: "terapeak",
    reviewedAt: null,
    createdAt: overrides.soldAt,
    updatedAt: overrides.soldAt,
    ...overrides,
  };
};

describe("computeMarketPrices", () => {
  const now = new Date("2026-06-02T00:00:00Z");

  it("returns no entries when there are no sales", () => {
    expect(computeMarketPrices([], RATE, now)).toEqual([]);
  });

  it("computes one estimate per grade, sorted by grade", () => {
    const sales = [
      sale({ psaGrade: 10, price: 500, soldAt: daysAgo(now, 1) }),
      sale({ psaGrade: 9, price: 200, soldAt: daysAgo(now, 1) }),
      sale({ psaGrade: 9, price: 220, soldAt: daysAgo(now, 1) }),
    ];
    const result = computeMarketPrices(sales, RATE, now);
    expect(result.map((r) => r.psaGrade)).toEqual([9, 10]);
    expect(result.find((r) => r.psaGrade === 9)?.sampleSize).toBe(2);
  });

  it("never blends grades — a PSA 9 sale does not move the PSA 10 price", () => {
    const sales = [
      sale({ psaGrade: 10, price: 500, soldAt: daysAgo(now, 1) }),
      sale({ psaGrade: 9, price: 100, soldAt: daysAgo(now, 1) }),
    ];
    const result = computeMarketPrices(sales, RATE, now);
    expect(result.find((r) => r.psaGrade === 10)?.priceEur).toBe(500);
  });

  it("returns the median of equally-recent sales", () => {
    const sales = [
      sale({ psaGrade: 10, price: 100, soldAt: now }),
      sale({ psaGrade: 10, price: 200, soldAt: now }),
      sale({ psaGrade: 10, price: 900, soldAt: now }),
    ];
    expect(computeMarketPrices(sales, RATE, now)[0].priceEur).toBe(200);
  });

  it("weights recent sales above old ones via exponential decay", () => {
    const sales = [
      sale({ psaGrade: 10, price: 100, soldAt: now }),
      sale({ psaGrade: 10, price: 300, soldAt: daysAgo(now, 60) }),
      sale({ psaGrade: 10, price: 300, soldAt: daysAgo(now, 60) }),
    ];
    expect(computeMarketPrices(sales, RATE, now, 30)[0].priceEur).toBe(100);
  });

  it("reports the newest sale date and sample size", () => {
    const newest = daysAgo(now, 2);
    const sales = [
      sale({ psaGrade: 10, price: 100, soldAt: daysAgo(now, 40) }),
      sale({ psaGrade: 10, price: 120, soldAt: newest }),
    ];
    const [record] = computeMarketPrices(sales, RATE, now);
    expect(record.sampleSize).toBe(2);
    expect(record.newestSoldAt).toEqual(newest);
  });

  it("derives sales-per-day over the oldest-sale-to-now span", () => {
    const sales = [
      sale({ psaGrade: 10, price: 100, soldAt: daysAgo(now, 20) }),
      sale({ psaGrade: 10, price: 100, soldAt: daysAgo(now, 10) }),
      sale({ psaGrade: 10, price: 100, soldAt: daysAgo(now, 5) }),
      sale({ psaGrade: 10, price: 100, soldAt: daysAgo(now, 1) }),
    ];
    expect(computeMarketPrices(sales, RATE, now)[0].salesPerDay).toBeCloseTo(0.2);
  });

  it("a recent drought lowers the rate (span runs to now, not to newest sale)", () => {
    const sales = [
      sale({ psaGrade: 10, price: 100, soldAt: daysAgo(now, 565) }),
      sale({ psaGrade: 10, price: 100, soldAt: daysAgo(now, 200) }),
    ];
    expect(computeMarketPrices(sales, RATE, now)[0].salesPerDay).toBeCloseTo(
      2 / 565
    );
  });

  it("floors the span at one day so same-day clusters stay finite", () => {
    const sales = [
      sale({ psaGrade: 10, price: 100, soldAt: now }),
      sale({ psaGrade: 10, price: 100, soldAt: now }),
      sale({ psaGrade: 10, price: 100, soldAt: now }),
    ];
    expect(computeMarketPrices(sales, RATE, now)[0].salesPerDay).toBe(3);
  });

  it("ignores sales after the as-of instant (for day-over-day reconstruction)", () => {
    const sales = [
      sale({ psaGrade: 10, price: 100, soldAt: daysAgo(now, 3) }),
      sale({ psaGrade: 10, price: 500, soldAt: now }), // sold "today"
    ];
    const asOfYesterday = computeMarketPrices(sales, RATE, daysAgo(now, 1));
    expect(asOfYesterday[0].priceEur).toBe(100);
    expect(asOfYesterday[0].sampleSize).toBe(1);
  });

  it("handles a single sale", () => {
    const sales = [sale({ psaGrade: 10, price: 420, soldAt: daysAgo(now, 5) })];
    expect(computeMarketPrices(sales, RATE, now)[0].priceEur).toBe(420);
  });

  describe("eligibility", () => {
    it("excludes invalid sales (moderation replaces outlier rejection)", () => {
      const sales = [
        sale({ psaGrade: 10, price: 500, soldAt: now }),
        sale({ psaGrade: 10, price: 9, soldAt: now, status: "invalid" }),
      ];
      const [record] = computeMarketPrices(sales, RATE, now);
      expect(record.priceEur).toBe(500);
      expect(record.sampleSize).toBe(1);
    });

    it("converts USD sales to EUR at the given rate", () => {
      const sales = [
        sale({ psaGrade: 10, price: 1000, soldAt: now, currency: "USD" }),
      ];
      expect(computeMarketPrices(sales, RATE, now)[0].priceEur).toBe(900);
    });

    it("excludes sales in currencies we cannot convert yet (ADR 0004)", () => {
      const sales = [
        sale({ psaGrade: 10, price: 500, soldAt: now }),
        sale({ psaGrade: 10, price: 480, soldAt: now, currency: "GBP" }),
      ];
      const [record] = computeMarketPrices(sales, RATE, now);
      expect(record.priceEur).toBe(500);
      expect(record.sampleSize).toBe(1);
    });

    it("yields no estimate when all sales are ineligible", () => {
      const sales = [
        sale({ psaGrade: 10, price: 500, soldAt: now, status: "invalid" }),
        sale({ psaGrade: 10, price: 480, soldAt: now, currency: "JPY" }),
      ];
      expect(computeMarketPrices(sales, RATE, now)).toEqual([]);
    });
  });

  describe("Best-Offer gating (ADR 0011)", () => {
    it("excludes an ebay_search Best-Offer sale (ask price, not realized)", () => {
      const sales = [
        sale({ psaGrade: 10, price: 500, soldAt: now }),
        sale({
          psaGrade: 10,
          price: 9999,
          soldAt: now,
          isBestOffer: true,
          source: "ebay_search",
        }),
      ];
      const [record] = computeMarketPrices(sales, RATE, now);
      expect(record.priceEur).toBe(500);
      expect(record.sampleSize).toBe(1);
    });

    it("yields no estimate for a grade whose only sale is an unpriced Best-Offer", () => {
      const sales = [
        sale({
          psaGrade: 9,
          price: 250,
          soldAt: now,
          isBestOffer: true,
          source: "ebay_search",
        }),
      ];
      expect(computeMarketPrices(sales, RATE, now)).toEqual([]);
    });

    it("counts a Terapeak-priced Best-Offer sale, flag and all", () => {
      const sales = [
        sale({
          psaGrade: 10,
          price: 820,
          soldAt: now,
          isBestOffer: true,
          source: "terapeak",
        }),
      ];
      expect(computeMarketPrices(sales, RATE, now)[0].sampleSize).toBe(1);
    });

    it("counts a Best-Offer sale Terapeak verified after an ebay_search sighting", () => {
      const sales = [
        sale({
          psaGrade: 10,
          price: 820,
          soldAt: now,
          isBestOffer: true,
          source: "terapeak_verified",
        }),
      ];
      expect(computeMarketPrices(sales, RATE, now)[0].sampleSize).toBe(1);
    });
  });
});
