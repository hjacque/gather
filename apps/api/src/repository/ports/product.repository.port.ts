import { ProductSetEntity } from "../../entities/productSet.entity";
import {
  ProductEntity,
  Set,
} from "../../entities/product.entity";
import { Region } from "@gather/types";

export type GetProductsFilter = {
  set?: string;
  tags?: string | string[];
  region?: Region | Region[];
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

  abstract updateProductNote(productId: string, note: string | null): Promise<void>;
}
