import { connect } from "puppeteer-real-browser";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

/**
 * One-off HITL capture tool for the eBay Sales work (gather-gj4.2).
 *
 * Launches the same non-headless stealth browser the real Sale Sync uses,
 * navigates to an eBay completed-listings search URL, and pauses so you can
 * clear any Cloudflare / bot check and scroll/expand the results into the
 * state you want. When you press Enter it dumps the fully-rendered HTML and a
 * screenshot into the sources __fixtures__ dir, which the Listing Title Parser
 * and Sale Row Extractor tests read from.
 *
 * Usage:
 *   ts-node src/scripts/captureEbayHtml.ts "<ebay completed-listings URL>" [basename]
 *
 * Example:
 *   ts-node src/scripts/captureEbayHtml.ts \
 *     "https://www.ebay.com/sch/i.html?_nkw=charizard+psa+10&LH_Sold=1&LH_Complete=1" \
 *     ebay-sold-charizard
 */

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../application/sync/sources/__fixtures__"
);

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
  const url = process.argv[2];
  const basename = process.argv[3] ?? "ebay-completed-listings";

  if (!url) {
    console.error(
      'Usage: ts-node src/scripts/captureEbayHtml.ts "<ebay URL>" [basename]'
    );
    process.exit(1);
  }

  console.log("[capture] Launching stealth browser...");
  const { browser, page } = await connect({
    headless: false,
    disableXvfb: true,
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

  console.log(`[capture] Navigating to:\n  ${url}`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  console.log(
    "\n[capture] Page loaded. In the browser window:\n" +
      "  - clear any Cloudflare / 'verify you are human' check\n" +
      "  - scroll down / click any 'show more' so the results you want are present\n" +
      "  - leave it on the completed-listings results page\n"
  );
  await prompt("[capture] Press Enter to capture the rendered HTML... ");

  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const html = await page.content();
  const htmlPath = path.join(FIXTURES_DIR, `${basename}.html`);
  fs.writeFileSync(htmlPath, html, "utf-8");

  const shotPath = path.join(FIXTURES_DIR, `${basename}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });

  console.log(`\n[capture] Saved HTML:       ${htmlPath}`);
  console.log(`[capture] Saved screenshot: ${shotPath}`);
  console.log(`[capture] HTML size:        ${(html.length / 1024).toFixed(1)} KB`);

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("[capture] Failed:", err);
  process.exit(1);
});
