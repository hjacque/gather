import type { Page } from "rebrowser-puppeteer-core";
import { RawItemPage } from "./listingItemPage";

export class EbayItemPageSource {
  async fetchState(itemId: string, page: Page): Promise<RawItemPage> {
    const url = `https://www.ebay.fr/itm/${itemId}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await this.sleep(2500);
    await this.handleInterstitials(page);

    return page.evaluate(() => {
      const t = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() ?? "";
      const sellerInfoText =
        t(".x-sellercard-atf__info") ||
        t(".x-sellercard-atf") ||
        t(".ux-seller-section");
      return {
        title: document.title,
        primaryText: t(".x-price-primary"),
        binText: t(".x-bin-price__content"),
        bodyText: (document.body.innerText || "").slice(0, 4000),
        sellerInfoText,
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
