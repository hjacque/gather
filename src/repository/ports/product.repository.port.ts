import { Franchise, ProductEntity, ProductType, SetType } from "../../entities/product.entity";

export type GetProductsFilter = {
  set?: SetType,
  type?: ProductType | ProductType[],
  franchise?: Franchise
}

export abstract class ProductRepositoryPort {
  abstract getProducts(
    filters?: GetProductsFilter,
    pagination?: {
      take?: number,
      page?: number,
    }
  ): Promise<ProductEntity[]>;

  abstract getCard(productId: string): Promise<ProductEntity>;
}
