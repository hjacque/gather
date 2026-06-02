import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";

export class InvalidateSaleUsecase {
  constructor(private readonly saleRepository: SaleRepositoryPort) {}

  async execute(saleId: string): Promise<void> {
    await this.saleRepository.markInvalid(saleId);
  }
}
