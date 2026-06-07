import type { PriceType } from "@gather/types";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { computeMarketPrices } from "./marketPrice";
import { convertToEur } from "./eurConverter";
import { getEurToUsdRate } from "../sync/helper";

const gradeToType = (grade: number): PriceType =>
  `marketSalePsa${grade}` as PriceType;

const startOfDayUtc = (d: Date): Date => {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
};

export class MarketSalePriceSnapshotService {
  constructor(
    private readonly saleRepository: SaleRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort
  ) {}

  // Upsert Market Sale Price snapshots for `cardId` for each day in
  // [fromDate, toDate]. Recomputes each date from scratch so invalidations
  // and review corrections propagate through the full affected window.
  async recompute(
    cardId: string,
    fromDate: Date,
    toDate: Date = new Date()
  ): Promise<void> {
    const [sales, usdToEur] = await Promise.all([
      this.saleRepository.getCardSales(cardId),
      getEurToUsdRate(),
    ]);

    const salesForPricing = sales.flatMap((sale) => {
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
    });

    const from = startOfDayUtc(fromDate);
    const to = startOfDayUtc(toDate);

    for (
      let d = new Date(from);
      d <= to;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const snapshot = new Date(d);
      const grades = computeMarketPrices(salesForPricing, snapshot);
      for (const { psaGrade, priceEur } of grades) {
        await this.priceRepository.upsertPrice(
          cardId,
          priceEur,
          gradeToType(psaGrade),
          snapshot
        );
      }
    }
  }
}
