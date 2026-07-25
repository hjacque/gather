import { PrismaClient } from "@prisma/client";
import { activeListingsLinkFromEbayLink } from "../application/sync/sources/activeListingsLink";

async function main() {
  const overwrite = process.argv.includes("--overwrite");
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();
  try {
    const cards = await prisma.card.findMany({
      where: overwrite
        ? { ebayLink: { not: null } }
        : { ebayFrLink: null, ebayLink: { not: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, ebayLink: true },
    });
    console.log(
      `[ebayFrLinks] ${cards.length} card(s) to ${overwrite ? "regenerate" : "fill"}${dryRun ? " (dry-run)" : ""}`
    );
    let updated = 0;
    for (const card of cards) {
      const link = activeListingsLinkFromEbayLink(card.ebayLink);
      if (!link) continue;
      if (dryRun) {
        if (updated < 10) console.log(`  ${card.name}\n    -> ${link}`);
        updated++;
        continue;
      }
      await prisma.card.update({
        where: { id: card.id },
        data: { ebayFrLink: link },
      });
      updated++;
    }
    console.log(
      `[ebayFrLinks] ${dryRun ? "would update" : "updated"} ${updated} card(s)`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ebayFrLinks] failed:", err);
  process.exit(1);
});
