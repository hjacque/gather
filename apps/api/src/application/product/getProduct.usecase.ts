import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import type { GetProductResponse } from "@gather/api-contract";

export class GetProductUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
  ) {}

  async execute(productId: string): Promise<GetProductResponse> {
    const product = await this.productRepository.getProduct(productId);
    const productPrices = await this.priceRepository.getProductPrices(productId);

    return {
      ...product,
      ...productPrices,
    };
  }
}
