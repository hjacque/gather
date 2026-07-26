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
import { clearStaleProfileLock } from "../application/sync/sources/browserProfile";

const DAY_MS = 24 * 60 * 60 * 1000;

type Args = {
  cards: string[];
  paddedNumbers: boolean;
  years: number;
  chunkDays: number;
  dryRun: boolean;
  force: boolean;
  state: string;
  seedFromDb: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    cards: [],
    paddedNumbers: false,
    years: 3,
    chunkDays: 60,
    dryRun: false,
    force: false,
    state: `${process.env.HOME ?? "."}/.gather/terapeak-backfill-progress.json`,
    seedFromDb: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--card")
      args.cards.push(...argv[++i].split(",").map((c) => c.trim()).filter(Boolean));
    else if (a === "--padded-numbers") args.paddedNumbers = true;
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
  const lock = clearStaleProfileLock(userDataDir);
  if (lock.cleared) console.log(`[backfill] cleared ${lock.reason}`);
  if (!lock.cleared && lock.reason.startsWith("Chrome still running"))
    throw new Error(
      `Another Chrome owns the profile ${userDataDir} — ${lock.reason}. ` +
        `Close that window (or kill the pid) and re-run.`
    );
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

async function paddedNumberCardIds(prisma: PrismaClient): Promise<string[]> {
  const cards = await prisma.card.findMany({
    where: { ebayLink: { not: null } },
    select: { id: true, number: true },
  });
  return cards
    .filter((c) => c.number?.match(/\d{2,3}/)?.[0]?.startsWith("0"))
    .map((c) => c.id);
}

async function collectCards(
  repo: CardRepositoryPg,
  cardIds: string[]
): Promise<CardEntity[]> {
  if (cardIds.length) {
    const cards: CardEntity[] = [];
    for (const id of cardIds) cards.push(await repo.getCard(id));
    return cards;
  }
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

  if (args.paddedNumbers) args.cards.push(...(await paddedNumberCardIds(prisma)));
  const explicit = args.cards.length > 0;

  const done = loadDone(args.state);

  if (args.seedFromDb && !explicit) {
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

  const cards = await collectCards(cardRepository, [...new Set(args.cards)]);
  console.log(
    `[backfill] ${cards.length} Card(s); years=${args.years} chunk=${args.chunkDays}d ` +
      `${done.size ? `(resuming, ${done.size} done) ` : ""}` +
      `${args.dryRun ? "(DRY RUN) " : ""}${args.force ? "(FORCE) " : ""}`
  );

  const { browser, page } = await openBrowser();
  const totals = { scraped: 0, ingested: 0, multiSale: 0, parseSkip: 0, doneSkip: 0 };

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  };

  const onSignal = (signal: NodeJS.Signals) => {
    void (async () => {
      console.log(
        `\n[backfill] ${signal} — closing Chrome so the profile lock is released; ` +
          `re-run the same command to resume`
      );
      await shutdown();
      process.exit(130);
    })();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  process.once("SIGHUP", onSignal);

  try {
    const all = await source.selectAllSites(page);
    if (!all) console.warn("[backfill] proceeding US-only (All sites not set)");

    const totalDays = Math.round(args.years * 365);

    for (const card of cards) {
      if (!args.force && !explicit && done.has(card.id)) {
        totals.doneSkip++;
        continue;
      }

      const seen = new Set<string>();
      let cardIngested = 0;

      for (let back = 0; back < totalDays; back += args.chunkDays) {
        const endDate = Date.now() - back * DAY_MS;
        const startDate = Date.now() - Math.min(back + args.chunkDays, totalDays) * DAY_MS;

        const sales = await source.fetchWindow(card, page, startDate, endDate);
        totals.scraped += sales.length;

        for (const sale of sales) {
          if (seen.has(sale.itemId)) continue;
          seen.add(sale.itemId);

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
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    process.off("SIGHUP", onSignal);
    await shutdown();
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
