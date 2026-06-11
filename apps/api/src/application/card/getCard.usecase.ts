import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { LISTING_FRESHNESS_DAYS } from "../../entities/listing.entity";
import { getEurToUsdRate } from "../sync/helper";
import { convertToEur } from "../sale/eurConverter";
import { computeMarketPrices } from "../sale/marketPrice";
import type {
  GetCardResponse,
  ListingRecord,
  SaleRecord,
} from "@gather/api-contract";

export class GetCardUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort,
    private readonly saleRepository: SaleRepositoryPort,
    private readonly listingRepository: ListingRepositoryPort
  ) {}

  async execute(cardId: string): Promise<GetCardResponse> {
    const card = await this.cardRepository.getCard(cardId);
    const listingsSince = new Date();
    listingsSince.setUTCHours(0, 0, 0, 0);
    listingsSince.setUTCDate(listingsSince.getUTCDate() - LISTING_FRESHNESS_DAYS);
    const [cardPrices, psaReport, collectionEntry, sales, listingsByCard, usdToEur] =
      await Promise.all([
        this.priceRepository.getCardPrices(cardId),
        this.psaPopReportRepository.findByCardId(cardId),
        this.collectionRepository.findByCardId(cardId),
        this.saleRepository.getCardSales(cardId),
        this.listingRepository.getCardsListings([cardId], listingsSince),
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

    // Live asks in EUR, cheapest first within each grade. Unconvertible
    // currencies are dropped, like Sales.
    const listingRecords: ListingRecord[] = (listingsByCard.get(cardId) ?? [])
      .flatMap((listing) => {
        const priceEur = convertToEur(listing.price, listing.currency, usdToEur);
        if (priceEur === null) return [];
        return [
          {
            id: listing.id,
            psaGrade: listing.psaGrade,
            priceEur,
            isBestOffer: listing.isBestOffer,
            source: listing.platform === "ebay" ? ("ebay" as const) : ("cardmarket" as const),
            title: listing.title,
            url: `https://www.ebay.com/itm/${listing.itemId}`,
            seenAt: listing.seenAt,
          },
        ];
      })
      .sort((a, b) => a.psaGrade - b.psaGrade || a.priceEur - b.priceEur);

    // Per-grade Market Sale Price; eligibility (invalid, unconvertible,
    // Best-Offer/review gate) is owned by computeMarketPrices.
    const marketPrices = computeMarketPrices(sales, usdToEur);

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
      listings: listingRecords,
      marketPrices,
      psaPopReport,
      collectionEntry: collectionEntry ?? null,
    };
  }
}
