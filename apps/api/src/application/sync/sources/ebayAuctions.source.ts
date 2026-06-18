import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import { auctionsLinkFromEbayLink } from "./auctionsLink";
import {
  RawAuctionRow,
  AuctionCandidate,
  extractAuctionRow,
} from "./auctionRowExtractor";
import { AUCTION_SELLER_ALLOWLIST } from "./auctionSellers";

// Cap on auction pages walked per Card. The search is sorted ending-soonest
// (`_sop=1`), so the auctions that matter for a "live" feed land on the first
// pages; deeper pages are auctions days away from closing.
const MAX_PAGES = 5;

/**
 * eBay ongoing-auctions scraping source — the auction sibling of
 * `EbayListingsSource`. Walks each Card's curated auction search (derived on the
 * fly from `ebayLink` by `auctionsLinkFromEbayLink`: ebay.fr, `LH_Auction=1`,
 * EU item-location filtered, ending-soonest), restricted to the allowlisted
 * sellers (`auctionSellers.ts`) via the search's `_ssn` filter — one search per
 * seller — and reduces each result row to a `RawAuctionRow` for the pure Auction
 * Row Extractor. The feed therefore only ingests known cards from known sellers.
 *
 * Selectors mirror the listings walk (rows are `li.s-card[data-listingid]`); the
 * auction-specific additions are the bid-count and "time left" captions, both
 * rendered as `.s-card__attribute-row` lines (French site). The row price is the
 * running bid, not a buyable ask. The seller is already pinned server-side by
 * `_ssn`, so the use case visits each item page only for the authoritative
 * EUR bid + live state (and the zero-feedback guard, inert for vetted sellers).
 */
export class EbayAuctionsSource {
  appliesTo(card: CardEntity): boolean {
    return !!card.ebayLink;
  }

  async fetch(card: CardEntity, page: Page): Promise<AuctionCandidate[]> {
    const candidates: AuctionCandidate[] = [];
    const seen = new Set<string>();

    // One search per allowlisted seller (eBay's `_ssn` filter takes a single
    // seller). Dedup across sellers by itemId, though a single auction can only
    // belong to one seller in practice.
    for (const seller of AUCTION_SELLER_ALLOWLIST) {
      const link = auctionsLinkFromEbayLink(card.ebayLink, seller);
      if (!link) continue;
      await this.walkSeller(card, seller, link, page, candidates, seen);
    }

    console.log(
      `[EbayAuctions] ${card.name}: ${candidates.length} auction candidate(s)`,
    );
    return candidates;
  }

  // Walk every page of one seller's auction search, appending new candidates.
  private async walkSeller(
    card: CardEntity,
    seller: string,
    link: string,
    page: Page,
    candidates: AuctionCandidate[],
    seen: Set<string>,
  ): Promise<void> {
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = this.withPage(link, pageNum);
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      } catch (error) {
        console.log(
          `[EbayAuctions] navigation failed for ${card.name} (${seller}) p${pageNum}`,
          error,
        );
        break;
      }

      await this.sleep(2500);
      await this.handleInterstitials(page);

      // Capture the scrape time per page so each row's endTime is computed
      // against when it was actually read.
      const now = new Date();
      const rows = await this.readRows(page);
      if (rows.length === 0) break;

      let newOnPage = 0;
      for (const raw of rows) {
        const candidate = extractAuctionRow(raw, now);
        if (!candidate || seen.has(candidate.itemId)) continue;
        seen.add(candidate.itemId);
        candidates.push(candidate);
        newOnPage++;
      }
      if (newOnPage === 0) break;
    }
  }

  private withPage(link: string, pageNum: number): string {
    const url = new URL(link);
    url.searchParams.set("_pgn", String(pageNum));
    return url.toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Mirrors the listings source's defensive waits for eBay's "in line" /
  // rate-limit / Cloudflare turnstile screens.
  private async handleInterstitials(page: Page): Promise<void> {
    const body = await this.readBodyText(page);
    if (
      body.includes("Checking your browser") ||
      body.includes("Verifying you are human")
    ) {
      console.log("[EbayAuctions] Cloudflare check detected");
      await this.sleep(5500);
    }
    if (
      body.includes("Pardon Our Interruption") ||
      body.includes("rate limited")
    ) {
      console.log("[EbayAuctions] interruption / rate limit detected");
      await this.sleep(30000);
    }
  }

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

  private async readRows(page: Page): Promise<RawAuctionRow[]> {
    return page.$$eval("li.s-card[data-listingid]", (rows) =>
      rows.map((row) => {
        const text = (sel: string) =>
          row.querySelector(sel)?.textContent?.trim() ?? "";

        const attributeRows = [
          ...row.querySelectorAll(".s-card__attribute-row"),
        ].map((r) => r.textContent?.trim() ?? "");

        // Bid count line: carries "enchère(s)" / "bid(s)" / "Aucune enchère".
        const bidText =
          attributeRows.find((t) =>
            /enchère|enchere|\bbids?\b/i.test(t),
          ) ?? null;

        // Time-left line: the relative countdown caption. Recognised by a
        // day/hour/minute/second token, optionally behind "Se termine"/"Ends".
        const timeLeftText =
          attributeRows.find((t) =>
            /se termine|ends|\d+\s*(?:j|d|h|min|m|s)\b/i.test(t),
          ) ?? null;

        const sellerInfoText =
          attributeRows.find((t) => /%\s*positive/i.test(t)) ?? null;

        const locationText =
          attributeRows.find((t) => /^de\s+\S/i.test(t)) ?? null;

        return {
          listingId: row.getAttribute("data-listingid"),
          title: text(".s-card__title"),
          priceText: text(".s-card__price"),
          bidText,
          timeLeftText,
          sellerHref:
            row.querySelector(".s-card__seller-logo")?.getAttribute("href") ??
            null,
          sellerInfoText,
          locationText,
        };
      }),
    );
  }
}
