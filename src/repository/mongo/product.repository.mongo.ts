import { BSON, Collection } from "mongodb";
import { ProductEntity } from "../../entities/product.entity";
import { ProductMapper } from "./mappers/product.mapper.mongo";
import { ProductModel } from "./models/product.model.mongo";
import { ProductRepositoryPort } from "../ports/product.repository.port";

export class ProductRepositoryMongo implements ProductRepositoryPort {
  private ProductMapper: ProductMapper;

  constructor(private readonly productCollection: Collection<ProductModel>) {
    this.ProductMapper = new ProductMapper();
  }

  async getCards(
    set?: "arabian_nights" | "antiquities" | "legends" | "the_dark",
    take?: number,
    page?: number
  ): Promise<ProductEntity[]> {
    const where = set ? { set } : {};
    const products = await this.productCollection
      .find(where, { sort: { name: 1 }, limit: take, skip: page })
      .toArray();

    if (!products) {
      return [];
    }

    return products.map((product) => this.ProductMapper.toEntity(product));
  }

  async getCard(productId: string): Promise<ProductEntity> {
    const product = await this.productCollection.findOne({
      _id: new BSON.ObjectId(productId),
    });

    if (!product) {
      throw new Error("Card not found");
    }

    return this.ProductMapper.toEntity(product);
  }
}
