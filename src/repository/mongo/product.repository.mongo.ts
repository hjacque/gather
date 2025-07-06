import { BSON, Collection } from "mongodb";
import { Franchise, ProductEntity, ProductType, SetType } from "../../entities/product.entity";
import { ProductMapper } from "./mappers/product.mapper.mongo";
import { ProductModel } from "./models/product.model.mongo";
import { GetProductsFilter, ProductRepositoryPort } from "../ports/product.repository.port";

export class ProductRepositoryMongo implements ProductRepositoryPort {
  private ProductMapper: ProductMapper;

  constructor(private readonly productCollection: Collection<ProductModel>) {
    this.ProductMapper = new ProductMapper();
  }
 
  async getProducts(
    filters: GetProductsFilter,
    pagination?: {
      take?: number,
      page?: number
    }
  ): Promise<ProductEntity[]> {
    let where = structuredClone(filters as any);
    for (let [key, value] of Object.entries(where)) {
      if (value === undefined) {
        delete where[key as keyof GetProductsFilter];
        continue;
      }
      if (key === "type" && typeof where["type"] !== "string") { 
          where.type = { $in: [...where[key as keyof GetProductsFilter]]};
      }
    }

    const products = await this.productCollection
      .find(where, { sort: { releaseDate: -1, name: 1, set: 1 }, limit: pagination?.take, skip: pagination?.page })
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
