import { PrismaClient } from "@prisma/client";
import { PriceRepositoryPg } from "../repository/pg/price.repository.pg";
import { SaleRepositoryPg } from "../repository/pg/sale.repository.pg";
import { MarketSalePriceSnapshotService } from "../application/sale/marketSalePriceSnapshot";

const prisma = new PrismaClient();

async function main() {
  const priceRepository = new PriceRepositoryPg(prisma);
  const saleRepository = new SaleRepositoryPg(prisma);
  const snapshotService = new MarketSalePriceSnapshotService(
    saleRepository,
    priceRepository
  );

  const distinctCards = await prisma.sale.findMany({
    distinct: ["cardId"],
    select: { cardId: true },
  });

  console.log(`Backfilling ${distinctCards.length} cards...`);

  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);

  for (const { cardId } of distinctCards) {
    const earliest = await prisma.sale.findFirst({
      where: { cardId },
      orderBy: { soldAt: "asc" },
      select: { soldAt: true },
    });
    if (!earliest) continue;

    const fromDate = new Date(earliest.soldAt);
    fromDate.setUTCHours(0, 0, 0, 0);

    const days =
      Math.ceil(
        (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;
    console.log(
      `  ${cardId}: ${days} days from ${fromDate.toISOString().slice(0, 10)}`
    );

    await snapshotService.recompute(cardId, fromDate, toDate);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
