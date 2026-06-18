import { PrismaClient } from "@prisma/client";
import { isAllowedAuctionSeller } from "../application/sync/sources/auctionSellers";

/**
 * One-off cleanup: delete existing Auctions whose seller is not on the auction
 * seller allowlist (auctionSellers.ts) — i.e. the auctions scraped before the
 * feed was restricted to known sellers, including rows with a null/unparsed
 * seller. Decides per row with the same `isAllowedAuctionSeller` helper the
 * scrape now uses, so what's kept matches exactly what the sync would re-ingest.
 *
 * Usage:
 *   cd apps/api && npx ts-node src/scripts/purgeUnknownSellerAuctions.ts [--dry-run]
 *     --dry-run   report what would be deleted, write nothing
 */
async function main() {
  const dryRun = process.argv.slice(2).includes("--dry-run");
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.auction.findMany({
      select: { id: true, seller: true },
    });

    const toDelete = rows.filter((r) => !isAllowedAuctionSeller(r.seller));

    // Per-seller breakdown of what's being removed, for a sanity check.
    const bySeller = new Map<string, number>();
    for (const r of toDelete) {
      const key = r.seller ?? "(null)";
      bySeller.set(key, (bySeller.get(key) ?? 0) + 1);
    }

    console.log(
      `[purge] ${rows.length} auction(s) total; ${toDelete.length} from unknown sellers ` +
        `${dryRun ? "(DRY RUN, nothing deleted)" : "to delete"}`,
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
