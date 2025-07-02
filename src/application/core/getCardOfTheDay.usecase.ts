import { ProductEntity } from "../../entities/product.entity";
import { PerformanceEntity } from "../../entities/performance.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";

export class GetCardOfTheDayUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort
  ) {}

  async execute(): Promise<
    (ProductEntity & { topPerformance: PerformanceEntity }) | undefined
  > {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const topPerformance =
      await this.performanceRepository.getTopPerformance(today);

    console.log("topPerformance", topPerformance);

    if (!topPerformance) {
      return undefined;
    }

    const product = await this.productRepository.getCard(topPerformance.productId);

    return {
      ...product,
      topPerformance,
    };
  }
}
