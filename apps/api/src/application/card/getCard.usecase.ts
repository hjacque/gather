import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import type { GetCardResponse } from "@gather/api-contract";

export class GetCardUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort
  ) {}

  async execute(cardId: string): Promise<GetCardResponse> {
    const card = await this.cardRepository.getCard(cardId);
    const [cardPrices, psaReport, collectionEntry] = await Promise.all([
      this.priceRepository.getCardPrices(cardId),
      this.psaPopReportRepository.findByCardId(cardId),
      this.collectionRepository.findByCardId(cardId),
    ]);

    const psaPopReport = psaReport
      ? {
          grade1: psaReport.grade1,
          grade2: psaReport.grade2,
          grade3: psaReport.grade3,
          grade4: psaReport.grade4,
          grade5: psaReport.grade5,
          grade6: psaReport.grade6,
          grade7: psaReport.grade7,
          grade8: psaReport.grade8,
          grade9: psaReport.grade9,
          grade10: psaReport.grade10,
          total: psaReport.total,
          syncedAt: psaReport.syncedAt,
        }
      : null;

    return {
      ...card,
      ...cardPrices,
      psaPopReport,
      collectionEntry: collectionEntry ?? null,
    };
  }
}
