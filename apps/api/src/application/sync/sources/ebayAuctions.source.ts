import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import { auctionsLinkFromEbayLink } from "./auctionsLink";
import {
  RawAuctionRow,
  AuctionCandidate,
  extractAuctionRow,
} from "./auctionRowExtractor";
import { AUCTION_SELLER_ALLOWLIST } from "./auctionSellers";

const MAX_PAGES = 5;

export class EbayAuctionsSource {
  appliesTo(card: CardEntity): boolean {
    return !!card.ebayLink;
  }

  async fetch(card: CardEntity, page: Page): Promise<AuctionCandidate[]> {
    const candidates: AuctionCandidate[] = [];
    const seen = new Set<string>();

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

        const bidText =
          attributeRows.find((t) =>
            /enchère|enchere|\bbids?\b/i.test(t),
          ) ?? null;

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
