import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { connect } from "puppeteer-real-browser";
import { PrismaClient } from "@prisma/client";
import { CardEntity } from "../entities/card.entity";
import { CardRepositoryPg } from "../repository/pg/card.repository.pg";
import { SaleRepositoryPg } from "../repository/pg/sale.repository.pg";
import {
  TerapeakSalesSource,
  TerapeakAuthError,
  TerapeakRateLimitError,
  TERAPEAK_REAUTH_CMD,
} from "../application/sync/sources/terapeakSales.source";
import { parseListingTitle } from "../application/sync/sources/listingTitleParser";

/**
 * One-off historical Sale backfill from Terapeak (Seller Hub → Research).
 *
 * The recurring Sale Sync only keeps the trailing 30 days; this script ingests
 * up to ~3 years of older sold history so the Market Sale Price graphs have a
 * real past, then leaves snapshot recomputation to
 * backfillMarketSalePriceSnapshots.ts.
 *
 * It is deliberately *separate* from SyncSalesUsecase and bypasses the seller
 * verification pipeline: the listings are long gone, so their item pages can't
 * be checked. Rows are persisted as already-confirmed trusted history
 * (status=confirmed, verificationStage=complete, reviewedAt=now), which also
 * keeps them out of the manual review and re-verification queues. Terapeak only
 * reports realized transaction prices (never Best-Offer asks), so this is the
 * authoritative accepted price — see the TerapeakSalesSource docs and ADR 0008.
 *
 * It runs across All eBay sites (selectAllSites) so non-US sales count too;
 * Terapeak normalizes every price to USD, so the existing parse + conversion is
 * unchanged. Only single-transaction rows (soldCount === 1) are taken — multi-
 * quantity GTC rows are a blended average pinned to their most-recent date and
 * would be misleading graph points.
 *
 * Idempotent: upsert keys on (platform, itemId, cardId) and the provenance guard
 * makes re-scrapes safe, so re-running only adds genuinely new rows.
 *
 * Rate limiting: eBay throttles sustained scraping with a "Pardon Our
 * Interruption" interstitial. fetchWindow retries each page through a back-off
 * ladder and, when that's exhausted, throws TerapeakRateLimitError so the run
 * aborts loudly instead of reading throttled (empty) pages as "no results" and
 * leaving cards with missing windows. Resume safely with a completion-state file
 * (cards are recorded only after their *full* 3-year walk finishes, so an aborted
 * card is redone from scratch — the idempotent upsert makes the redo free).
 *
 * Usage:
 *   cd apps/api && npx ts-node src/scripts/backfillTerapeakSales.ts [options]
 *     --card <id>        only this Card (good for a dry-run first; ignores state)
 *     --years <n>        how far back to go (default 3)
 *     --chunk-days <n>   date-chunk size, keeps each fetch under the 500 cap (default 60)
 *     --dry-run          scrape + parse but do not write (and do not record state)
 *     --force            re-do Cards already recorded complete in the state file
 *     --state <path>     completion-state file (default ~/.gather/terapeak-backfill-progress.json)
 */

const DAY_MS = 24 * 60 * 60 * 1000;

