import type { Page } from "rebrowser-puppeteer-core";
import { RawItemPage } from "./listingItemPage";

/**
 * Reads one eBay item page (ebay.fr/itm/<id>) down to the raw fields the pure
 * item-page parser needs. The single-listing counterpart of the search-walking
 * EbayListingsSource: used to re-verify a stored ask's current price / whether
 * it still exists, on demand.
 */
export class EbayItemPageSource {
  async fetchState(itemId: string, page: Page): Promise<RawItemPage> {
    const url = `https://www.ebay.fr/itm/${itemId}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await this.sleep(2500);
    await this.handleInterstitials(page);

    return page.evaluate(() => {
      const t = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() ?? "";
      return {
        title: document.title,
        primaryText: t(".x-price-primary"),
        binText: t(".x-bin-price__content"),
        bodyText: (document.body.innerText || "").slice(0, 4000),
      };
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async handleInterstitials(page: Page): Promise<void> {
    let body = "";
    try {
      body = await page.evaluate(() => document.body.innerText);
    } catch {
      return;
    }
    if (body.includes("Checking your browser") || body.includes("Verifying you are human")) {
      await this.sleep(5500);
    }
    if (body.includes("Pardon Our Interruption") || body.includes("rate limited")) {
      await this.sleep(30000);
    }
  }
}
