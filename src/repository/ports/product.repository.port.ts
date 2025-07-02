import { ProductEntity } from "../../entities/product.entity";

export abstract class ProductRepositoryPort {
  abstract getCards(
    set?:
      | "alpha"
      | "beta"
      | "unlimited"
      | "arabian_nights"
      | "antiquities"
      | "legends"
      | "the_dark",
    take?: number,
    page?: number
  ): Promise<ProductEntity[]>;

  abstract getCard(productId: string): Promise<ProductEntity>;
}
