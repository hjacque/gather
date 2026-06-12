import { connect } from "puppeteer-real-browser";
import * as fs from "node:fs";

/**
 * One-off diagnostic: load a Card's `ebayFrLink` in the SAME browser stack the
 * Listings Sync uses, and dump what eBay actually serves that session —
 * the final URL after redirects, the result-count heading, the per-row item
 * location, and the item-location refinement options (to see what LH_PrefLoc
 * indices resolve to). Confirms whether LH_PrefLoc=3 is honored as "EU".
 *
 *   ts-node src/scripts/captureEbayEuSearch.ts "<ebayFrLink>" [outHtmlPath]
 */
async function main() {
  const url = process.argv[2];
  const outHtml = process.argv[3] ?? "/tmp/ebay-eu-capture.html";
  if (!url) {
    console.error("usage: captureEbayEuSearch.ts <url> [outHtmlPath]");
    process.exit(1);
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
  await page.setViewport({ width: 1024, height: 768 });

  try {
    console.log("[capture] requested:", url);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3000));

    const finalUrl = page.url();
    console.log("[capture] final URL:", finalUrl);

    const dump = await page.evaluate(() => {
      const txt = (el: Element | null) => el?.textContent?.trim() ?? "";

      const countHeading =
        txt(document.querySelector(".srp-controls__count-heading")) ||
        txt(document.querySelector("h1.srp-controls__count-heading")) ||
        txt(document.querySelector("[class*='count-heading']"));

      // Item-location refinement group: anchors/inputs whose href carries
      // LH_PrefLoc, with their visible label.
      const prefLocOptions = [...document.querySelectorAll("a[href*='LH_PrefLoc'], input")]
        .map((el) => {
          const href = el.getAttribute("href") ?? "";
          const m = href.match(/LH_PrefLoc=(\d+)/);
          const label =
            (el as HTMLElement).innerText?.trim() ||
            el.getAttribute("aria-label") ||
            (el.closest("li,label,div")?.textContent?.trim() ?? "");
          return m ? { prefLoc: m[1], label: label.slice(0, 60) } : null;
        })
        .filter(Boolean);

      // Any visible mention of the EU/worldwide location radio labels.
      const locationMentions = [
        "Union européenne",
        "Mondial",
        "France",
        "Europe continentale",
        "Pays limitrophes",
      ].filter((s) => document.body.innerText.includes(s));

      const rows = [...document.querySelectorAll("li.s-card[data-listingid]")];
      const rowDump = rows.slice(0, 8).map((row) => {
        const attrRows = [...row.querySelectorAll(".s-card__attribute-row")].map(
          (r) => r.textContent?.trim() ?? ""
        );
        return {
          title: txt(row.querySelector(".s-card__title")).slice(0, 70),
          price: txt(row.querySelector(".s-card__price")),
          // candidate location selectors across UI variants
          location:
            txt(row.querySelector(".s-card__location")) ||
            txt(row.querySelector("[class*='location']")) ||
            attrRows.find((t) => /provenance|située|located|de\b.*(japon|chine|états|usa)/i.test(t)) ||
            "",
          attrRows,
        };
      });

      return {
        countHeading,
        prefLocOptions,
        locationMentions,
        totalRows: rows.length,
        rowDump,
        bodyHasNoResults:
          /0 résultats|aucun résultat|ne correspond/i.test(document.body.innerText),
      };
    });

    const html = await page.content();
    fs.writeFileSync(outHtml, html);

    console.log("\n===== CAPTURE RESULT =====");
    console.log("count heading:", dump.countHeading);
    console.log("no-results banner:", dump.bodyHasNoResults);
    console.log("location labels present on page:", dump.locationMentions);
    console.log("LH_PrefLoc options offered:");
    for (const o of dump.prefLocOptions as { prefLoc: string; label: string }[]) {
      console.log(`   PrefLoc=${o.prefLoc}  ->  ${o.label}`);
    }
    console.log(`\nscrapeable rows (li.s-card[data-listingid]): ${dump.totalRows}`);
    console.log("first rows + detected location:");
    for (const r of dump.rowDump) {
      console.log(`  • [${r.location || "??"}] ${r.price}  ${r.title}`);
      console.log(`      attrRows: ${JSON.stringify(r.attrRows)}`);
    }
    console.log(`\nfull HTML written to ${outHtml}`);
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[capture] failed:", err);
  process.exit(1);
});
