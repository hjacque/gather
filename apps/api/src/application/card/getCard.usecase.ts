import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { getEurToUsdRate } from "../sync/helper";
import { convertToEur } from "../sale/eurConverter";
import { computeMarketPrices } from "../sale/marketPrice";
import type { GetCardResponse, SaleRecord } from "@gather/api-contract";

export class GetCardUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort
  ) {}

  async execute(cardId: string): Promise<GetCardResponse> {
    const card = await this.cardRepository.getCard(cardId);
    const [cardPrices, psaReport, collectionEntry, sales, usdToEur] =
      await Promise.all([
        this.priceRepository.getCardPrices(cardId),
        this.psaPopReportRepository.findByCardId(cardId),
        this.collectionRepository.findByCardId(cardId),
        this.saleRepository.getCardSales(cardId),
        getEurToUsdRate(),
      ]);

    // Convert each Sale to EUR at read time, dropping invalid Sales and any
    // whose currency we cannot yet convert.
    const saleRecords: SaleRecord[] = sales.flatMap((sale) => {
      if (sale.status === "invalid") return [];
      const priceEur = convertToEur(sale.price, sale.currency, usdToEur);
      if (priceEur === null) return [];
      return [
        {
          id: sale.id,
          psaGrade: sale.psaGrade,
          priceEur,
          soldAt: sale.soldAt,
          status: sale.status,
          isBestOffer: sale.isBestOffer,
          url: `https://www.ebay.com/itm/${sale.itemId}`,
        },
      ];
    });

    // Per-grade market price from the EUR-converted sales. Re-derived from the
    // Sale entities (not saleRecords) so the Best-Offer/review gate can see each
    // sale's isBestOffer and reviewedAt.
    const marketPrices = computeMarketPrices(
      sales.flatMap((sale) => {
        if (sale.status === "invalid") return [];
        const priceEur = convertToEur(sale.price, sale.currency, usdToEur);
        if (priceEur === null) return [];
        return [
          {
            psaGrade: sale.psaGrade,
            priceEur,
            soldAt: sale.soldAt,
            isBestOffer: sale.isBestOffer,
            reviewedAt: sale.reviewedAt,
          },
        ];
      })
    );

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
      sales: saleRecords,
      marketPrices,
      psaPopReport,
      collectionEntry: collectionEntry ?? null,
    };
  }
}
