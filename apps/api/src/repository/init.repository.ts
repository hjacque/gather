import { ProductRepositoryPort } from "./ports/product.repository.port";
import { PriceRepositoryPort } from "./ports/price.repository.port";
import { PerformanceRepositoryPort } from "./ports/performance.repository.port";
import { ProductRepositoryPg } from "./pg/product.repository.pg";
import { PriceRepositoryPg } from "./pg/price.repository.pg";
import { PerformanceRepositoryPg } from "./pg/performance.repository.pg";
import { PrismaClient } from "@prisma/client";

export const initRepository = async (): Promise<{
  repositories: {
    productRepository: ProductRepositoryPort;
    priceRepository: PriceRepositoryPort;
    performanceRepository: PerformanceRepositoryPort;
  };
  close: () => Promise<void>;
}> => {
  const prisma = new PrismaClient();
  console.log("Connected successfully to pg server");
  // mongo collections
  // const productCollection = mongoDBClient.collection<ProductModel>(
  //   MONGODB_COLLECTION_PRODUCTS,
  // );
  // const priceCollection = mongoDBClient.collection<PriceModel>(
  //   MONGODB_COLLECTION_PRICES,
  // );
  // const performanceCollection = mongoDBClient.collection<PerformanceModel>(
  //   MONGODB_COLLECTION_PERFORMANCES,
  // );

  // mongo repositories
  // const productRepository = new ProductRepositoryMongo(productCollection);
  // const priceRepository = new PriceRepositoryMongo(priceCollection);
  // const performanceRepository = new PerformanceRepositoryMongo(
  //   performanceCollection,
  //   productCollection,
  // );

  const productRepository = new ProductRepositoryPg(prisma);
  const priceRepository = new PriceRepositoryPg(prisma);
  const performanceRepository = new PerformanceRepositoryPg(prisma);

  return {
    repositories: {
      productRepository,
      priceRepository,
      performanceRepository,
    },
    close: async () => {
      await prisma.$disconnect();
    },
  };
};
