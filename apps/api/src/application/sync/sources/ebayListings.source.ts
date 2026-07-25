import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import {
  RawListingRow,
  ListingCandidate,
  extractListingRow,
} from "./listingRowExtractor";

const MAX_PAGES = 5;

export class EbayListingsSource {
  appliesTo(card: CardEntity): boolean {
    return !!card.ebayFrLink;
  }

  async fetch(card: CardEntity, page: Page): Promise<ListingCandidate[]> {
    const link = card.ebayFrLink;
    if (!link) return [];

    const candidates: ListingCandidate[] = [];
    const seen = new Set<string>();

    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = this.withPage(link, pageNum);
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      } catch (error) {
        console.log(
          `[EbayListings] navigation failed for ${card.name} p${pageNum}`,
          error,
        );
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

    console.log(
      `[EbayListings] ${card.name}: ${candidates.length} listing candidate(s)`,
    );
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

  private async handleInterstitials(page: Page): Promise<void> {
    const body = await this.readBodyText(page);
    if (
      body.includes("Checking your browser") ||
      body.includes("Verifying you are human")
    ) {
      console.log("[EbayListings] Cloudflare check detected");
      await this.sleep(5500);
    }
    if (
      body.includes("Pardon Our Interruption") ||
      body.includes("rate limited")
    ) {
      console.log("[EbayListings] interruption / rate limit detected");
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

  private async readRows(page: Page): Promise<RawListingRow[]> {
    return page.$$eval("li.s-card[data-listingid]", (rows) =>
      rows.map((row) => {
        const text = (sel: string) =>
          row.querySelector(sel)?.textContent?.trim() ?? "";

        const attributeRows = [
          ...row.querySelectorAll(".s-card__attribute-row"),
        ].map((r) => r.textContent?.trim() ?? "");
        const sellerInfoText =
          attributeRows.find((t) => /%\s*positive/i.test(t)) ?? null;

        const locationText =
          attributeRows.find((t) => /^de\s+\S/i.test(t)) ?? null;

        return {
          listingId: row.getAttribute("data-listingid"),
          title: text(".s-card__title"),
          priceText: text(".s-card__price"),
          isBestOffer: /best offer|faire une offre|offre directe/i.test(
            row.textContent ?? "",
          ),
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
