import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import {
  RawSaleRow,
  SaleCandidate,
  extractSaleRow,
  parseSellerFeedbackCount,
  parseSellerFeedbackPct,
} from "./saleRowExtractor";
import { parseSellerSlug, qualifiesAsTrusted } from "./trustedSeller";
import { ItemPageState } from "./reverificationClassifier";

// Seller-quality verdict for one listing, read from its eBay item page. The
// Terapeak-sourced Sale Sync uses this to auto-confirm / auto-invalidate sales
// whose price comes from Terapeak (which carries no seller info).
export type SellerQuality = {
  seller: string | null; // parsed store slug, e.g. "psa"; null for non-stores
  trustedSeller: boolean; // clears the reputation bar
  sellerHasActivity: boolean; // false only when feedback count is exactly 0
};

// Visible text that marks an item page as still showing a completed sale.
const SOLD_SIGNAL = /item sold on|already sold|this listing sold/i;
// Text eBay shows when a listing id no longer resolves to a real listing.
const NOT_FOUND_SIGNAL =
  /the listing you'?re looking for|no longer available|isn'?t available|page not found/i;

// Cap on completed-listings pages walked per Card.
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
 *
 * Seller trust + activity are derived by the pure Sale Row Extractor from each
 * row's own seller line ("dxbdxb 99.3% positive (460)") — the same feedback
 * count + positive rate for store and non-store sellers alike. We deliberately
 * do NOT visit the per-seller store page: its header dropped the feedback-count
 * field and renders late, so the row is the reliable source.
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
      if (newOnPage === 0) break;
    }

    // Trust + activity are already set per candidate by the extractor from each
    // row's seller line — no per-seller page visit needed.
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

  // Verify a seller's quality by visiting the listing's eBay item page and
  // reading its seller card — the eBay side of the Terapeak-sourced Sale Sync,
  // where prices come from Terapeak (no seller) but trust still gates auto-
  // confirm / auto-invalidate. Degrades safely: a navigation failure or an
  // unparseable seller card yields "not trusted, has activity", which routes the
  // sale to manual review rather than wrongly confirming or invalidating it.
  async fetchSellerQuality(itemId: string, page: Page): Promise<SellerQuality> {
    const safe: SellerQuality = {
      seller: null,
      trustedSeller: false,
      sellerHasActivity: true,
    };

    const url = `https://www.ebay.com/itm/${itemId}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    } catch (error) {
      console.log(`[EbaySales] seller-quality navigation failed for ${itemId}`, error);
      return safe;
    }

    await this.sleep(2500);
    await this.handleInterstitials(page);

    const { infoText, sellerHref } = await page.evaluate(() => {
      const t = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() ?? "";
      const infoText =
        t(".x-sellercard-atf__info") ||
        t(".x-sellercard-atf") ||
        t(".ux-seller-section");
      const sellerHref =
        document
          .querySelector(
            ".x-sellercard-atf__info a, .x-sellercard-atf a, .ux-seller-section a"
          )
          ?.getAttribute("href") ?? null;
      return { infoText, sellerHref };
    });

    const feedbackCount = parseSellerFeedbackCount(infoText);
    const feedbackPct = parseSellerFeedbackPct(infoText);
    return {
      seller: parseSellerSlug(sellerHref),
      trustedSeller: qualifiesAsTrusted(feedbackCount, feedbackPct),
      sellerHasActivity: feedbackCount !== 0,
    };
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

        // The seller line lives in its own attribute-row, e.g.
        // "dxbdxb 99.3% positive (460)". That class is reused for price / offer
        // rows too, so pick the one carrying the "% positive" feedback marker.
        const sellerInfoText =
          [...row.querySelectorAll(".s-card__attribute-row")]
            .map((r) => r.textContent?.trim() ?? "")
            .find((t) => /%\s*positive/i.test(t)) ?? null;

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
            sellerInfoText,
          },
        ];
      })
    );
  }
}
