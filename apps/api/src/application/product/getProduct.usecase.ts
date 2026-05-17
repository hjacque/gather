import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import type { GetProductResponse } from "@gather/api-contract";

export class GetProductUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort
  ) {}

  async execute(productId: string): Promise<GetProductResponse> {
    const product = await this.productRepository.getProduct(productId);
    const productPrices = await this.priceRepository.getProductPrices(productId);
    const psaReport = await this.psaPopReportRepository.findByProductId(productId);

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
      ...product,
      ...productPrices,
      psaPopReport,
    };
  }
}
