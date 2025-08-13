import { ProductSetEntity } from "../../entities/productSet.entity";
import {
  Franchise,
  ProductEntity,
  ProductType,
  Set,
} from "../../entities/product.entity";

export type GetProductsFilter = {
  set?: string;
  type?: ProductType | ProductType[];
  franchise?: Franchise;
  tags?: string | string[];
};

export abstract class ProductRepositoryPort {
  abstract getProducts(
    filters?: GetProductsFilter,
    pagination?: {
      take?: number;
      page?: number;
    },
  ): Promise<(ProductEntity & {productSet: ProductSetEntity})[]>;

  abstract getProduct(productId: string): Promise<ProductEntity & {productSet: ProductSetEntity}>;
}
