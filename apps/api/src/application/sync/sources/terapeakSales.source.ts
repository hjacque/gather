import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import { queryFromLink } from "./ebayQuery";
import {
  RawTerapeakRow,
  TerapeakSale,
  extractTerapeakRow,
} from "./terapeakRowExtractor";

// Terapeak's result table caps at this page size; we walk pages via the
// `offset` param up to a sane ceiling so one runaway query can't loop forever.
const PAGE_SIZE = 50;
const MAX_OFFSET = 500; // up to 10 pages / 500 rows per Card
const DAY_MS = 24 * 60 * 60 * 1000;

// The command to refresh an expired eBay seller session. Surfaced verbatim in
// the Sale Sync's auth-expiry logs so the operator can copy-paste the fix.
export const TERAPEAK_REAUTH_CMD =
  "cd apps/api && npx ts-node src/scripts/terapeakLogin.ts";

// Thrown when Terapeak bounces to sign-in: the seller session expired. The Sale
// Sync catches this to abort the authenticated ingest phase loudly rather than
// silently ingesting nothing for the rest of a long run.
export class TerapeakAuthError extends Error {
  constructor(message = "Terapeak session not authenticated") {
    super(message);
    this.name = "TerapeakAuthError";
  }
}

// Thrown when Terapeak keeps serving its "Pardon Our Interruption" rate-limit
// interstitial after the full back-off ladder — the IP/account is throttled hard
// enough that retrying in-process is futile. Callers that opt in (the historical
// backfill, via fetchWindow's throwOnRateLimit) abort the whole run loudly rather
// than let throttled pages read as empty and silently drop sales for a window.
export class TerapeakRateLimitError extends Error {
  constructor(where = "") {
    super(`Terapeak rate limited${where ? ` at ${where}` : ""}`);
    this.name = "TerapeakRateLimitError";
  }
}

// Back-off ladder for rate-limit interstitials: retry the same page after 60s,
// 120s, 240s, 480s, 960s before giving up on it.
const RL_MAX_RETRIES = 5;
const RL_BASE_MS = 60000;

/**
 * Terapeak sales source — drives Seller Hub → Research (Terapeak) for one Card's
 * curated query and returns its sold rows with eBay's authoritative transaction
 * price (the public completed-listings search and item pages hide the accepted
 * price of a Best-Offer sale). This is the *primary* Sale source: SyncSalesUsecase
 * ingests these rows directly, then verifies seller trust on the eBay item page
 * (Terapeak rows carry no seller). The eBay-search source runs alongside it only
 * to fill the fresh days Terapeak lags behind (ADR 0008); the two are independent
 * ingest paths into the same Sale table, not an overlay joined by item id — that
 * join was abandoned (~2% overlap, see ADR 0007).
 *
 * Auth: Terapeak is seller-only. This source assumes the shared browser session
 * is already logged in via a persistent Chrome profile (see openBrowser's
 * userDataDir). It never logs in itself, and never throws on a logged-out or
 * empty page — it degrades to an empty map so Sale Sync still completes, leaving
 * candidates at their scraped eBay price.
 *
 * Selectors verified against a captured Terapeak research page.
 */
export class TerapeakSalesSource {
  appliesTo(card: CardEntity): boolean {
    return !!card.ebayLink;
  }

  // Returns this Card's Terapeak sold rows as Sale candidates for the recurring
  // Sale Sync: a window just wider than the 30-day keep-window (see fetchWindow /
  // researchUrl). Reports every marketplace's sales (.fr/.de/.co.uk/…, normalized
  // to USD) when the caller has set the session's Listing Site to All up front
  // (see selectAllSites); US-only otherwise. Empty when the Card has no query, the
  // session is logged out, or no rows are found.
  async fetch(card: CardEntity, page: Page): Promise<TerapeakSale[]> {
    const DAYS = 45;
    const endDate = Date.now();
    const startDate = endDate - DAYS * DAY_MS;
    return this.fetchWindow(card, page, startDate, endDate);
  }

