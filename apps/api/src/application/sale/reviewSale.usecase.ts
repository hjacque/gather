import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { MarketSalePriceSnapshotService } from "./marketSalePriceSnapshot";

// Records a Sale Review (the "approve" path): stamps reviewedAt and applies any
// admin corrections. Flagging a Sale invalid is the separate InvalidateSale
// use case. See Sale Review in CONTEXT.md.
export class ReviewSaleUsecase {
  constructor(
    private readonly saleRepository: SaleRepositoryPort,
    private readonly snapshotService: MarketSalePriceSnapshotService
  ) {}

  async approve(
    saleId: string,
    edits: { psaGrade?: number; price?: number } = {}
  ): Promise<void> {
    if (edits.psaGrade !== undefined) {
      const g = edits.psaGrade;
      if (!Number.isInteger(g) || g < 1 || g > 10) {
        throw new Error("psaGrade must be an integer between 1 and 10");
      }
    }
    if (edits.price !== undefined && !(edits.price > 0)) {
      throw new Error("price must be a positive number");
    }
    const sale = await this.saleRepository.getSaleById(saleId);
    await this.saleRepository.markReviewed(saleId, edits);
    await this.snapshotService.recompute(sale.cardId, sale.soldAt);
  }
}
