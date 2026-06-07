import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { MarketSalePriceSnapshotService } from "./marketSalePriceSnapshot";

export class InvalidateSaleUsecase {
  constructor(
    private readonly saleRepository: SaleRepositoryPort,
    private readonly snapshotService: MarketSalePriceSnapshotService
  ) {}

  async execute(saleId: string): Promise<void> {
    const sale = await this.saleRepository.getSaleById(saleId);
    await this.saleRepository.markInvalid(saleId);
    await this.snapshotService.recompute(sale.cardId, sale.soldAt);
  }
}
