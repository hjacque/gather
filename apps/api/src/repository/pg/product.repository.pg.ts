import { ProductEntity } from "../../entities/product.entity";
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

    const include = { productSet: true } as const;
    const products = await this.prisma.product.findMany({
        where: {
          productSet: {
            name: filters.set,
          },
          tags: filters.tags ? (typeof filters.tags === "string" ? { has: filters.tags } : { hasSome: filters.tags }) : undefined,
          regions: filters.region ? (typeof filters.region === "string" ? { has: filters.region } : { hasSome: filters.region }) : undefined,
        },
        orderBy: [
          { productSet: { releaseDate: 'desc' } },
          { name: 'asc' },
        ],
        include,
        take,
        skip,
    });

    if (!products) {
      return [];
    }

    return products.map((product) => {
      return {
        ...this.productMapper.toEntity(product),
        productSet: this.productSetMapper.toEntity(product.productSet),
      };
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

  async updateProductNote(productId: string, note: string | null): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { note },
    });
  }
}
