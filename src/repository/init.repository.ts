import { MongoClient } from "mongodb";
import {
  MONGODB_COLLECTION_PRODUCTS,
  MONGODB_COLLECTION_PERFORMANCES,
  MONGODB_COLLECTION_PRICES,
  MONGODB_DATABASE_NAME,
} from "../constants";
import { ProductModel } from "./mongo/models/product.model.mongo";
import { ProductRepositoryPort } from "./ports/product.repository.port";
import { ProductRepositoryMongo } from "./mongo/product.repository.mongo";
import { PriceRepositoryMongo } from "./mongo/price.repository.mongo";
import { PriceModel } from "./mongo/models/price.model.mongo";
import { PriceRepositoryPort } from "./ports/price.repository.port";
import { PerformanceRepositoryPort } from "./ports/performance.repository.port";
import { PerformanceModel } from "./mongo/models/performance.model.mongo";
import { PerformanceRepositoryMongo } from "./mongo/performance.repository.mongo";

export const initRepository = async (): Promise<{
  repositories: {
    productRepository: ProductRepositoryPort;
    priceRepository: PriceRepositoryPort;
    performanceRepository: PerformanceRepositoryPort;
  };
  close: () => Promise<void>;
}> => {
  // mongo
  const url = "mongodb://localhost:27017"; // todo var in .env or sops
  const mongoClient = new MongoClient(url);
  const mongoClientConnected = await mongoClient.connect();
  const mongoDBClient = mongoClientConnected.db(MONGODB_DATABASE_NAME);
  console.log("Connected successfully to server");

  // mongo collections
  const productCollection = mongoDBClient.collection<ProductModel>(
    MONGODB_COLLECTION_PRODUCTS
  );
  const priceCollection = mongoDBClient.collection<PriceModel>(
    MONGODB_COLLECTION_PRICES
  );
  const performanceCollection = mongoDBClient.collection<PerformanceModel>(
    MONGODB_COLLECTION_PERFORMANCES
  );

  // repositories
  const productRepository = new ProductRepositoryMongo(productCollection);
  const priceRepository = new PriceRepositoryMongo(priceCollection);
  const performanceRepository = new PerformanceRepositoryMongo(
    performanceCollection
  );

  return {
    repositories: {
      productRepository,
      priceRepository,
      performanceRepository,
    },
    close: async () => {
      await mongoClient.close();
    },
  };
};
