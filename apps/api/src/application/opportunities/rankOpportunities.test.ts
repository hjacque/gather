import { CardEntity } from "../../entities/card.entity";
import { CardSetEntity } from "../../entities/cardSet.entity";
import { SaleEntity } from "../../entities/sale.entity";
import type { PsaPopReportEntity } from "../../repository/ports/psaPopReport.repository.port";
import {
  rankOpportunities,
  OpportunityInputs,
  GradeYearRange,
} from "./rankOpportunities";
import type { ListingOffer } from "./mergeListingOffers";

const NOW = new Date("2026-06-11T12:00:00Z");
const RATE = 0.9;

const daysAgo = (days: number): Date =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const CARD_SET: CardSetEntity = {
  id: "set-1",
  name: "Test Set",
  code: "TST",
  releaseDate: new Date("2021-03-19"),
  block: null,
  createdAt: NOW,
  updatedAt: NOW,
};

type CardWithSet = CardEntity & { cardSet: CardSetEntity };

const card = (id: string, overrides: Partial<CardEntity> = {}): CardWithSet => ({
  id,
  name: `Card ${id}`,
  foilPattern: null,
  imageUrl: null,
  releaseDate: new Date("2021-03-19"),
  cardSetId: CARD_SET.id,
  cardMarketLink: null,
  psaLink: null,
  ebayLink: null,
  ebayFrLink: null,
  number: null,
  note: null,
  tags: [],
  regions: [],
  createdAt: NOW,
  updatedAt: NOW,
  cardSet: CARD_SET,
  ...overrides,
});

let seq = 0;
const sale = (
  cardId: string,
  psaGrade: number,
  price: number,
  overrides: Partial<SaleEntity> = {}
): SaleEntity => {
  seq++;
  return {
    id: `sale-${seq}`,
    cardId,
    platform: "ebay",
    itemId: `item-${seq}`,
    psaGrade,
    price,
    currency: "EUR",
    title: "test listing",
    isBestOffer: false,
    seller: null,
    status: "confirmed",
    verificationStage: "complete",
    source: "terapeak",
    reviewedAt: null,
    soldAt: daysAgo(5),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    ...overrides,
  };
};

const report = (
  cardId: string,
  grades: Partial<Record<`grade${number}`, number>>
): PsaPopReportEntity => {
  const counts = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      `grade${i + 1}`,
      grades[`grade${i + 1}`] ?? 0,
    ])
  ) as Record<`grade${number}`, number>;
  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
  return {
    id: `report-${cardId}`,
    cardId,
    ...counts,
    total,
    syncedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  } as PsaPopReportEntity;
};

const offer = (price: number | ListingOffer | null): ListingOffer | null =>
  typeof price === "number"
    ? { priceEur: price, source: "cardmarket", url: null, isBestOffer: false }
    : price;

const inputs = (init: {
  cards: CardWithSet[];
  sales?: SaleEntity[];
  listings?: Record<string, Record<number, number | ListingOffer | null>>;
  yearRanges?: Record<string, Record<number, GradeYearRange>>;
  reports?: PsaPopReportEntity[];
}): OpportunityInputs => {
  const salesByCard = new Map<string, SaleEntity[]>();
  for (const s of init.sales ?? []) {
    const list = salesByCard.get(s.cardId);
    if (list) list.push(s);
    else salesByCard.set(s.cardId, [s]);
  }
  return {
    cards: init.cards,
    salesByCard,
    listingPricesByCard: new Map(
      Object.entries(init.listings ?? {}).map(([cardId, byGrade]) => [
        cardId,
        Object.fromEntries(
          Object.entries(byGrade).map(([grade, price]) => [grade, offer(price)])
        ),
      ])
    ),
    yearRangesByCard: new Map(Object.entries(init.yearRanges ?? {})),
    psaReportsByCard: new Map(
      (init.reports ?? []).map((r) => [r.cardId, r])
    ),
    usdToEur: RATE,
    now: NOW,
  };
};

