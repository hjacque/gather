import { PrismaClient } from "@prisma/client";
import { isEuCountry } from "../application/sync/sources/euLocation";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--confirm");
const CHUNK = 500;

async function main() {
  if (DRY_RUN)
    console.log("[cleanup-eu] DRY RUN — no DB writes; pass --confirm to delete");

  const rows = await prisma.listing.findMany({
    where: { platform: "ebay" },
    select: { id: true, location: true },
  });
  console.log(`[cleanup-eu] ${rows.length} eBay listing(s) to classify`);

  let euKept = 0;
  let nullDropped = 0;
  const nonEuByCountry: Record<string, number> = {};
  const toDelete: string[] = [];

  for (const row of rows) {
    if (row.location === null) {
      nullDropped++;
      toDelete.push(row.id);
      continue;
    }
    if (isEuCountry(row.location)) {
      euKept++;
      continue;
    }
    nonEuByCountry[row.location] = (nonEuByCountry[row.location] ?? 0) + 1;
    toDelete.push(row.id);
  }

  console.log(`[cleanup-eu] keep (EU): ${euKept}`);
  console.log(`[cleanup-eu] drop (null/unverifiable): ${nullDropped}`);
  console.log(`[cleanup-eu] drop (non-EU):`, nonEuByCountry);
  console.log(`[cleanup-eu] ${toDelete.length} listing(s) to delete`);

  if (!DRY_RUN && toDelete.length > 0) {
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += CHUNK) {
      const res = await prisma.listing.deleteMany({
        where: { id: { in: toDelete.slice(i, i + CHUNK) } },
      });
      deleted += res.count;
    }
    console.log(`[cleanup-eu] deleted ${deleted} listing(s)`);
    console.log("[cleanup-eu] run a Listings Sync to repopulate EU-only asks");
  }

  console.log(
    `[cleanup-eu] done — ${DRY_RUN ? "would delete" : "deleted"} ${toDelete.length} listing(s)${DRY_RUN ? " (dry run)" : ""}`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[cleanup-eu] failed:", err);
  process.exit(1);
});
