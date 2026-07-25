import type { GetOpportunitiesResponse } from "@gather/api-contract";
import { CardEntity } from "../../entities/card.entity";
import { CardSetEntity } from "../../entities/cardSet.entity";
import { SaleEntity } from "../../entities/sale.entity";
import type { PsaPopReportEntity } from "../../repository/ports/psaPopReport.repository.port";
import { computeMarketPrices } from "../sale/marketPrice";
import type { ListingOffer } from "./mergeListingOffers";
import {
  BEST_OFFER_BOOST,
  computeListingConfidence,
  computeListingSignal,
  computeLiquidityLevel,
  computeLiquiditySignal,
  computeQualitySignal,
  computeYearSignal,
  computeGradeSignal,
  computePopsAtOrAbove,
  computeScore,
  normalizeInverted,
  computeDiscountLevel,
  computeYearLevel,
  computePopulationLevel,
  computeGradeLevel,
  computeAgeLevel,
  computeScoreLevel,
  computePremiumSignal,
  computePremiumLevel,
} from "./opportunityScore";

const TOP_N = 20;

export type GradeYearRange = { min: number; max: number } | null;

export type OpportunityInputs = {
  cards: (CardEntity & { cardSet: CardSetEntity })[];
  salesByCard: Map<string, SaleEntity[]>;
  listingPricesByCard: Map<string, Record<number, ListingOffer | null>>;
  yearRangesByCard: Map<string, Record<number, GradeYearRange>>;
  psaReportsByCard: Map<string, PsaPopReportEntity>;
  usdToEur: number;
  now: Date;
};

