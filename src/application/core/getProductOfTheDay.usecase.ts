import {
  Set,
  Franchise,
  ProductType,
  NewProductEntity,
} from "../../entities/product.entity";
import { PerformanceEntity } from "../../entities/performance.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";

export type GetProductOfTheDayUsecaseInputDto = {
  set?: Set;
  franchise: Franchise;
  type: ProductType;
};

export class GetProductOfTheDayUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
  ) {}

  async execute(
    dto: GetProductOfTheDayUsecaseInputDto,
  ): Promise<
    (NewProductEntity & { topPerformance: PerformanceEntity }) | undefined
  > {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const topPerformance = await this.performanceRepository.getTopPerformance(
      today,
      dto.franchise,
      dto.type,
    );

    if (!topPerformance) {
      return undefined;
    }

    const product = await this.productRepository.getProduct(
      topPerformance.productId,
    );

    return {
      ...product,
      topPerformance,
    };
  }
}
