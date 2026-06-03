/**
 * One-off script: visit all pending eBay sales and mark as invalid those where
 * eBay shows the "Ended" signal (cancelled transaction).
 *
 * Usage:
 *   ts-node src/scripts/markEndedSalesInvalid.ts [--dry-run] [--skip=N] [itemId]
 *
 * --skip=N  skip the first N pending sales (resume after a partial run)
 * --dry-run prints what would be invalidated without writing to the DB.
 */

import { connect } from "puppeteer-real-browser";
import type { Page } from "rebrowser-puppeteer-core";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const ITEM_ID = process.argv.find((a) => /^\d+$/.test(a)) ?? null;
const SKIP = parseInt(process.argv.find((a) => a.startsWith("--skip="))?.split("=")[1] ?? "0", 10);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBodyText(page: Page): Promise<string> {
  try {
    return await page.evaluate(() => document.body.innerText);
  } catch {
    await sleep(2500);
    try {
      return await page.evaluate(() => document.body.innerText);
    } catch {
      return "";
    }
  }
}

async function isEnded(itemId: string, page: Page): Promise<boolean> {
  const url = `https://www.ebay.com/itm/${itemId}`;
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  } catch {
    console.log(`  [warn] navigation failed for ${itemId}`);
    return false;
  }

  await sleep(2500);

  const body = await readBodyText(page);
  if (body.includes("Checking your browser") || body.includes("Verifying you are human")) {
    await sleep(5500);
  }

  // Query the hotness-signal element directly; fall back to body text regex.
  // innerText misses the "Ended" signal because eBay applies CSS that hides
  // it from innerText traversal, so DOM querying is the reliable path.
  const signalText: string | null = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ux-hotness-signal-text"]');
    return el?.textContent?.trim() ?? null;
  }).catch(() => null);

  if (signalText !== null) return signalText === "Ended";
  return /\bEnded\b/.test(body);
}

async function main() {
  if (DRY_RUN) console.log("[mark-ended] DRY RUN — no DB writes");
  if (SKIP > 0) console.log(`[mark-ended] skipping first ${SKIP} sale(s)`);

  const sales = await prisma.sale.findMany({
    where: { platform: "ebay", status: "pending", ...(ITEM_ID ? { itemId: ITEM_ID } : {}) },
    select: { id: true, itemId: true, cardId: true },
    orderBy: { createdAt: "asc" },
    skip: SKIP,
  });

  console.log(`[mark-ended] ${sales.length} pending eBay sale(s) to check`);
  if (sales.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const { browser, page } = await connect({
    headless: false,
    disableXvfb: false,
    args: [],
    customConfig: {},
    turnstile: true,
    connectOption: { defaultViewport: null },
    ignoreAllFlags: false,
    plugins: [require("puppeteer-extra-plugin-stealth")()],
  });
  await page.setViewport({
    width: Math.floor(1024 + Math.random() * 100),
    height: Math.floor(768 + Math.random() * 100),
  });

  let invalidated = 0;
  let skipped = 0;

  for (const [i, sale] of sales.entries()) {
    console.log(`[mark-ended] (${i + 1}/${sales.length}) checking ${sale.itemId}…`);
    const ended = await isEnded(sale.itemId, page);
    if (ended) {
      console.log(`[mark-ended] → Ended — marking invalid`);
      if (!DRY_RUN) {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "invalid", verificationStage: "complete", reviewedAt: new Date() },
        });
      }
      invalidated++;
    } else {
      console.log(`[mark-ended] → ok`);
      skipped++;
    }
    await sleep(2000 + Math.random() * 2000);
  }

  await page.close();
  await browser.close();
  await prisma.$disconnect();

  console.log(
    `[mark-ended] done — invalidated: ${invalidated}, kept: ${skipped}${DRY_RUN ? " (dry run)" : ""}`
  );
}

main().catch((err) => {
  console.error("[mark-ended] failed:", err);
  process.exit(1);
});
