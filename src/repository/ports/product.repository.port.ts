import { Franchise, ProductEntity, ProductType, SetType } from "../../entities/product.entity";

export abstract class ProductRepositoryPort {
  abstract getProducts(
    filters?: {
      set?: SetType,
      type?: ProductType,
      franchise?: Franchise
    },
    pagination?: {
      take?: number,
      page?: number,
    }
  ): Promise<ProductEntity[]>;

  abstract getCard(productId: string): Promise<ProductEntity>;
}
