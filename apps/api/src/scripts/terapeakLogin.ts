import { connect } from "puppeteer-real-browser";
import * as fs from "fs";
import * as readline from "readline";

/**
 * Terapeak re-authentication helper.
 *
 * The Sale Sync runs Chrome inside Xvfb (an invisible virtual display) and only
 * reuses an existing eBay seller session — it never logs in. eBay's seller
 * session is short-lived, so when a sync logs "Terapeak session not
 * authenticated" you run this to refresh it: it opens the SAME persistent Chrome
 * profile the sync uses (userDataDir), but on your real display, so you can sign
 * in by hand. The cookie persists to the profile and the next sync reuses it.
 *
 * Must run on a machine with a real display (DISPLAY set). The profile dir is
 * shared with SyncSalesUsecase.openBrowser — override both with EBAY_PROFILE_DIR.
 *
 * Usage:
 *   cd apps/api && npx ts-node src/scripts/terapeakLogin.ts
 */

// Terapeak research home — landing here confirms the session is good (a logged-
// out profile bounces to sign-in instead).
const RESEARCH_URL = "https://www.ebay.com/sh/research";

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
  const userDataDir =
    process.env.EBAY_PROFILE_DIR ??
    `${process.env.HOME ?? "."}/.gather/ebay-profile`;
  fs.mkdirSync(userDataDir, { recursive: true });

  console.log(`[terapeak-login] Using persistent profile:\n  ${userDataDir}`);
  const { browser, page } = await connect({
    headless: false,
    disableXvfb: true, // real display, so you can see + use the window
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

  console.log(`[terapeak-login] Opening ${RESEARCH_URL}`);
  await page.goto(RESEARCH_URL, { waitUntil: "networkidle2", timeout: 60000 });

  console.log(
    "\n[terapeak-login] In the browser window:\n" +
      "  - sign into your eBay SELLER account (tick 'stay signed in')\n" +
      "  - clear any Cloudflare / 'verify you are human' check\n" +
      "  - make sure the Terapeak research page is showing (not sign-in)\n"
  );
  await prompt("[terapeak-login] Press Enter once you're signed in... ");

  // Verify the session took: a logged-out profile redirects to sign-in.
  await page.goto(RESEARCH_URL, { waitUntil: "networkidle2", timeout: 60000 });
  const url = page.url();
  const body = await page
    .evaluate(() => document.body.innerText)
    .catch(() => "");
  const loggedOut =
    /signin\.ebay\./i.test(url) ||
    /sign in to (?:your account|continue)|access denied/i.test(body);

  if (loggedOut) {
    console.error(
      "[terapeak-login] Still not authenticated — the session did not persist. " +
        "Re-run and complete sign-in (including any 2FA) before pressing Enter."
    );
  } else {
    console.log(
      "[terapeak-login] Authenticated — the cookie is persisted; the next sync will reuse it."
    );
  }

  await browser.close();
  process.exit(loggedOut ? 1 : 0);
}

main().catch((err) => {
  console.error("[terapeak-login] Failed:", err);
  process.exit(1);
});