  // Paginated fetch of one Card's Terapeak sold rows for an explicit
  // [startDate, endDate] window (epoch ms), newest first, de-duplicated by item
  // id (the same listing can recur across pages). The recurring sync calls this
  // via fetch() with a 45-day window; the historical backfill calls it directly
  // with older, chunked windows. The Listing Site (US vs All sites) is session
  // state set out-of-band via selectAllSites — Terapeak honors it regardless of
  // the marketplace URL param, so it is not a parameter here.
  async fetchWindow(
    card: CardEntity,
    page: Page,
    startDate: number,
    endDate: number,
    opts: { throwOnRateLimit?: boolean } = {}
  ): Promise<TerapeakSale[]> {
    const query = queryFromLink(card.ebayLink);
    if (!query) return [];

    const byItem = new Map<string, TerapeakSale>();
    for (let offset = 0; offset < MAX_OFFSET; offset += PAGE_SIZE) {
      // Load the page, retrying through the back-off ladder while Terapeak serves
      // a rate-limit interstitial. We must distinguish a throttled page from a
      // genuinely empty one: a blocked page has no result rows, so without this
      // retry it would read as "no more results" and silently drop this window's
      // (and all older offsets') sales.
      let blocked = false;
      let navFailed = false;
      for (let attempt = 0; ; attempt++) {
        try {
          await page.goto(this.researchUrl(query, offset, startDate, endDate), {
            waitUntil: "networkidle2",
            timeout: 60000,
          });
        } catch (error) {
          console.log(`[Terapeak] navigation failed for ${card.name} @${offset}`, error);
          navFailed = true;
          break;
        }

        await this.sleep(2500);
        await this.handleCloudflare(page);

        if (await this.isLoggedOut(page)) {
          console.warn(`[Terapeak] not authenticated at ${card.name}`);
          throw new TerapeakAuthError();
        }

        if (await this.isRateLimited(page)) {
          if (attempt >= RL_MAX_RETRIES) {
            // Sustained throttle: opt-in callers abort the run; others give up
            // this page and return what they have (legacy-ish behavior).
            if (opts.throwOnRateLimit) throw new TerapeakRateLimitError(card.name);
            console.warn(`[Terapeak] rate limit persisted at ${card.name} @${offset} — giving up page`);
            blocked = true;
            break;
          }
          const backoff = RL_BASE_MS * 2 ** attempt;
          console.warn(
            `[Terapeak] rate limited at ${card.name} @${offset} — backing off ` +
              `${Math.round(backoff / 1000)}s (attempt ${attempt + 1}/${RL_MAX_RETRIES})`
          );
          await this.sleep(backoff);
          continue;
        }
        break; // page loaded clean
      }
      if (navFailed || blocked) break;

      const rows = await this.readRows(page);
      if (rows.length === 0) break;
      for (const raw of rows) {
        const sale = extractTerapeakRow(raw);
        if (sale && !byItem.has(sale.itemId)) byItem.set(sale.itemId, sale);
      }
      // Last page: a short page means there are no more results to fetch.
      if (rows.length < PAGE_SIZE) break;
    }
    const sales = [...byItem.values()];
    console.log(`[Terapeak] ${card.name}: ${sales.length} sale(s)`);
    return sales;
  }

