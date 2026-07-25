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

export type SellerQuality = {
  seller: string | null;
  trustedSeller: boolean;
  sellerHasActivity: boolean;
};

const SOLD_SIGNAL = /item sold on|already sold|this listing sold/i;
const NOT_FOUND_SIGNAL =
  /the listing you'?re looking for|no longer available|isn'?t available|page not found/i;

const MAX_PAGES = 10;

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

    console.log(`[EbaySales] ${card.name}: ${candidates.length} sale candidate(s)`);
    return candidates;
  }

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
        const signal = row.querySelector(
          '[data-testid="ux-hotness-signal-text"]'
        )?.textContent?.trim();
        if (signal === "Ended") return [];

        const text = (sel: string) =>
          row.querySelector(sel)?.textContent?.trim() ?? "";

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
