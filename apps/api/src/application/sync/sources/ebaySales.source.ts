import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import { RawSaleRow, SaleCandidate, extractSaleRow } from "./saleRowExtractor";
import { ItemPageState } from "./reverificationClassifier";
import { SellerRepositoryPort } from "../../../repository/ports/seller.repository.port";

// Visible text that marks an item page as still showing a completed sale.
const SOLD_SIGNAL = /item sold on|already sold|this listing sold/i;
// Text eBay shows when a listing id no longer resolves to a real listing.
const NOT_FOUND_SIGNAL =
  /the listing you'?re looking for|no longer available|isn'?t available|page not found/i;

// Cap on completed-listings pages walked per Card.
const MAX_PAGES = 10;

// Thresholds for live trusted-seller qualification.
const MIN_FEEDBACK_SCORE = 5_000;
const MIN_POSITIVE_PCT = 99.5;

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
  // In-process cache so we don't hit the DB on every candidate within a single
  // sync run. The DB itself is the durable cache across restarts.
  private readonly sellerCache = new Map<string, boolean>();

  constructor(private readonly sellerRepository: SellerRepositoryPort) {}

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

    // Resolve trusted-seller status for each unique seller slug seen in this
    // batch. Uses the instance cache so each slug is only fetched once per
    // process lifetime across all cards.
    const uniqueSlugs = [...new Set(candidates.map((c) => c.seller).filter((s): s is string => s !== null))];
    for (const slug of uniqueSlugs) {
      if (!this.sellerCache.has(slug)) {
        const trusted = await this.checkSellerTrusted(slug, page);
        this.sellerCache.set(slug, trusted);
        console.log(`[EbaySales] seller ${slug}: trusted=${trusted}`);
      }
    }

    for (const candidate of candidates) {
      candidate.trustedSeller = candidate.seller !== null
        ? (this.sellerCache.get(candidate.seller) ?? false)
        : false;
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

  // Resolve whether a seller is trusted: DB cache first, eBay store page on
  // first encounter. Persists the result so subsequent syncs skip the scrape.
  private async checkSellerTrusted(slug: string, page: Page): Promise<boolean> {
    const dbRecord = await this.sellerRepository.findBySlug(slug);
    if (dbRecord) {
      console.log(`[EbaySales] seller ${slug}: trusted=${dbRecord.trusted} (cached)`);
      return dbRecord.trusted;
    }

    const trusted = await this.fetchSellerTrustedFromEbay(slug, page);
    await this.sellerRepository.upsert({ slug, trusted, checkedAt: new Date() });
    return trusted;
  }

  private async fetchSellerTrustedFromEbay(slug: string, page: Page): Promise<boolean> {
    const url = `https://www.ebay.com/str/${encodeURIComponent(slug)}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    } catch {
      console.log(`[EbaySales] seller store page navigation failed for ${slug}`);
      return false;
    }
    console.log(`[EbaySales] seller ${slug}: fetching store page stats`);
    await this.sleep(2500);
    await this.handleInterstitials(page);

    const stats = await page
      .evaluate(() => {
        const bodyText = document.body.innerText ?? "";

        // Feedback score — try selector first, then body-text patterns.
        // The store header renders "Name (586564)" where the parenthetical is
        // the raw score, or "Name (586,564)" with a thousands separator.
        let feedbackScore: number | null = null;
        const scoreEl =
          document.querySelector('[data-testid="str-feedback-score"]') ??
          document.querySelector(".str-seller-card__feedback-cnt") ??
          document.querySelector('[class*="feedback-score"]') ??
          document.querySelector('[aria-label*="Feedback score"]') ??
          null;
        if (scoreEl) {
          feedbackScore = parseEbayNumber(scoreEl.textContent?.trim() ?? "");
        }
        if (feedbackScore === null) {
          // "12,345 Feedback score" or "Feedback score: 12,345" or "12.3K Feedback score"
          const m =
            bodyText.match(/([\d.,]+[Kk]?)[\s\xa0]+[Ff]eedback[\s\xa0]+[Ss]core/) ??
            bodyText.match(/[Ff]eedback[\s\xa0]+[Ss]core[:\s\xa0]*([\d.,]+[Kk]?)/);
          if (m) feedbackScore = parseEbayNumber(m[1]);
        }
        if (feedbackScore === null) {
          // "(586564)" or "(586,564)" parenthetical in the store header
          const m = bodyText.match(/\((\d[\d,]*)\)/);
          if (m) feedbackScore = parseEbayNumber(m[1]);
        }

        // Positive feedback percentage
        // eBay uses a non-breaking space (\xa0) between the % and "positive".
        let positivePct: number | null = null;
        const pctEl =
          document.querySelector('[data-testid="str-positive-feedback"]') ??
          document.querySelector('[class*="positive-feedback"]') ??
          null;
        if (pctEl) {
          const m = pctEl.textContent?.match(/([\d.]+)[\s\xa0]*%/);
          if (m) positivePct = parseFloat(m[1]);
        }
        if (positivePct === null) {
          const m = bodyText.match(/([\d.]+)%[\s\xa0]+[Pp]ositive[\s\xa0]+[Ff]eedback/);
          if (m) positivePct = parseFloat(m[1]);
        }

        function parseEbayNumber(raw: string): number | null {
          const cleaned = raw.replace(/,/g, "").trim();
          if (/[Kk]$/.test(cleaned)) {
            const n = parseFloat(cleaned);
            return Number.isFinite(n) ? Math.round(n * 1000) : null;
          }
          const n = parseInt(cleaned, 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        }

        return { feedbackScore, positivePct };
      })
      .catch(() => ({ feedbackScore: null, positivePct: null }));

    const { feedbackScore, positivePct } = stats;
    if (feedbackScore === null || positivePct === null) {
      console.log(`[EbaySales] seller ${slug}: could not parse store page stats (score=${feedbackScore} pct=${positivePct})`);
      return false;
    }
    const trusted = feedbackScore >= MIN_FEEDBACK_SCORE && positivePct >= MIN_POSITIVE_PCT;
    console.log(`[EbaySales] seller ${slug}: score=${feedbackScore} pct=${positivePct}% trusted=${trusted}`);
    return trusted;
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
