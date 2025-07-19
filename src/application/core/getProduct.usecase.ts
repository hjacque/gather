import { NewProductEntity } from "../../entities/product.entity";
import { PriceEntity } from "../../entities/price.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";

export class GetProductUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
  ) {}

  async execute(productId: string): Promise<
    NewProductEntity & {
      marketPrices: PriceEntity[];
      buylistPrices: PriceEntity[];
      ratioPrices: PriceEntity[];
      fullSetPrices: PriceEntity[];
    }
  > {
    const product = await this.productRepository.getProduct(productId);
    const productPrices = await this.priceRepository.getProductPrices(productId);

    return {
      ...product,
      ...productPrices,
    };
  }
}
