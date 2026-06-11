import { CardRepositoryPort } from "./ports/card.repository.port";
import { PriceRepositoryPort } from "./ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "./ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "./ports/collection.repository.port";
import { SaleRepositoryPort } from "./ports/sale.repository.port";
import { ListingRepositoryPort } from "./ports/listing.repository.port";
import { CardRepositoryPg } from "./pg/card.repository.pg";
import { PriceRepositoryPg } from "./pg/price.repository.pg";
import { PsaPopReportRepositoryPg } from "./pg/psaPopReport.repository.pg";
import { CollectionRepositoryPg } from "./pg/collection.repository.pg";
import { SaleRepositoryPg } from "./pg/sale.repository.pg";
import { ListingRepositoryPg } from "./pg/listing.repository.pg";
import { PrismaClient } from "@prisma/client";

export const initRepository = async (): Promise<{
  repositories: {
    cardRepository: CardRepositoryPort;
    priceRepository: PriceRepositoryPort;
    psaPopReportRepository: PsaPopReportRepositoryPort;
    collectionRepository: CollectionRepositoryPort;
    saleRepository: SaleRepositoryPort;
    listingRepository: ListingRepositoryPort;
  };
  close: () => Promise<void>;
}> => {
  const prisma = new PrismaClient();
  console.log("Connected successfully to pg server");

  const cardRepository = new CardRepositoryPg(prisma);
  const priceRepository = new PriceRepositoryPg(prisma);
  const psaPopReportRepository = new PsaPopReportRepositoryPg(prisma);
  const collectionRepository = new CollectionRepositoryPg(prisma);
  const saleRepository = new SaleRepositoryPg(prisma);
  const listingRepository = new ListingRepositoryPg(prisma);

  return {
    repositories: {
      cardRepository,
      priceRepository,
      psaPopReportRepository,
      collectionRepository,
      saleRepository,
      listingRepository,
    },
    close: async () => {
      await prisma.$disconnect();
    },
  };
};
