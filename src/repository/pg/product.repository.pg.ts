import { ProductEntity, ProductType } from "../../entities/product.entity";
import { ProductMapper } from "./mappers/product.mapper.pg";
import {
  GetProductsFilter,
  ProductRepositoryPort,
} from "../ports/product.repository.port";
import { ProductSetEntity } from "entities/productSet.entity";
import { ProductSetMapper } from "./mappers/productSet.mapper.tg";
import { PrismaClient } from "@prisma/client";

export class ProductRepositoryPg implements ProductRepositoryPort {
  private productMapper: ProductMapper;
  private productSetMapper: ProductSetMapper;

  constructor(private readonly prisma: PrismaClient) {
    this.productMapper = new ProductMapper();
    this.productSetMapper = new ProductSetMapper();
  }

  async getProducts(
    filters: GetProductsFilter,
    pagination?: {
      take?: number;
      page?: number;
    },
  ): Promise<(ProductEntity & {productSet: ProductSetEntity})[]> {
    // for (let [key, value] of Object.entries(where)) {
    //   if (value === undefined) {
    //     delete where[key as keyof GetProductsFilter];
    //     continue;
    //   }
    //   if (key === "type" && typeof where["type"] !== "string") {
    //     where.type = { in: [...where[key as keyof GetProductsFilter]] };
    //   }
    // }

    const take = pagination?.take ?? undefined;
    const skip = pagination?.page ? (pagination.page - 1) * (take || 1) : 0;

    const products = await this.prisma.product.findMany({
        where: {
          productSet: {
            franchise: filters.franchise,
            name: filters.set
          },
          type: filters.type ? (typeof filters.type === "string" ? filters.type : { in: [...filters.type] }) : undefined,
        },
        orderBy: [
          {
            productSet: {
              releaseDate: 'desc'
            }
          },
          {
            name: 'asc'
          },
        ],
        include: {
          productSet: true,
        },
        take,
        skip,
    });

    if (!products) {
      return [];
    }

    return products.map((product) => {
      return {
        ...this.productMapper.toEntity(product),
        productSet: this.productSetMapper.toEntity(product.productSet)
      }
    });
  }

  async getProduct(productId: string): Promise<(ProductEntity & {productSet: ProductSetEntity})> {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: {
        productSet: true,
      },
    });

    return {
        ...this.productMapper.toEntity(product),
        productSet: this.productSetMapper.toEntity(product.productSet)
      };
  }
}
