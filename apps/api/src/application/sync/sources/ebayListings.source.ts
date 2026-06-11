import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import { activeListingsLinkFromEbayLink } from "./activeListingsLink";
import {
  RawListingRow,
  ListingCandidate,
  extractListingRow,
} from "./listingRowExtractor";

// Cap on active-listings pages walked per Card. The search is sorted cheapest
// first (`_sop=15`), so the asks that can move the per-grade min all land in
// the first pages; deeper pages only add ever-more-expensive noise.
const MAX_PAGES = 5;

/**
 * eBay active-listings scraping source — the buy-side sibling of the eBay
 * sales source. Walks the same curated per-Card search as `EbaySalesSource`,
 * but filtered to live Buy-It-Now items (see activeListingsLink.ts), and
 * reduces each result row to a `RawListingRow` for the pure Listing Row
 * Extractor. Cards with no `ebayLink` are skipped.
 *
 * Selectors are identical to the sales walk (rows are `li.s-card
 * [data-listingid]`); the differences are the missing "Sold <date>" caption,
 * the price being a live ask, and the site language being French (the EU
 * item-location filter only exists on ebay.fr — see activeListingsLink.ts).
 * eBay.fr rows carry no seller line, so seller trust/activity stay at their
 * null-input defaults there.
 */
export class EbayListingsSource {
  appliesTo(card: CardEntity): boolean {
    return !!card.ebayLink;
  }

  async fetch(card: CardEntity, page: Page): Promise<ListingCandidate[]> {
    const link = activeListingsLinkFromEbayLink(card.ebayLink);
    if (!link) return [];

    const candidates: ListingCandidate[] = [];
    const seen = new Set<string>();

    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = this.withPage(link, pageNum);
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      } catch (error) {
        console.log(`[EbayListings] navigation failed for ${card.name} p${pageNum}`, error);
        break;
      }

      await this.sleep(2500);
      await this.handleInterstitials(page);

      const rows = await this.readRows(page);
      if (rows.length === 0) break;

      let newOnPage = 0;
      for (const raw of rows) {
        const candidate = extractListingRow(raw);
        if (!candidate || seen.has(candidate.itemId)) continue;
        seen.add(candidate.itemId);
        candidates.push(candidate);
        newOnPage++;
      }
      if (newOnPage === 0) break;
    }

    console.log(`[EbayListings] ${card.name}: ${candidates.length} listing candidate(s)`);
    return candidates;
  }

  private withPage(link: string, pageNum: number): string {
    const url = new URL(link);
    url.searchParams.set("_pgn", String(pageNum));
    return url.toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Mirrors the sales source's defensive waits for eBay's "in line" /
  // rate-limit / Cloudflare turnstile screens.
  private async handleInterstitials(page: Page): Promise<void> {
    const body = await this.readBodyText(page);
    if (body.includes("Checking your browser") || body.includes("Verifying you are human")) {
      console.log("[EbayListings] Cloudflare check detected");
      await this.sleep(5500);
    }
    if (body.includes("Pardon Our Interruption") || body.includes("rate limited")) {
      console.log("[EbayListings] interruption / rate limit detected");
      await this.sleep(30000);
    }
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

  private async readRows(page: Page): Promise<RawListingRow[]> {
    return page.$$eval("li.s-card[data-listingid]", (rows) =>
      rows.map((row) => {
        const text = (sel: string) =>
          row.querySelector(sel)?.textContent?.trim() ?? "";

        // The seller line lives in its own attribute-row, e.g.
        // "dxbdxb 99.3% positive (460)". That class is reused for price / offer
        // rows too, so pick the one carrying the "% positive" feedback marker.
        const sellerInfoText =
          [...row.querySelectorAll(".s-card__attribute-row")]
            .map((r) => r.textContent?.trim() ?? "")
            .find((t) => /%\s*positive/i.test(t)) ?? null;

        return {
          listingId: row.getAttribute("data-listingid"),
          title: text(".s-card__title"),
          priceText: text(".s-card__price"),
          isBestOffer: /best offer|faire une offre|offre directe/i.test(
            row.textContent ?? ""
          ),
          sellerHref:
            row
              .querySelector(".s-card__seller-logo")
              ?.getAttribute("href") ?? null,
          sellerInfoText,
        };
      })
    );
  }
}