type Args = {
  card?: string;
  years: number;
  chunkDays: number;
  dryRun: boolean;
  force: boolean;
  state: string;
  seedFromDb: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    years: 3,
    chunkDays: 60,
    dryRun: false,
    force: false,
    state: `${process.env.HOME ?? "."}/.gather/terapeak-backfill-progress.json`,
    seedFromDb: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--card") args.card = argv[++i];
    else if (a === "--years") args.years = Number(argv[++i]);
    else if (a === "--chunk-days") args.chunkDays = Number(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--state") args.state = argv[++i];
    else if (a === "--seed-from-db") args.seedFromDb = true;
  }
  return args;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Completion state: cardIds whose full 3-year walk finished. Used to skip on
// resume; an aborted (rate-limited) Card is never recorded, so it is redone.
function loadDone(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  try {
    return new Set(JSON.parse(readFileSync(path, "utf8")) as string[]);
  } catch {
    return new Set();
  }
}

function recordDone(path: string, done: Set<string>, cardId: string): void {
  done.add(cardId);
  writeFileSync(path, JSON.stringify([...done]));
}

async function openBrowser() {
  const userDataDir =
    process.env.EBAY_PROFILE_DIR ??
    `${process.env.HOME ?? "."}/.gather/ebay-profile`;
  mkdirSync(userDataDir, { recursive: true });
  const { browser, page } = await connect({
    headless: false,
    disableXvfb: false,
    args: [],
    customConfig: { userDataDir },
    turnstile: true,
    connectOption: { defaultViewport: null },
    ignoreAllFlags: false,
    plugins: [require("puppeteer-extra-plugin-stealth")()],
  });
  await page.setViewport({
    width: Math.floor(1024 + Math.random() * 100),
    height: Math.floor(768 + Math.random() * 100),
  });
  return { browser, page };
}

async function collectCards(
  repo: CardRepositoryPg,
  cardId?: string
): Promise<CardEntity[]> {
  if (cardId) return [await repo.getCard(cardId)];
  const all: CardEntity[] = [];
  for (let page = 1; ; page++) {
    const cards = await repo.getCards({}, { take: 50, page });
    if (!cards?.length) break;
    all.push(...cards);
  }
  return all.filter((c) => !!c.ebayLink);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const cardRepository = new CardRepositoryPg(prisma);
  const saleRepository = new SaleRepositoryPg(prisma);
  const source = new TerapeakSalesSource();

  const done = args.card ? new Set<string>() : loadDone(args.state);

  // One-time seed for resuming a run that predates the state file: treat Cards
  // that already hold confirmed historical sales (older than the recurring 30-day
  // window) as complete, so we don't re-scrape them.
  if (args.seedFromDb && !args.card) {
    const seeded = await prisma.sale.findMany({
      where: {
        source: "terapeak",
        status: "confirmed",
        reviewedAt: { not: null },
        soldAt: { lt: new Date(Date.now() - 60 * DAY_MS) },
      },
      distinct: ["cardId"],
      select: { cardId: true },
    });
    for (const { cardId } of seeded) done.add(cardId);
    if (!args.dryRun) writeFileSync(args.state, JSON.stringify([...done]));
    console.log(`[backfill] seeded ${seeded.length} done Card(s) from DB`);
  }

  const cards = await collectCards(cardRepository, args.card);
  console.log(
    `[backfill] ${cards.length} Card(s); years=${args.years} chunk=${args.chunkDays}d ` +
      `${done.size ? `(resuming, ${done.size} done) ` : ""}` +
      `${args.dryRun ? "(DRY RUN) " : ""}${args.force ? "(FORCE) " : ""}`
  );

  const { browser, page } = await openBrowser();
  const totals = { scraped: 0, ingested: 0, multiSale: 0, parseSkip: 0, doneSkip: 0 };

  try {
    // Switch to All sites once; the preference sticks for the session.
    const all = await source.selectAllSites(page);
    if (!all) console.warn("[backfill] proceeding US-only (All sites not set)");

    const totalDays = Math.round(args.years * 365);

    for (const card of cards) {
      if (!args.force && done.has(card.id)) {
        totals.doneSkip++;
        continue;
      }

      const seen = new Set<string>();
      let cardIngested = 0;

      // Walk back in chunks, newest first; each chunk stays under the 500 cap.
      // Throttling throws TerapeakRateLimitError out of here, leaving the Card
      // unrecorded so it is redone in full on resume.
      for (let back = 0; back < totalDays; back += args.chunkDays) {
        const endDate = Date.now() - back * DAY_MS;
        const startDate = Date.now() - Math.min(back + args.chunkDays, totalDays) * DAY_MS;

        const sales = await source.fetchWindow(card, page, startDate, endDate, {
          throwOnRateLimit: true,
        });
        totals.scraped += sales.length;

        for (const sale of sales) {
          if (seen.has(sale.itemId)) continue;
          seen.add(sale.itemId);

          // Multi-quantity rows are a blended average pinned to the latest date.
          if (sale.soldCount !== 1) {
            totals.multiSale++;
            continue;
          }

          const parsed = parseListingTitle(sale.title, { number: card.number });
          if (parsed.kind === "skipped") {
            totals.parseSkip++;
            continue;
          }

          if (!args.dryRun) {
            await saleRepository.upsert({
              cardId: card.id,
              platform: "ebay",
              itemId: sale.itemId,
              psaGrade: parsed.grade,
              price: sale.price,
              currency: sale.currency,
              title: sale.title,
              isBestOffer: false,
              seller: null,
              source: "terapeak",
              soldAt: sale.soldAt,
              // Confirmed trusted history: bypasses review + re-verification.
              reviewedAt: new Date(),
              status: "confirmed",
              verificationStage: "complete",
            });
          }
          totals.ingested++;
          cardIngested++;
        }

        await sleep(5000 + Math.random() * 5000);
      }

      // Full walk finished without throttling — record it so resume skips it.
      if (!args.dryRun) recordDone(args.state, done, card.id);

      console.log(
        `[backfill] ${card.name}: ${cardIngested} historical sale(s) ` +
          `${args.dryRun ? "(would ingest)" : "ingested"}`
      );
      await sleep(8000 + Math.random() * 7000);
    }
  } catch (error) {
    if (error instanceof TerapeakRateLimitError) {
      console.error(
        `[backfill] ${error.message} — eBay is throttling. Stop, wait ~30–60 min ` +
          `for the limit to reset, then re-run the SAME command to resume ` +
          `(completed Cards are skipped; the interrupted Card is redone in full).`
      );
    } else if (error instanceof TerapeakAuthError) {
      console.error(
        `[backfill] Terapeak session expired — re-authenticate and re-run ` +
          `(idempotent):\n  ${TERAPEAK_REAUTH_CMD}`
      );
    } else {
      throw error;
    }
  } finally {
    await page.close();
    await browser.close();
    await prisma.$disconnect();
  }

  console.log("[backfill] done:", totals);
  if (!args.dryRun) {
    console.log(
      "[backfill] next: rebuild graphs with\n" +
        "  npx ts-node src/scripts/backfillMarketSalePriceSnapshots.ts"
    );
  }
}

main().catch((e) => {
  console.error("[backfill] failed:", e);
  process.exit(1);
});