  // Switch the research Listing Site filter from its default ("ebay.com") to
  // "All sites", so Terapeak reports every marketplace's sales (normalized to
  // USD) rather than US-only. This is UI state, not a URL param: a cold load with
  // marketplace=ALL is silently ignored. We drive the research form once — set
  // the Listing Site <select> to ALL the React-controlled way, then submit via
  // the Research button. The preference then sticks for the rest of the browser
  // session even though the widget's displayed value resets on later navigations
  // and the marketplace URL param stays EBAY-US. Call once per session before
  // fetching. Returns false (and stays US-only) if the control isn't found.
  async selectAllSites(page: Page): Promise<boolean> {
    const now = Date.now();
    await page.goto(this.researchUrl("pokemon", 0, now - 45 * DAY_MS, now), {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await this.sleep(3500);
    if (await this.isLoggedOut(page)) throw new TerapeakAuthError();

    const set = await page.evaluate(() => {
      const sel = [...document.querySelectorAll("select")].find((s) =>
        [...s.options].some((o) => o.value === "ALL")
      ) as HTMLSelectElement | undefined;
      if (!sel) return false;
      // React tracks the value via the prototype setter; assigning sel.value
      // directly is invisible to it, so use the native setter then fire the
      // events its onChange listens for.
      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value"
      )!.set!;
      setter.call(sel, "ALL");
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    });
    if (!set) {
      console.warn("[Terapeak] Listing Site selector not found — staying US-only");
      return false;
    }

    await this.sleep(1500);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => (b.textContent ?? "").trim() === "Research"
      ) as HTMLButtonElement | undefined;
      btn?.click();
    });
    await this.sleep(6000);
    console.log("[Terapeak] Listing Site set to All sites");
    return true;
  }

  // Terapeak Product Research, Sold tab, for one result page over an explicit
  // [startDate, endDate] window (epoch ms). The recurring sync keeps this window
  // just wider than the trailing 30-day keep-window (WINDOW_DAYS): since Terapeak
  // is the sales source we only keep in-window sales, so a tight range means
  // every returned row is in-window — no reliance on sort order, far fewer rows,
  // and the 500-row cap is effectively never hit. The historical backfill passes
  // older, chunked windows for the same reason (each chunk stays under the cap).
  // marketplace=EBAY-US is left as-is; the live Listing Site selection (see
  // selectAllSites) overrides it for the session. Param shape verified against a
  // live research URL (marketplace / keywords / dayRange / start+endDate epochs /
  // categoryId / offset / limit / tabName / tz).
  private researchUrl(
    query: string,
    offset: number,
    startDate: number,
    endDate: number
  ): string {
    const dayRange = Math.round((endDate - startDate) / DAY_MS);
    const url = new URL("https://www.ebay.com/sh/research");
    url.searchParams.set("marketplace", "EBAY-US");
    url.searchParams.set("keywords", query);
    url.searchParams.set("dayRange", String(dayRange));
    url.searchParams.set("startDate", String(startDate));
    url.searchParams.set("endDate", String(endDate));
    url.searchParams.set("categoryId", "0");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("tabName", "SOLD");
    url.searchParams.set("tz", "America/New_York");
    return url.toString();
  }

  // True when the page bounced to sign-in instead of rendering research — the
  // session cookie expired or the profile was never logged in.
  private async isLoggedOut(page: Page): Promise<boolean> {
    const url = page.url();
    if (/signin\.ebay\./i.test(url)) return true;
    const body = await this.readBodyText(page);
    return /sign in to (?:your account|continue)|access denied/i.test(body);
  }

  // Reduce each Terapeak results-table row to its raw fields. Selectors verified
  // against a captured Terapeak research page: data rows are
  // `tr.research-table-row`; the product-name span carries the eBay item id
  // (`data-item-id`) and the title; price is `.research-table-row__avgSoldPrice`;
  // the transaction count is `.research-table-row__totalSoldCount`; the last-sold
  // date is `.research-table-row__dateLastSold`.
  private async readRows(page: Page): Promise<RawTerapeakRow[]> {
    return page.$$eval("tr.research-table-row", (rows) =>
      rows.map((row) => {
        const text = (sel: string) =>
          row.querySelector(sel)?.textContent?.trim() ?? "";
        const nameEl = row.querySelector(
          ".research-table-row__product-info-name [data-item-id]"
        );
        return {
          itemId: nameEl?.getAttribute("data-item-id") ?? null,
          title: nameEl?.textContent?.trim() ?? "",
          priceText: text(".research-table-row__avgSoldPrice"),
          soldCountText: text(".research-table-row__totalSoldCount"),
          soldText: text(".research-table-row__dateLastSold"),
        };
      })
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async readBodyText(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => document.body.innerText);
    } catch {
      return "";
    }
  }

  // Soft wait for a Cloudflare "checking your browser" splash to clear before we
  // read the page.
  private async handleCloudflare(page: Page): Promise<void> {
    const body = await this.readBodyText(page);
    if (body.includes("Checking your browser") || body.includes("Verifying you are human")) {
      console.log("[Terapeak] Cloudflare check detected");
      await this.sleep(5500);
    }
  }

  // True when Terapeak served its rate-limit / "Pardon Our Interruption"
  // interstitial instead of results. The fetch loop backs off and retries the
  // same page on this rather than mistaking the empty interstitial for the end of
  // results (which would silently drop the window's sales).
  private async isRateLimited(page: Page): Promise<boolean> {
    const body = await this.readBodyText(page);
    return body.includes("Pardon Our Interruption") || body.includes("rate limited");
  }
}
