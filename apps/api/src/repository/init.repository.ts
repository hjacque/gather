import { ProductRepositoryPort } from "./ports/product.repository.port";
import { PriceRepositoryPort } from "./ports/price.repository.port";
import { PerformanceRepositoryPort } from "./ports/performance.repository.port";
import { PsaPopReportRepositoryPort } from "./ports/psaPopReport.repository.port";
import { ProductRepositoryPg } from "./pg/product.repository.pg";
import { PriceRepositoryPg } from "./pg/price.repository.pg";
import { PerformanceRepositoryPg } from "./pg/performance.repository.pg";
import { PsaPopReportRepositoryPg } from "./pg/psaPopReport.repository.pg";
import { PrismaClient } from "@prisma/client";

export const initRepository = async (): Promise<{
  repositories: {
    productRepository: ProductRepositoryPort;
    priceRepository: PriceRepositoryPort;
    performanceRepository: PerformanceRepositoryPort;
    psaPopReportRepository: PsaPopReportRepositoryPort;
  };
  close: () => Promise<void>;
}> => {
  const prisma = new PrismaClient();
  console.log("Connected successfully to pg server");

  const productRepository = new ProductRepositoryPg(prisma);
  const priceRepository = new PriceRepositoryPg(prisma);
  const performanceRepository = new PerformanceRepositoryPg(prisma);
  const psaPopReportRepository = new PsaPopReportRepositoryPg(prisma);

  return {
    repositories: {
      productRepository,
      priceRepository,
      performanceRepository,
      psaPopReportRepository,
    },
    close: async () => {
      await prisma.$disconnect();
    },
  };
};
