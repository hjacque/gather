import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { Region } from "@gather/types";
import type { GetCardsResponse } from "@gather/api-contract";
import { getEurToUsdRate } from "../sync/helper";
import { psa10MarketPriceWithPrior } from "../sale/cardMarketPrice";

export class GetCardsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort
  ) {}

  async execute(filter?: {
    tags?: string | string[];
    set?: string;
    region?: Region | Region[];
  }): Promise<GetCardsResponse> {
    const cards = await this.cardRepository.getCards(filter);
    const cardIds = cards.map((card) => card.id);

    const [psaReports, collectionEntries, sales, usdToEur] = await Promise.all([
      this.psaPopReportRepository.findByCardIds(cardIds),
      this.collectionRepository.findByCardIds(cardIds),
      this.saleRepository.getCardsSales(cardIds),
      getEurToUsdRate(),
    ]);

    const now = new Date();

    return cards.map((card) => {
      const psaReport = psaReports.get(card.id) ?? null;
      const psaTotal = psaReport?.total ?? null;
      const psaGrade10Pop = psaReport?.grade10 ?? null;
      const collectionEntry = collectionEntries.get(card.id) ?? null;
      const market = psa10MarketPriceWithPrior(
        sales.get(card.id) ?? [],
        usdToEur,
        now
      );

      return {
        ...card,
        marketPsa10: market.today,
        marketPsa10Prior7d: market.prior,
        psaTotal,
        psaGrade10Pop,
        collectionEntry,
      };
    });
  }
}