export const rankOpportunities = ({
  cards,
  salesByCard,
  listingPricesByCard,
  yearRangesByCard,
  psaReportsByCard,
  usdToEur,
  now,
}: OpportunityInputs): GetOpportunitiesResponse => {
  const allCardAgeSignals = normalizeInverted(
    cards.map((c) => c.releaseDate?.getTime() ?? null)
  );

  const allPopEntries: { cardId: string; total: number }[] = [];
  for (const card of cards) {
    const total = psaReportsByCard.get(card.id)?.total ?? 0;
    allPopEntries.push({ cardId: card.id, total });
  }
  const popSignals = new Array(allPopEntries.length).fill(0);
  const n = allPopEntries.length;
  if (n > 1) {
    const sortedIdx = allPopEntries
      .map((_, i) => i)
      .sort((a, b) => allPopEntries[a].total - allPopEntries[b].total);
    let i = 0;
    while (i < n) {
      let j = i;
      while (
        j < n &&
        allPopEntries[sortedIdx[j]].total === allPopEntries[sortedIdx[i]].total
      )
        j++;
      const avgPercentile = 1 - (i + j - 1) / 2 / (n - 1);
      for (let k = i; k < j; k++) popSignals[sortedIdx[k]] = avgPercentile;
      i = j;
    }
  } else if (n === 1) {
    popSignals[0] = 0.5;
  }
  const popSignalMap = new Map(
    allPopEntries.map((e, i) => [e.cardId, popSignals[i]])
  );

  type RawEntry = {
    cardIdx: number;
    grade: number;
    marketSalePrice: number;
    listingSignal: number;
    listingConfidence: number;
    sampleSize: number;
    newestSoldAt: Date;
    salesPerDay: number;
    liquiditySignal: number;
    listingPrice: number | null;
    listingOffer: ListingOffer;
    yearSignal: number;
    yearRange: GradeYearRange;
    gradeSignal: number;
    popsAtOrAbove: number | null;
    psaTotal: number | null;
    hasPsaReport: boolean;
    ageSignal: number;
    populationSignal: number;
  };

  const rawEntries: RawEntry[] = [];

  for (let cardIdx = 0; cardIdx < cards.length; cardIdx++) {
    const card = cards[cardIdx];
    const sales = salesByCard.get(card.id) ?? [];
    const listings = listingPricesByCard.get(card.id) ?? {};
    const cardYearRanges = yearRangesByCard.get(card.id) ?? {};
    const psaReport = psaReportsByCard.get(card.id) ?? null;

    const marketPrices = computeMarketPrices(sales, usdToEur, now);

    for (const {
      psaGrade,
      priceEur: marketSalePrice,
      sampleSize,
      newestSoldAt,
      salesPerDay,
    } of marketPrices) {
      const listingOffer = listings[psaGrade] ?? null;
      if (listingOffer === null) continue;
      const listingPrice = listingOffer.priceEur;

      const yearRange = cardYearRanges[psaGrade] ?? null;

      let gradeSignal = 0;
      let popsAtOrAbove: number | null = null;
      let psaTotal: number | null = null;

      if (psaReport) {
        psaTotal = psaReport.total;
        popsAtOrAbove = computePopsAtOrAbove(psaReport, psaGrade);
        gradeSignal = computeGradeSignal(psaReport, psaGrade);
      }

      const listingConfidence = computeListingConfidence(
        sampleSize,
        newestSoldAt,
        now
      );

      const effectiveListingPrice =
        listingOffer.isBestOffer && listingPrice !== null
          ? listingPrice * (1 - BEST_OFFER_BOOST)
          : listingPrice;

      rawEntries.push({
        cardIdx,
        grade: psaGrade,
        marketSalePrice,
        listingSignal:
          computeListingSignal(marketSalePrice, effectiveListingPrice) *
          listingConfidence,
        listingConfidence,
        sampleSize,
        newestSoldAt,
        salesPerDay,
        liquiditySignal: computeLiquiditySignal(salesPerDay),
        listingPrice,
        listingOffer,
        yearSignal: computeYearSignal(marketSalePrice, yearRange),
        yearRange,
        gradeSignal,
        popsAtOrAbove,
        psaTotal,
        hasPsaReport: psaReport !== null,
        ageSignal: allCardAgeSignals[cardIdx],
        populationSignal: popSignalMap.get(card.id) ?? 0,
      });
    }
  }

  const bestPerCard = new Map<
    number,
    {
      grade: number;
      score: number;
      scoreLevel: ReturnType<typeof computeScoreLevel>;
      qualitySignal: number;
      listingSignal: number;
      listingConfidence: number;
      sampleSize: number;
      newestSoldAt: Date;
      salesPerDay: number;
      liquiditySignal: number;
      liquidityLevel: ReturnType<typeof computeLiquidityLevel>;
      listingPrice: number | null;
      listingOffer: ListingOffer;
      marketSalePrice: number;
      listingLevel: ReturnType<typeof computeDiscountLevel>;
      yearSignal: number;
      yearRange: GradeYearRange;
      yearLevel: ReturnType<typeof computeYearLevel>;
      ageSignal: number;
      ageLevel: ReturnType<typeof computeAgeLevel>;
      populationSignal: number;
      populationLevel: ReturnType<typeof computePopulationLevel>;
      gradeSignal: number;
      gradeLevel: ReturnType<typeof computeGradeLevel>;
      premiumSignal: number;
      premiumLevel: ReturnType<typeof computePremiumLevel>;
      popsAtOrAbove: number | null;
      psaTotal: number | null;
    }
  >();

  for (let i = 0; i < rawEntries.length; i++) {
    const e = rawEntries[i];
    const ageSignal = e.ageSignal;
    const populationSignal = e.populationSignal;
    const premiumSignal = computePremiumSignal(e.grade);
    const qualitySignal = computeQualitySignal(
      populationSignal,
      e.gradeSignal,
      ageSignal,
      premiumSignal,
    );
    const score = computeScore(e.listingSignal, qualitySignal);
    const roundedScore = Math.round(score * 10) / 10;

    const existing = bestPerCard.get(e.cardIdx);
    if (!existing || score > existing.score) {
      bestPerCard.set(e.cardIdx, {
        grade: e.grade,
        score,
        scoreLevel: computeScoreLevel(roundedScore),
        qualitySignal,
        listingSignal: e.listingSignal,
        listingConfidence: e.listingConfidence,
        sampleSize: e.sampleSize,
        newestSoldAt: e.newestSoldAt,
        salesPerDay: e.salesPerDay,
        liquiditySignal: e.liquiditySignal,
        liquidityLevel: computeLiquidityLevel(e.liquiditySignal),
        listingPrice: e.listingPrice,
        listingOffer: e.listingOffer,
        marketSalePrice: e.marketSalePrice,
        listingLevel: computeDiscountLevel(e.marketSalePrice, e.listingPrice),
        yearSignal: e.yearSignal,
        yearRange: e.yearRange,
        yearLevel: computeYearLevel(e.yearSignal),
        ageSignal,
        ageLevel: computeAgeLevel(ageSignal),
        populationSignal,
        populationLevel: computePopulationLevel(populationSignal),
        gradeSignal: e.gradeSignal,
        gradeLevel: computeGradeLevel(e.gradeSignal),
        premiumSignal,
        premiumLevel: computePremiumLevel(e.grade),
        popsAtOrAbove: e.popsAtOrAbove,
        psaTotal: e.psaTotal,
      });
    }
  }

  const ranked = [...bestPerCard.entries()]
    .filter(([, g]) => g.score > 0)
    .sort((a, b) => b[1].score - a[1].score);
  const top = ranked.slice(0, TOP_N);

  return top.map(([cardIdx, g]) => {
    const card = cards[cardIdx];
    return {
      id: card.id,
      name: card.name,
      imageUrl: card.imageUrl,
      cardSetName: card.cardSet.name,
      releaseDate: card.releaseDate,
      bestGrade: {
        psaGrade: g.grade,
        score: Math.round(g.score * 10) / 10,
        scoreLevel: g.scoreLevel,
        qualitySignal: g.qualitySignal,
        listingSignal: g.listingSignal,
        listingConfidence: g.listingConfidence,
        sampleSize: g.sampleSize,
        newestSoldAt: g.newestSoldAt,
        salesPerDay: g.salesPerDay,
        liquiditySignal: g.liquiditySignal,
        liquidityLevel: g.liquidityLevel,
        listingPrice: g.listingPrice,
        listingSource: g.listingOffer.source,
        listingUrl: g.listingOffer.url,
        listingIsBestOffer: g.listingOffer.isBestOffer,
        marketSalePrice: g.marketSalePrice,
        listingLevel: g.listingLevel,
        yearSignal: g.yearSignal,
        yearLow: g.yearRange?.min ?? null,
        yearHigh: g.yearRange?.max ?? null,
        yearLevel: g.yearLevel,
        ageSignal: g.ageSignal,
        ageLevel: g.ageLevel,
        populationSignal: g.populationSignal,
        populationLevel: g.populationLevel,
        gradeSignal: g.gradeSignal,
        gradeLevel: g.gradeLevel,
        premiumSignal: g.premiumSignal,
        premiumLevel: g.premiumLevel,
        popsAtOrAbove: g.popsAtOrAbove,
        psaTotal: g.psaTotal,
      },
    };
  });
};
