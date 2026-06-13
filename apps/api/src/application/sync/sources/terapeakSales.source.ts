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

/**
 * Terapeak sales source — drives Seller Hub → Research (Terapeak) for one Card's
 * curated query and returns `itemId → true sold price`. eBay hides the actual
 * accepted price of a sale on the public completed-listings search and item
 * pages; Terapeak reports eBay's authoritative transaction price. The
 * SyncSalesUsecase keeps EbaySalesSource as the candidate + seller/trust source
 * and overlays these prices onto its candidates, joining on the shared 12-digit
 * eBay item id.
 *
 * Auth: Terapeak is seller-only. This source assumes the shared browser session
 * is already logged in via a persistent Chrome profile (see openBrowser's
 * userDataDir). It never logs in itself, and never throws on a logged-out or
 * empty page — it degrades to an empty map so Sale Sync still completes, leaving
 * candidates at their scraped eBay price.
 *
 * Selectors verified against __fixtures__/terapeak-research.html.
 */
export class TerapeakSalesSource {
  appliesTo(card: CardEntity): boolean {
    return !!card.ebayLink;
  }

  // Returns this Card's Terapeak sold rows as Sale candidates, across all
  // paginated result pages, newest sales first. Empty when the Card has no
  // query, the session is logged out, or no rows are found. De-duplicates by
  // item id (the same listing can recur across pages).
  async fetch(card: CardEntity, page: Page): Promise<TerapeakSale[]> {
    const query = queryFromLink(card.ebayLink);
    if (!query) return [];

    const byItem = new Map<string, TerapeakSale>();
    for (let offset = 0; offset < MAX_OFFSET; offset += PAGE_SIZE) {
      try {
        await page.goto(this.researchUrl(query, offset), {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
      } catch (error) {
        console.log(`[Terapeak] navigation failed for ${card.name} @${offset}`, error);
        break;
      }

      await this.sleep(2500);
      await this.handleInterstitials(page);

      if (await this.isLoggedOut(page)) {
        console.warn(`[Terapeak] not authenticated at ${card.name}`);
        throw new TerapeakAuthError();
      }

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

  // Terapeak Product Research, Sold tab, for one result page. The date window is
  // kept just wider than the Sale Sync's trailing 30-day window (WINDOW_DAYS):
  // since Terapeak is the sales source we only keep sales inside that window, so
  // a tight range means every returned row is in-window — no reliance on result
  // sort order, far fewer rows, and the 500-row cap is effectively never hit.
  // The small buffer over 30 days absorbs date-last-sold / timezone edges.
  // Param shape verified against a live research URL (marketplace / keywords /
  // dayRange / start+endDate epochs / categoryId / offset / limit / tabName / tz).
  private researchUrl(query: string, offset: number): string {
    const DAYS = 45;
    const endDate = Date.now();
    const startDate = endDate - DAYS * 24 * 60 * 60 * 1000;
    const url = new URL("https://www.ebay.com/sh/research");
    url.searchParams.set("marketplace", "EBAY-US");
    url.searchParams.set("keywords", query);
    url.searchParams.set("dayRange", String(DAYS));
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
  // against __fixtures__/terapeak-research.html: data rows are
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

  // Mirrors the eBay search source's defensive waits for Cloudflare / rate-limit
  // interstitials.
  private async handleInterstitials(page: Page): Promise<void> {
    const body = await this.readBodyText(page);
    if (body.includes("Checking your browser") || body.includes("Verifying you are human")) {
      console.log("[Terapeak] Cloudflare check detected");
      await this.sleep(5500);
    }
    if (body.includes("Pardon Our Interruption") || body.includes("rate limited")) {
      console.log("[Terapeak] interruption / rate limit detected");
      await this.sleep(30000);
    }
  }
}
