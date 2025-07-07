import { ProductEntity } from "../../entities/product.entity";
import { PriceEntity } from "../../entities/price.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";

export class GetCardUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
  ) {}

  async execute(productId: string): Promise<
    ProductEntity & {
      marketPrices: PriceEntity[];
      buylistPrices: PriceEntity[];
      ratioPrices: PriceEntity[];
    }
  > {
    const product = await this.productRepository.getCard(productId);
    const productPrices = await this.priceRepository.getCardPrices(productId);

    return {
      ...product,
      ...productPrices,
    };
  }
}
