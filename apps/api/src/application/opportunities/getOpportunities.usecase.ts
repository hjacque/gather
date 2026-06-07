import type { GetOpportunitiesResponse } from "@gather/api-contract";
import type { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import type { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import type { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import type { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { convertToEur } from "../sale/eurConverter";
import { getEurToUsdRate } from "../sync/helper";
import { computeMarketPrices } from "../sale/marketPrice";
import {
  SCORE_FLOOR,
  MIN_OPPORTUNITIES,
  MAX_OPPORTUNITIES,
  computeListingSignal,
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
} from "./opportunityScore";

const YEAR_DAYS = 365;

const startOfDayUtc = (d: Date): Date => {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
};

export class GetOpportunitiesUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort
  ) {}

  async execute(): Promise<GetOpportunitiesResponse> {
    const now = new Date();
    const today = startOfDayUtc(now);
    const yearAgo = new Date(today);
    yearAgo.setUTCDate(yearAgo.getUTCDate() - YEAR_DAYS);

    const [cards, usdToEur] = await Promise.all([
      this.cardRepository.getCards(),
      getEurToUsdRate(),
    ]);
    const cardIds = cards.map((c) => c.id);

    const [allSales, listingPrices, yearRanges, psaReports] = await Promise.all([
      this.saleRepository.getCardsSales(cardIds),
      this.priceRepository.getCardsListingGradePricesByDate(cardIds, today),
      this.priceRepository.getCardsMarketSaleYearRange(cardIds, yearAgo, today),
      this.psaPopReportRepository.findByCardIds(cardIds),
    ]);

    // Both age and population signals are normalized across the FULL collection so
    // the scale is stable regardless of which cards have a qualifying listing today.
    // The listing gate only decides which entries appear in the output — it must not
    // distort the relative ranking of signals.

    // Age: one value per card, older → higher signal.
    const allCardAgeSignals = normalizeInverted(cards.map(c => c.releaseDate?.getTime() ?? null));

    // Population: one value per (card, grade) pair across all PSA reports.
    // log-scale the count so a jump from 10→100 matters less than 1→10.
    const allPopEntries: { cardId: string; grade: number; rawPop: number }[] = [];
    for (const card of cards) {
      const psaReport = psaReports.get(card.id);
      if (!psaReport) continue;
      for (let grade = 1; grade <= 10; grade++) {
        const count = (psaReport[`grade${grade}` as keyof typeof psaReport] as number | null) ?? 0;
        allPopEntries.push({ cardId: card.id, grade, rawPop: Math.log(count + 1) });
      }
    }
    const allPopSignals = normalizeInverted(allPopEntries.map(e => e.rawPop));
    const popSignalMap = new Map(
      allPopEntries.map((e, i) => [`${e.cardId}-${e.grade}`, allPopSignals[i]])
    );

    // Collect per-(card, grade) raw inputs for all grades with a Market Sale Price.
    type RawEntry = {
      cardIdx: number;
      grade: number;
      marketSalePrice: number;
      listingSignal: number;
      listingPrice: number | null;
      yearSignal: number;
      yearRange: { min: number; max: number } | null;
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
      const sales = allSales.get(card.id) ?? [];
      const listings = listingPrices.get(card.id) ?? {};
      const cardYearRanges = yearRanges.get(card.id) ?? {};
      const psaReport = psaReports.get(card.id) ?? null;

      const salesForPricing = sales.flatMap((sale) => {
        if (sale.status === "invalid") return [];
        const priceEur = convertToEur(sale.price, sale.currency, usdToEur);
        if (priceEur === null) return [];
        return [{
          psaGrade: sale.psaGrade,
          priceEur,
          soldAt: sale.soldAt,
          isBestOffer: sale.isBestOffer,
          reviewedAt: sale.reviewedAt,
        }];
      });

      const marketPrices = computeMarketPrices(salesForPricing, now);

      for (const { psaGrade, priceEur: marketSalePrice } of marketPrices) {
        const listingPrice = listings[psaGrade] ?? null;
        if (listingPrice === null || listingPrice >= marketSalePrice) continue;

        const yearRange = cardYearRanges[psaGrade] ?? null;

        let gradeSignal = 0;
        let popsAtOrAbove: number | null = null;
        let psaTotal: number | null = null;

        if (psaReport) {
          psaTotal = psaReport.total;
          popsAtOrAbove = computePopsAtOrAbove(psaReport, psaGrade);
          gradeSignal = computeGradeSignal(psaReport, psaGrade);
        }

        rawEntries.push({
          cardIdx,
          grade: psaGrade,
          marketSalePrice,
          listingSignal: computeListingSignal(marketSalePrice, listingPrice),
          listingPrice,
          yearSignal: computeYearSignal(marketSalePrice, yearRange),
          yearRange,
          gradeSignal,
          popsAtOrAbove,
          psaTotal,
          hasPsaReport: psaReport !== null,
          ageSignal: allCardAgeSignals[cardIdx],
          populationSignal: popSignalMap.get(`${card.id}-${psaGrade}`) ?? 0,
        });
      }
    }

    // Compute final scores and filter.
    const bestPerCard = new Map<number, {
      grade: number;
      score: number;
      scoreLevel: ReturnType<typeof computeScoreLevel>;
      listingSignal: number;
      listingPrice: number | null;
      marketSalePrice: number;
      listingLevel: ReturnType<typeof computeDiscountLevel>;
      yearSignal: number;
      yearRange: { min: number; max: number } | null;
      yearLevel: ReturnType<typeof computeYearLevel>;
      ageSignal: number;
      ageLevel: ReturnType<typeof computeAgeLevel>;
      populationSignal: number;
      populationLevel: ReturnType<typeof computePopulationLevel>;
      gradeSignal: number;
      gradeLevel: ReturnType<typeof computeGradeLevel>;
      popsAtOrAbove: number | null;
      psaTotal: number | null;
    }>();

    for (let i = 0; i < rawEntries.length; i++) {
      const e = rawEntries[i];
      const ageSignal = e.ageSignal;
      const populationSignal = e.populationSignal;
      const score = computeScore(e.listingSignal, e.yearSignal, ageSignal, populationSignal, e.gradeSignal);
      const roundedScore = Math.round(score * 10) / 10;

      const existing = bestPerCard.get(e.cardIdx);
      if (!existing || score > existing.score) {
        bestPerCard.set(e.cardIdx, {
          grade: e.grade,
          score,
          scoreLevel: computeScoreLevel(roundedScore),
          listingSignal: e.listingSignal,
          listingPrice: e.listingPrice,
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
          popsAtOrAbove: e.popsAtOrAbove,
          psaTotal: e.psaTotal,
        });
      }
    }

    const ranked = [...bestPerCard.entries()].sort((a, b) => b[1].score - a[1].score);
    const aboveFloor = ranked.filter(([, g]) => g.score >= SCORE_FLOOR).length;
    const count = Math.min(MAX_OPPORTUNITIES, Math.max(MIN_OPPORTUNITIES, aboveFloor));
    const top = ranked.slice(0, count);

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
          listingSignal: g.listingSignal,
          listingPrice: g.listingPrice,
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
          popsAtOrAbove: g.popsAtOrAbove,
          psaTotal: g.psaTotal,
        },
      };
    });
  }
}
