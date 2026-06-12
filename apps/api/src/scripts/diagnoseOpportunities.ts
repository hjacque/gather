/**
 * Read-only diagnostic for the Opportunity Score pipeline. Runs the exact same
 * inputs as GET /opportunities, but instead of silently gating entries out it
 * attributes every (card, grade) with a Market Sale Price to the factor that
 * removed it from the page:
 *
 *   in top 20            shown today
 *   lost to PSA x        another grade of the same card scored higher
 *   no listing           no buy-side offer (CardMarket today / live eBay ask) for this grade
 *   overpriced           listed above market
 *   dead zone            listed <3% below market — fair price, not a deal
 *   conf-killed          would clear today's cutoff if confidence were 1
 *   below cutoff         not competitive even with full confidence
 *
 * Focus set: PSA 10 entries and vintage cards (released before --year, default
 * 2003), i.e. "the cards a collector actually wants". Prints per-entry signal
 * breakdowns for the focus set plus verdict tallies, so formula changes can be
 * argued from evidence instead of theory.
 *
 * Usage:
 *   tsx src/scripts/diagnoseOpportunities.ts [--year=2003] [--limit=40] [--all]
 */

import { initRepository } from "../repository/init.repository";
import { mergeListingOffers } from "../application/opportunities/mergeListingOffers";
import { getEurToUsdRate } from "../application/sync/helper";
import { computeMarketPrices } from "../application/sale/marketPrice";
import { rankOpportunities } from "../application/opportunities/rankOpportunities";
import {
  computeGradeSignal,
  computeListingConfidence,
  computeListingSignal,
  computeLiquiditySignal,
  computePopsAtOrAbove,
  computePremiumSignal,
  computeQualitySignal,
  computeScore,
  normalizeInverted,
  DISCOUNT_DEAD_ZONE,
} from "../application/opportunities/opportunityScore";

const VINTAGE_YEAR = Number(
  process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? 2003
);
const LIMIT = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 40
);
const SHOW_ALL = process.argv.includes("--all");

const YEAR_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

type Verdict =
  | "in top 20"
  | "lost to sibling"
  | "no listing"
  | "overpriced"
  | "dead zone"
  | "conf-killed"
  | "below cutoff";

type Diag = {
  cardId: string;
  name: string;
  setName: string;
  releaseYear: number | null;
  grade: number;
  psaTotal: number | null;
  marketEur: number;
  listingEur: number | null;
  listingSource: "cardmarket" | "ebay" | null;
  discountPct: number | null;
  sampleSize: number;
  lastSaleDays: number;
  confidence: number;
  liquiditySignal: number;
  qualitySignal: number;
  score: number;
  scoreIfConf1: number;
  verdict: Verdict;
  siblingGrade?: number;
};

const startOfDayUtc = (d: Date): Date => {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
};

const fmt = (n: number | null, digits = 0): string =>
  n === null ? "—" : n.toFixed(digits);

const pad = (s: string, w: number): string =>
  s.length > w ? s.slice(0, w - 1) + "…" : s.padEnd(w);

const padL = (s: string, w: number): string => s.padStart(w);

