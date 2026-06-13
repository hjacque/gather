import { connect } from "puppeteer-real-browser";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

/**
 * One-off HITL login + capture tool for the Terapeak sales source.
 *
 * The real Sale Sync runs Chrome inside Xvfb (an invisible virtual display), so
 * there is no window to sign into. This script opens the SAME persistent Chrome
 * profile the sync uses (userDataDir) but on your real display, so you can:
 *
 *   1. sign into your eBay *seller* account by hand (cookie persists to the
 *      profile, so every later headless sync reuses it), and
 *   2. land on the Terapeak research results page and dump its HTML into
 *      __fixtures__/terapeak-research.html, which the readRows selectors are
 *      tuned against.
 *
 * Must run on a machine with a real display (DISPLAY set). The profile dir is
 * shared with SyncSalesUsecase.openBrowser — override both with EBAY_PROFILE_DIR.
 *
 * Usage:
 *   ts-node src/scripts/terapeakLogin.ts ["<terapeak research URL>"]
 */

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../application/sync/sources/__fixtures__"
);

// Default landing page: Sold research for a query we know returns best-offer
// rows. Pass your own URL as argv[2] to capture a different card.
const DEFAULT_URL =
  "https://www.ebay.com/sh/research?marketplace=EBAY-US&tabName=SOLD&dayRange=30&keywords=pokemon%20charizard%20psa%2010";

function prompt(question: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, () => {
      rl.close();
      resolve();
    })
  );
}

async function main() {
  const url = process.argv[2] ?? DEFAULT_URL;
  const userDataDir =
    process.env.EBAY_PROFILE_DIR ??
    `${process.env.HOME ?? "."}/.gather/ebay-profile`;
  fs.mkdirSync(userDataDir, { recursive: true });

  console.log(`[terapeak-login] Using persistent profile:\n  ${userDataDir}`);
  const { browser, page } = await connect({
    headless: false,
    disableXvfb: true, // real display, so you can actually see + use the window
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

  console.log(`[terapeak-login] Navigating to:\n  ${url}`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  console.log(
    "\n[terapeak-login] In the browser window:\n" +
      "  - sign into your eBay SELLER account (tick 'stay signed in')\n" +
      "  - clear any Cloudflare / 'verify you are human' check\n" +
      "  - make sure the Terapeak SOLD results table is showing rows\n"
  );
  await prompt("[terapeak-login] Press Enter to capture the rendered HTML... ");

  const html = await page.content();
  const htmlPath = path.join(FIXTURES_DIR, "terapeak-research.html");
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.writeFileSync(htmlPath, html, "utf-8");
  await page.screenshot({
    path: path.join(FIXTURES_DIR, "terapeak-research.png"),
    fullPage: true,
  });

  console.log(`\n[terapeak-login] Saved HTML:       ${htmlPath}`);
  console.log(`[terapeak-login] Final URL:        ${page.url()}`);
  console.log(`[terapeak-login] HTML size:        ${(html.length / 1024).toFixed(1)} KB`);
  console.log(
    "[terapeak-login] Login cookie is now persisted; the headless sync will reuse it."
  );

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("[terapeak-login] Failed:", err);
  process.exit(1);
});
