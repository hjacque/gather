import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import { RawSaleRow, SaleCandidate, extractSaleRow } from "./saleRowExtractor";
import { ItemPageState } from "./reverificationClassifier";

// Visible text that marks an item page as still showing a completed sale.
const SOLD_SIGNAL = /item sold on|already sold|this listing sold/i;
// Text eBay shows when a listing id no longer resolves to a real listing.
const NOT_FOUND_SIGNAL =
  /the listing you'?re looking for|no longer available|isn'?t available|page not found/i;

// Cap on completed-listings pages walked per Card. A single card's trailing
// 30-day sold window is rarely more than a few pages; this bounds a runaway
// scrape if the date filtering below never trips.
const MAX_PAGES = 10;

/**
 * eBay scraping source (gather-gj4.2). A thin Puppeteer shell over the curated
 * `ebayLink` completed-listings search: it navigates, clears the same bot /
 * rate-limit interstitials the CardMarket source handles, paginates via the
 * `_pgn` query param, and reduces each result row to a `RawSaleRow` for the
 * pure Sale Row Extractor. Cards with no `ebayLink` are skipped.
 *
 * Selectors verified against a live capture (see __fixtures__/ebay-completed-
 * listings.html): rows are `li.s-card[data-listingid]`; `data-listingid` is the
 * 12-digit item id; ad rows carry a 16-digit id + "Shop on eBay" title and are
 * dropped by the extractor.
 */
export class EbaySalesSource {
  appliesTo(card: CardEntity): boolean {
    return !!card.ebayLink;
  }

  async fetch(card: CardEntity, page: Page): Promise<SaleCandidate[]> {
    if (!card.ebayLink) return [];

    const candidates: SaleCandidate[] = [];
    const seen = new Set<string>();

    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = this.withPage(card.ebayLink, pageNum);
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      } catch (error) {
        console.log(`[EbaySales] navigation failed for ${card.name} p${pageNum}`, error);
        break;
      }

      // Let any post-load client-side redirect settle before touching the page,
      // otherwise evaluate() races the navigation ("execution context destroyed").
      await this.sleep(2500);
      await this.handleInterstitials(page);

      const rows = await this.readRows(page);
      if (rows.length === 0) break;

      let newOnPage = 0;
      for (const raw of rows) {
        const candidate = extractSaleRow(raw);
        if (!candidate || seen.has(candidate.itemId)) continue;
        seen.add(candidate.itemId);
        candidates.push(candidate);
        newOnPage++;
      }
      // No fresh items on a full page means we've reached the end of results.
      if (newOnPage === 0) break;
    }

    console.log(`[EbaySales] ${card.name}: ${candidates.length} sale candidate(s)`);
    return candidates;
  }

  // Revisit a sold listing by item id and resolve its current page state for
  // the Re-verification Classifier. A non-resolving listing (bad status / "no
  // longer available") is "not-found"; a page still showing the sale is "sold";
  // anything else reachable (a live or relisted listing) is "active".
  async revisitItem(itemId: string, page: Page): Promise<ItemPageState> {
    const url = `https://www.ebay.com/itm/${itemId}`;
    let status: number | null = null;
    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
      status = response?.status() ?? null;
    } catch (error) {
      console.log(`[EbaySales] revisit navigation failed for ${itemId}`, error);
      return "not-found";
    }

    await this.sleep(2500);
    await this.handleInterstitials(page);

    const body = await this.readBodyText(page);
    if ((status !== null && status >= 400) || NOT_FOUND_SIGNAL.test(body)) {
      return "not-found";
    }
    if (SOLD_SIGNAL.test(body)) return "sold";
    return "active";
  }

  private withPage(ebayLink: string, pageNum: number): string {
    const url = new URL(ebayLink);
    url.searchParams.set("_pgn", String(pageNum));
    return url.toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Reads the page body text, tolerating a mid-navigation context teardown by
  // settling and retrying once.
  private async readBodyText(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => document.body.innerText);
    } catch {
      await this.sleep(2500);
      try {
        return await page.evaluate(() => document.body.innerText);
      } catch {
        return "";
      }
    }
  }

  // Mirrors the CardMarket source's defensive waits for eBay's "in line" /
  // rate-limit / Cloudflare turnstile screens.
  private async handleInterstitials(page: Page): Promise<void> {
    const body = await this.readBodyText(page);
    if (body.includes("Checking your browser") || body.includes("Verifying you are human")) {
      console.log("[EbaySales] Cloudflare check detected");
      await this.sleep(5500);
    }
    if (body.includes("Pardon Our Interruption") || body.includes("rate limited")) {
      console.log("[EbaySales] interruption / rate limit detected");
      await this.sleep(30000);
    }
  }

  private async readRows(page: Page): Promise<RawSaleRow[]> {
    return page.$$eval("li.s-card[data-listingid]", (rows) =>
      rows.flatMap((row) => {
        // Skip rows where eBay signals the transaction was cancelled ("Ended").
        const signal = row.querySelector(
          '[data-testid="ux-hotness-signal-text"]'
        )?.textContent?.trim();
        if (signal === "Ended") return [];

        const text = (sel: string) =>
          row.querySelector(sel)?.textContent?.trim() ?? "";
        return [
          {
            listingId: row.getAttribute("data-listingid"),
            title: text(".s-card__title"),
            priceText: text(".s-card__price"),
            soldText: text(".s-card__caption"),
            isBestOffer: /best offer/i.test(row.textContent ?? ""),
            sellerHref:
              row
                .querySelector(".s-card__seller-logo")
                ?.getAttribute("href") ?? null,
          },
        ];
      })
    );
  }
}
