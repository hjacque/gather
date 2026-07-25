import { connect } from "puppeteer-real-browser";
import { psaProfileDir, isPsaSignInUrl } from "../application/sync/sources/psa.source";
import * as readline from "readline";

const POP_URL = "https://www.psacard.com/pop";

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
  const userDataDir = psaProfileDir();

  console.log(`[psa-login] Using persistent profile:\n  ${userDataDir}`);
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

  console.log(`[psa-login] Opening ${POP_URL}`);
  await page.goto(POP_URL, { waitUntil: "networkidle2", timeout: 60000 });

  console.log(
    "\n[psa-login] In the browser window:\n" +
      "  - sign into your PSA / collectors.com account (tick 'stay signed in')\n" +
      "  - clear any Cloudflare / 'verify you are human' check\n" +
      "  - make sure the pop report page is showing (not sign-in)\n"
  );
  await prompt("[psa-login] Press Enter once you're signed in... ");

  await page.goto(POP_URL, { waitUntil: "networkidle2", timeout: 60000 });
  const url = page.url();
  const body = await page
    .evaluate(() => document.body.innerText)
    .catch(() => "");
  const loggedOut =
    isPsaSignInUrl(url) ||
    /sign in to (?:your account|continue)|access denied/i.test(body);

  if (loggedOut) {
    console.error(
      "[psa-login] Still not authenticated — the session did not persist. " +
        "Re-run and complete sign-in (including any 2FA) before pressing Enter."
    );
  } else {
    console.log(
      "[psa-login] Authenticated — the cookie is persisted; the next sync will reuse it."
    );
  }

  await browser.close();
  process.exit(loggedOut ? 1 : 0);
}

main().catch((err) => {
  console.error("[psa-login] Failed:", err);
  process.exit(1);
});
