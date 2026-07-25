import { PrismaClient } from "@prisma/client";
import { isAllowedAuctionSeller } from "../application/sync/sources/auctionSellers";

async function main() {
  const dryRun = !process.argv.slice(2).includes("--confirm");
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.auction.findMany({
      select: { id: true, seller: true },
    });

    const toDelete = rows.filter((r) => !isAllowedAuctionSeller(r.seller));

    const bySeller = new Map<string, number>();
    for (const r of toDelete) {
      const key = r.seller ?? "(null)";
      bySeller.set(key, (bySeller.get(key) ?? 0) + 1);
    }

    console.log(
      `[purge] ${rows.length} auction(s) total; ${toDelete.length} from unknown sellers ` +
        `${dryRun ? "(DRY RUN, nothing deleted; pass --confirm to delete)" : "to delete"}`,
    );
    for (const [seller, count] of [...bySeller].sort((a, b) => b[1] - a[1])) {
      console.log(`[purge]   ${seller}: ${count}`);
    }

    if (!dryRun && toDelete.length > 0) {
      const { count } = await prisma.auction.deleteMany({
        where: { id: { in: toDelete.map((r) => r.id) } },
      });
      console.log(`[purge] deleted ${count} auction(s)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[purge] failed:", e);
  process.exit(1);
});
