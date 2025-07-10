import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { Franchise, ProductType } from "entities/product.entity";

export class GetProductsUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
  ) {}

  async execute(filter?: {
    franchise?: Franchise;
    type?: ProductType | ProductType[];
  }) {
    const products = await this.productRepository.getProducts(filter);
    const productIds = products.map((product) => product.id);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const prices = await this.priceRepository.getProductsPricesByDate(
      productIds,
      today,
    );

    const performances = await this.performanceRepository.getPerformances(
      productIds,
      today,
    );

    return products.map((product) => {
      const { market, buylist, ratio, perBooster } = prices.get(product.id)!;
      const performance = performances.get(product.id)!;
      return {
        ...product,
        market,
        buylist,
        ratio,
        perBooster,
        performance,
      };
    });
  }
}
