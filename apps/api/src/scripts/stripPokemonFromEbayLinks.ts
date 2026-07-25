import { PrismaClient } from "@prisma/client";
import {
  queryFromLink,
  buildEbayLinkFromQuery,
} from "../application/sync/sources/ebayQuery";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

function stripLeadingPokemon(query: string): string {
  return query.replace(/^\s*pokemon\b\s*/i, "").trim();
}

async function main() {
  const cards = await prisma.card.findMany({
    where: { ebayLink: { not: null } },
    select: { id: true, name: true, ebayLink: true },
  });

  let changed = 0;
  let skipped = 0;
  for (const card of cards) {
    const query = queryFromLink(card.ebayLink);
    if (!query) {
      skipped++;
      continue;
    }
    const stripped = stripLeadingPokemon(query);
    if (stripped === query) {
      skipped++;
      continue;
    }
    console.log(`${card.name}\n  - ${query}\n  + ${stripped}`);
    if (!DRY_RUN) {
      await prisma.card.update({
        where: { id: card.id },
        data: { ebayLink: buildEbayLinkFromQuery(stripped) },
      });
    }
    changed++;
  }

  console.log(
    `\n${DRY_RUN ? "[dry-run] would update" : "updated"} ${changed} card(s), ${skipped} unchanged`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