describe("rankOpportunities", () => {
  it("returns no opportunities for an empty collection", () => {
    expect(rankOpportunities(inputs({ cards: [] }))).toEqual([]);
  });

  it("gates on a CardMarket listing: a grade with sales but no listing today is excluded", () => {
    const a = card("a");
    const withSalesOnly = inputs({
      cards: [a],
      sales: [sale("a", 10, 100)],
    });
    expect(rankOpportunities(withSalesOnly)).toEqual([]);

    const withListing = inputs({
      cards: [a],
      sales: [sale("a", 10, 100)],
      listings: { a: { 10: 80 } },
    });
    const result = rankOpportunities(withListing);
    expect(result).toHaveLength(1);
    expect(result[0].bestGrade.psaGrade).toBe(10);
    expect(result[0].bestGrade.listingPrice).toBe(80);
    expect(result[0].bestGrade.marketSalePrice).toBe(100);
  });

  it("passes the winning offer's provenance through to the entry", () => {
    const a = card("a");
    const result = rankOpportunities(
      inputs({
        cards: [a],
        sales: [sale("a", 10, 100)],
        listings: {
          a: {
            10: {
              priceEur: 80,
              source: "ebay",
              url: "https://www.ebay.com/itm/396556820656",
              isBestOffer: true,
            },
          },
        },
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].bestGrade.listingSource).toBe("ebay");
    expect(result[0].bestGrade.listingUrl).toBe(
      "https://www.ebay.com/itm/396556820656"
    );
    expect(result[0].bestGrade.listingIsBestOffer).toBe(true);
  });

  it("gates on a Market Sale Price: ineligible sales (invalid, Best-Offer) cannot qualify a grade", () => {
    const a = card("a");
    const result = rankOpportunities(
      inputs({
        cards: [a],
        sales: [
          sale("a", 10, 100, { status: "invalid" }),
          sale("a", 10, 9999, { isBestOffer: true, source: "ebay_search" }),
        ],
        listings: { a: { 10: 80 } },
      })
    );
    expect(result).toEqual([]);
  });

  it("keeps only the best-scoring grade per card", () => {
    const a = card("a");
    const result = rankOpportunities(
      inputs({
        cards: [a],
        sales: [sale("a", 10, 100), sale("a", 9, 50)],
        listings: { a: { 10: 60, 9: 50 } },
        reports: [report("a", { grade9: 90, grade10: 10 })],
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].bestGrade.psaGrade).toBe(10);
  });

  it("ranks by score descending and caps the list at 20", () => {
    const cards = Array.from({ length: 25 }, (_, i) => card(`c${i}`));
    const sales = cards.map((c) => sale(c.id, 10, 100));
    const listings = Object.fromEntries(
      cards.map((c, i) => [c.id, { 10: 95 - i * 3 }])
    );
    const result = rankOpportunities(inputs({ cards, sales, listings }));

    expect(result).toHaveLength(20);
    expect(result[0].id).toBe("c24");
    const scores = result.map((r) => r.bestGrade.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
    const ids = new Set(result.map((r) => r.id));
    for (const dropped of ["c0", "c1", "c2", "c3", "c4"]) {
      expect(ids.has(dropped)).toBe(false);
    }
  });

  it("scores any listing below market, no dead zone", () => {
    const a = card("a");
    const slightDiscount = inputs({
      cards: [a],
      sales: [sale("a", 10, 100)],
      listings: { a: { 10: 99 } },
    });
    expect(rankOpportunities(slightDiscount)).toHaveLength(1);

    const atMarket = inputs({
      cards: [a],
      sales: [sale("a", 10, 100)],
      listings: { a: { 10: 100 } },
    });
    expect(rankOpportunities(atMarket)).toEqual([]);
  });

  it("excludes a card listed at market even when the card itself is excellent", () => {
    const grail = card("grail", { releaseDate: new Date("1999-01-01") });
    const result = rankOpportunities(
      inputs({
        cards: [grail],
        sales: Array.from({ length: 6 }, (_, i) =>
          sale("grail", 10, 100, { soldAt: daysAgo(i + 1) })
        ),
        listings: { grail: { 10: 100 } },
        reports: [report("grail", { grade9: 500, grade10: 5 })],
      })
    );
    expect(result).toEqual([]);
  });

  it("ranks a modest discount on solid sale history above a deep discount on one stale comp", () => {
    const cards = [card("thin"), card("solid")];
    const result = rankOpportunities(
      inputs({
        cards,
        sales: [
          sale("thin", 10, 100, { soldAt: daysAgo(90) }),
          ...Array.from({ length: 6 }, (_, i) =>
            sale("solid", 10, 100, { soldAt: daysAgo(i + 1) })
          ),
        ],
        listings: { thin: { 10: 60 }, solid: { 10: 85 } },
      })
    );
    expect(result.map((r) => r.id)).toEqual(["solid", "thin"]);
    expect(result[0].bestGrade.listingConfidence).toBe(1);
    expect(result[0].bestGrade.sampleSize).toBe(6);
    expect(result[1].bestGrade.listingConfidence).toBeLessThan(0.1);
  });

  it("exposes liquiditySignal for context but does not use it in ranking", () => {
    const cards = [card("slowmover"), card("fastmover")];
    const result = rankOpportunities(
      inputs({
        cards,
        sales: [
          ...[3, 80, 160, 240, 320].map((d) =>
            sale("slowmover", 10, 100, { soldAt: daysAgo(d) })
          ),
          ...[1, 2, 3, 4, 5].map((d) =>
            sale("fastmover", 10, 100, { soldAt: daysAgo(d) })
          ),
        ],
        listings: { slowmover: { 10: 80 }, fastmover: { 10: 80 } },
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0].bestGrade.score).toBeCloseTo(result[1].bestGrade.score, 5);
    const fast = result.find((r) => r.id === "fastmover")!;
    const slow = result.find((r) => r.id === "slowmover")!;
    expect(fast.bestGrade.liquiditySignal).toBeGreaterThan(slow.bestGrade.liquiditySignal);
  });

  it("normalizes the population signal across the full collection, not just gated cards", () => {
    const cards = [card("a"), card("b"), card("c")];
    const result = rankOpportunities(
      inputs({
        cards,
        sales: [sale("b", 10, 100), sale("c", 10, 100)],
        listings: { b: { 10: 80 }, c: { 10: 80 } },
        reports: [
          report("a", { grade10: 10 }),
          report("b", { grade10: 100 }),
          report("c", { grade10: 1000 }),
        ],
      })
    );
    const byId = new Map(result.map((r) => [r.id, r]));
    expect(byId.get("b")?.bestGrade.populationSignal).toBeCloseTo(0.5);
    expect(byId.get("c")?.bestGrade.populationSignal).toBeCloseTo(0);
  });

  it("tied populations share the average percentile of their group", () => {
    const cards = [card("a"), card("b"), card("c")];
    const result = rankOpportunities(
      inputs({
        cards,
        sales: cards.map((c) => sale(c.id, 10, 100)),
        listings: {
          a: { 10: 80 },
          b: { 10: 80 },
          c: { 10: 80 },
        },
        reports: [
          report("a", { grade10: 10 }),
          report("b", { grade10: 10 }),
          report("c", { grade10: 1000 }),
        ],
      })
    );
    const byId = new Map(result.map((r) => [r.id, r]));
    expect(byId.get("a")?.bestGrade.populationSignal).toBeCloseTo(0.75);
    expect(byId.get("b")?.bestGrade.populationSignal).toBeCloseTo(0.75);
    expect(byId.get("c")?.bestGrade.populationSignal).toBeCloseTo(0);
  });

  it("normalizes the age signal across the full collection, not just gated cards", () => {
    const cards = [
      card("old", { releaseDate: new Date("2000-01-01") }),
      card("mid", { releaseDate: new Date("2013-01-01") }),
      card("new", { releaseDate: new Date("2026-01-01") }),
    ];
    const result = rankOpportunities(
      inputs({
        cards,
        sales: [sale("mid", 10, 100), sale("new", 10, 100)],
        listings: { mid: { 10: 80 }, new: { 10: 80 } },
      })
    );
    const byId = new Map(result.map((r) => [r.id, r]));
    expect(byId.get("mid")?.bestGrade.ageSignal).toBeCloseTo(0.5, 1);
    expect(byId.get("new")?.bestGrade.ageSignal).toBeCloseTo(0);
  });

  it("ranks a card without a PSA Pop Report, with empty grade/pop fields", () => {
    const a = card("a");
    const result = rankOpportunities(
      inputs({
        cards: [a],
        sales: [sale("a", 10, 100)],
        listings: { a: { 10: 80 } },
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].bestGrade.gradeSignal).toBe(0);
    expect(result[0].bestGrade.popsAtOrAbove).toBeNull();
    expect(result[0].bestGrade.psaTotal).toBeNull();
  });

  it("returns rendering-ready fields: rounded score, levels, year range bounds", () => {
    const a = card("a");
    const [entry] = rankOpportunities(
      inputs({
        cards: [a],
        sales: [sale("a", 10, 100)],
        listings: { a: { 10: 80 } },
        yearRanges: { a: { 10: { min: 80, max: 120 } } },
      })
    );
    expect(entry.cardSetName).toBe("Test Set");
    expect(entry.bestGrade.score).toBe(
      Math.round(entry.bestGrade.score * 10) / 10
    );
    const levels = ["green-strong", "yellow-light", "orange-light", "red-strong"];
    expect(levels).toContain(entry.bestGrade.scoreLevel);
    expect(levels).toContain(entry.bestGrade.listingLevel);
    expect(entry.bestGrade.yearLow).toBe(80);
    expect(entry.bestGrade.yearHigh).toBe(120);
    expect(entry.bestGrade.yearSignal).toBeCloseTo(0.5);
  });
});
