import { PrismaClient } from "@prisma/client";
import {
  queryFromLink,
  buildEbayLinkFromQuery,
} from "../application/sync/sources/ebayQuery";
import { activeListingsLinkFromEbayLink } from "../application/sync/sources/activeListingsLink";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

function paddedNumber(number: string | null): string | null {
  const digits = number?.match(/\d{2,3}/)?.[0] ?? null;
  if (!digits || !digits.startsWith("0")) return null;
  return digits;
}

function padQueryNumber(query: string, padded: string): string | null {
  const stripped = padded.replace(/^0+(?=\d)/, "");
  const token = new RegExp(`(?<![\\w])${stripped}(?![\\w])`, "g");
  if (query.includes(padded) || !token.test(query)) return null;
  return query.replace(token, padded);
}

async function main() {
  const cards = await prisma.card.findMany({
    where: { ebayLink: { not: null } },
    select: {
      id: true,
      name: true,
      number: true,
      ebayLink: true,
      ebayFrLink: true,
    },
  });

  let changed = 0;
  let skipped = 0;
  for (const card of cards) {
    const padded = paddedNumber(card.number);
    const query = queryFromLink(card.ebayLink);
    if (!padded || !query) {
      skipped++;
      continue;
    }

    const fixed = padQueryNumber(query, padded);
    if (!fixed) {
      skipped++;
      continue;
    }

    const ebayLink = buildEbayLinkFromQuery(fixed);
    const ebayFrLink = card.ebayFrLink
      ? activeListingsLinkFromEbayLink(ebayLink)
      : null;

    console.log(`${card.name} (${card.number})\n  - ${query}\n  + ${fixed}`);
    if (!DRY_RUN) {
      await prisma.card.update({
        where: { id: card.id },
        data: ebayFrLink ? { ebayLink, ebayFrLink } : { ebayLink },
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
