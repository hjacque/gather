/**
 * One-off script: confirm all pending eBay sales from trusted sellers (PSA…).
 * Backfills sales that were scraped before auto-validation was in place.
 *
 * Usage:
 *   ts-node src/scripts/confirmTrustedSellerSales.ts [--dry-run] [--skip=N]
 *
 * --skip=N  skip the first N matching sales (resume after a partial run)
 * --dry-run prints what would be confirmed without writing to the DB.
 */

import { PrismaClient } from "@prisma/client";
import { TRUSTED_EBAY_SELLERS } from "../constants";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP = parseInt(process.argv.find((a) => a.startsWith("--skip="))?.split("=")[1] ?? "0", 10);

async function main() {
  if (DRY_RUN) console.log("[confirm-trusted] DRY RUN — no DB writes");
  if (SKIP > 0) console.log(`[confirm-trusted] skipping first ${SKIP} sale(s)`);

  const sales = await prisma.sale.findMany({
    where: {
      platform: "ebay",
      status: "pending",
      seller: { in: TRUSTED_EBAY_SELLERS },
    },
    select: { id: true, itemId: true, seller: true },
    orderBy: { createdAt: "asc" },
    skip: SKIP,
  });

  console.log(`[confirm-trusted] ${sales.length} pending trusted-seller sale(s) to confirm`);
  if (sales.length === 0) {
    await prisma.$disconnect();
    return;
  }

  let confirmed = 0;
  for (const [i, sale] of sales.entries()) {
    console.log(`[confirm-trusted] (${i + 1 + SKIP}/${sales.length + SKIP}) ${sale.itemId} seller=${sale.seller} → confirmed`);
    if (!DRY_RUN) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: { status: "confirmed", verificationStage: "complete", reviewedAt: new Date() },
      });
    }
    confirmed++;
  }

  await prisma.$disconnect();
  console.log(
    `[confirm-trusted] done — confirmed: ${confirmed}${DRY_RUN ? " (dry run)" : ""}`
  );
}

main().catch((err) => {
  console.error("[confirm-trusted] failed:", err);
  process.exit(1);
});