async function main() {
  const { repositories, close } = await initRepository();
  const {
    cardRepository,
    priceRepository,
    psaPopReportRepository,
    saleRepository,
    listingRepository,
  } = repositories;

  const now = new Date();
  const today = startOfDayUtc(now);
  const yearAgo = new Date(today);
  yearAgo.setUTCDate(yearAgo.getUTCDate() - YEAR_DAYS);
  // Same eBay freshness window as GetOpportunitiesUsecase.
  const listingsSince = new Date(today);
  listingsSince.setUTCDate(listingsSince.getUTCDate() - 3);

  const [cards, usdToEur] = await Promise.all([
    cardRepository.getCards(),
    getEurToUsdRate(),
  ]);
  const cardIds = cards.map((c) => c.id);
  const [
    salesByCard,
    listingsByCard,
    yearRangesByCard,
    psaReportsByCard,
  ] = await Promise.all([
    saleRepository.getCardsSales(cardIds),
    listingRepository.getCardsListings(cardIds, listingsSince),
    priceRepository.getCardsMarketSaleYearRange(cardIds, yearAgo, today),
    psaPopReportRepository.findByCardIds(cardIds),
  ]);

  // Merged buy side — the exact input GET /opportunities ranks on.
  const listingPricesByCard = mergeListingOffers({
    cards,
    listingsByCard,
    usdToEur,
  });

  // What the page actually shows today, and the score needed to get on it.
  const page = rankOpportunities({
    cards,
    salesByCard,
    listingPricesByCard,
    yearRangesByCard,
    psaReportsByCard,
    usdToEur,
    now,
  });
  const shown = new Map(page.map((e) => [e.id, e.bestGrade.psaGrade]));
  const cutoff = page.length === 20 ? page[page.length - 1].bestGrade.score : 0;

  // Same collection-wide normalizations as rankOpportunities.
  const ageSignals = normalizeInverted(
    cards.map((c) => c.releaseDate?.getTime() ?? null)
  );
  const popEntries = cards.map((c) => ({
    cardId: c.id,
    total: psaReportsByCard.get(c.id)?.total ?? 0,
  }));
  const popSignals = new Array(popEntries.length).fill(0);
  const n = popEntries.length;
  if (n > 1) {
    const sortedIdx = popEntries
      .map((_, i) => i)
      .sort((a, b) => popEntries[a].total - popEntries[b].total);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n && popEntries[sortedIdx[j]].total === popEntries[sortedIdx[i]].total)
        j++;
      const avgPercentile = 1 - (i + j - 1) / 2 / (n - 1);
      for (let k = i; k < j; k++) popSignals[sortedIdx[k]] = avgPercentile;
      i = j;
    }
  } else if (n === 1) {
    popSignals[0] = 0.5;
  }
  const popSignalByCard = new Map(popEntries.map((e, i) => [e.cardId, popSignals[i]]));

  const diags: Diag[] = [];
  const cardsWithoutMarketPrice: { name: string; releaseYear: number | null }[] = [];

  for (let cardIdx = 0; cardIdx < cards.length; cardIdx++) {
    const card = cards[cardIdx];
    const releaseYear = card.releaseDate?.getFullYear() ?? null;
    const psaReport = psaReportsByCard.get(card.id) ?? null;
    const listings = listingPricesByCard.get(card.id) ?? {};
    const marketPrices = computeMarketPrices(
      salesByCard.get(card.id) ?? [],
      usdToEur,
      now
    );
    if (marketPrices.length === 0) {
      cardsWithoutMarketPrice.push({ name: card.name, releaseYear });
      continue;
    }

    const cardDiags: Diag[] = [];
    for (const mp of marketPrices) {
      const offer = listings[mp.psaGrade] ?? null;
      const listingEur = offer?.priceEur ?? null;
      const discountPct =
        listingEur === null
          ? null
          : ((mp.priceEur - listingEur) / mp.priceEur) * 100;
      const confidence = computeListingConfidence(mp.sampleSize, mp.newestSoldAt, now);
      const rawDeal = computeListingSignal(mp.priceEur, listingEur);
      const liquiditySignal = computeLiquiditySignal(mp.salesPerDay);
      const gradeSignal = psaReport ? computeGradeSignal(psaReport, mp.psaGrade) : 0;
      const qualitySignal = computeQualitySignal(
        popSignalByCard.get(card.id) ?? 0,
        gradeSignal,
        ageSignals[cardIdx],
        computePremiumSignal(mp.psaGrade),
        liquiditySignal
      );
      const score = computeScore(rawDeal * confidence, qualitySignal);
      const scoreIfConf1 = computeScore(rawDeal, qualitySignal);

      let verdict: Verdict;
      if (listingEur === null) verdict = "no listing";
      else if (discountPct !== null && discountPct <= 0) verdict = "overpriced";
      else if (discountPct !== null && discountPct <= DISCOUNT_DEAD_ZONE * 100)
        verdict = "dead zone";
      else if (shown.get(card.id) === mp.psaGrade) verdict = "in top 20";
      else if (shown.has(card.id)) verdict = "lost to sibling";
      else if (scoreIfConf1 > cutoff && score <= cutoff) verdict = "conf-killed";
      else verdict = "below cutoff";

      cardDiags.push({
        cardId: card.id,
        name: card.name,
        setName: card.cardSet.name,
        releaseYear,
        grade: mp.psaGrade,
        psaTotal: psaReport?.total ?? null,
        marketEur: mp.priceEur,
        listingEur,
        listingSource: offer?.source ?? null,
        discountPct,
        sampleSize: mp.sampleSize,
        lastSaleDays: (now.getTime() - mp.newestSoldAt.getTime()) / DAY_MS,
        confidence,
        liquiditySignal,
        qualitySignal,
        score,
        scoreIfConf1,
        verdict,
        siblingGrade: shown.get(card.id),
      });
    }
    diags.push(...cardDiags);
  }

  const isVintage = (d: { releaseYear: number | null }) =>
    d.releaseYear !== null && d.releaseYear < VINTAGE_YEAR;
  const focus = diags.filter((d) => d.grade === 10 || isVintage(d));

  // ── Per-entry breakdown for the focus set ───────────────────────────────────
  const header =
    pad("card", 30) +
    pad("set", 18) +
    padL("year", 5) +
    padL("PSA", 4) +
    padL("pop", 7) +
    padL("mkt€", 8) +
    padL("list€", 8) +
    padL("src", 4) +
    padL("disc%", 7) +
    padL("n", 4) +
    padL("last d", 7) +
    padL("conf", 6) +
    padL("liq", 5) +
    padL("qual", 6) +
    padL("score", 7) +
    padL("if c=1", 7) +
    "  verdict";
  console.log(`\nFocus: PSA 10 entries + cards released before ${VINTAGE_YEAR}`);
  console.log(header);
  console.log("─".repeat(header.length + 8));

  const rows = [...focus].sort((a, b) => b.scoreIfConf1 - a.scoreIfConf1);
  for (const d of rows.slice(0, SHOW_ALL ? rows.length : LIMIT)) {
    const verdictLabel =
      d.verdict === "lost to sibling" ? `lost to PSA ${d.siblingGrade}` : d.verdict;
    console.log(
      pad(d.name, 30) +
        pad(d.setName, 18) +
        padL(d.releaseYear?.toString() ?? "—", 5) +
        padL(d.grade.toString(), 4) +
        padL(d.psaTotal?.toLocaleString("en-US") ?? "—", 7) +
        padL(fmt(d.marketEur), 8) +
        padL(fmt(d.listingEur), 8) +
        padL(d.listingSource === "ebay" ? "eb" : d.listingSource === "cardmarket" ? "cm" : "—", 4) +
        padL(fmt(d.discountPct, 1), 7) +
        padL(d.sampleSize.toString(), 4) +
        padL(fmt(d.lastSaleDays), 7) +
        padL(d.confidence.toFixed(2), 6) +
        padL(d.liquiditySignal.toFixed(1), 5) +
        padL(d.qualitySignal.toFixed(2), 6) +
        padL(fmt(d.score, 1), 7) +
        padL(fmt(d.scoreIfConf1, 1), 7) +
        "  " +
        verdictLabel
    );
  }
  if (!SHOW_ALL && rows.length > LIMIT)
    console.log(`… ${rows.length - LIMIT} more (use --all)`);

  // ── Verdict tallies ──────────────────────────────────────────────────────────
  const tally = (entries: Diag[]): string => {
    const counts = new Map<Verdict, number>();
    for (const d of entries) counts.set(d.verdict, (counts.get(d.verdict) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([v, c]) => `${v}: ${c}`)
      .join("  ·  ");
  };
  console.log(`\nVerdicts — all ${diags.length} priced (card, grade) entries:`);
  console.log("  " + tally(diags));
  console.log(`Verdicts — ${focus.filter((d) => d.grade === 10).length} PSA 10 entries:`);
  console.log("  " + tally(focus.filter((d) => d.grade === 10)));
  const vintage = diags.filter(isVintage);
  console.log(`Verdicts — ${vintage.length} vintage (pre-${VINTAGE_YEAR}) entries:`);
  console.log("  " + tally(vintage));

  const vintageNoPrice = cardsWithoutMarketPrice.filter(isVintage);
  console.log(
    `\nCards with no Market Sale Price at all (no eligible sales): ` +
      `${cardsWithoutMarketPrice.length} of ${cards.length}` +
      (vintageNoPrice.length
        ? ` — vintage among them: ${vintageNoPrice.map((c) => c.name).join(", ")}`
        : "")
  );
  console.log(
    `Today's page: ${page.length} entries, cutoff score ${cutoff ? cutoff.toFixed(1) : "none (page not full)"}`
  );

  await close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
