import type { GetOpportunitiesResponse } from "@gather/api-contract";
import type { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import type { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import type { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import type { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { getEurToUsdRate } from "../sync/helper";
import { rankOpportunities } from "./rankOpportunities";

const YEAR_DAYS = 365;

const startOfDayUtc = (d: Date): Date => {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
};

// Fetches the day's inputs and delegates the entire scoring/ranking pipeline
// to rankOpportunities (pure, tested without repositories).
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

    const [salesByCard, listingPricesByCard, yearRangesByCard, psaReportsByCard] =
      await Promise.all([
        this.saleRepository.getCardsSales(cardIds),
        this.priceRepository.getCardsListingGradePricesByDate(cardIds, today),
        this.priceRepository.getCardsMarketSaleYearRange(cardIds, yearAgo, today),
        this.psaPopReportRepository.findByCardIds(cardIds),
      ]);

    return rankOpportunities({
      cards,
      salesByCard,
      listingPricesByCard,
      yearRangesByCard,
      psaReportsByCard,
      usdToEur,
      now,
    });
  }
}
