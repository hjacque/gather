import {
  Franchise,
  ProductEntity,
  ProductType,
  Set,
} from "../../entities/product.entity";

export type GetProductsFilter = {
  set?: Set;
  type?: ProductType | ProductType[];
  franchise?: Franchise;
};

export abstract class ProductRepositoryPort {
  abstract getProducts(
    filters?: GetProductsFilter,
    pagination?: {
      take?: number;
      page?: number;
    },
  ): Promise<ProductEntity[]>;

  abstract getCard(productId: string): Promise<ProductEntity>;
}
