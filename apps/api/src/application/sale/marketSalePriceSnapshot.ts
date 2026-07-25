import type { PriceType } from "@gather/types";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { PriceEntry, PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { computeMarketPrices } from "./marketPrice";
import { getUsdToEurRate } from "../sync/helper";

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

  async recompute(
    cardId: string,
    fromDate: Date,
    toDate: Date = new Date()
  ): Promise<void> {
    const [sales, usdToEur] = await Promise.all([
      this.saleRepository.getCardSales(cardId),
      getUsdToEurRate(),
    ]);

    const from = startOfDayUtc(fromDate);
    const to = startOfDayUtc(toDate);

    const entries: PriceEntry[] = [];
    for (
      let d = new Date(from);
      d <= to;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const snapshot = new Date(d);
      for (const { psaGrade, priceEur } of computeMarketPrices(
        sales,
        usdToEur,
        snapshot
      )) {
        entries.push({
          cardId,
          value: priceEur,
          type: gradeToType(psaGrade),
          date: snapshot,
        });
      }
    }

    await this.priceRepository.upsertPrices(entries);
  }
}
