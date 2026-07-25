import type { Page } from "rebrowser-puppeteer-core";
import { CardEntity } from "../../../entities/card.entity";
import { queryFromLink } from "./ebayQuery";
import {
  RawTerapeakRow,
  TerapeakSale,
  extractTerapeakRow,
} from "./terapeakRowExtractor";

const PAGE_SIZE = 50;
const MAX_OFFSET = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

export const TERAPEAK_REAUTH_CMD =
  "cd apps/api && npx ts-node src/scripts/terapeakLogin.ts";

export class TerapeakAuthError extends Error {
  constructor(message = "Terapeak session not authenticated") {
    super(message);
    this.name = "TerapeakAuthError";
  }
}

export class TerapeakRateLimitError extends Error {
  constructor(where = "") {
    super(`Terapeak rate limited${where ? ` at ${where}` : ""}`);
    this.name = "TerapeakRateLimitError";
  }
}

const RL_MAX_RETRIES = 5;
const RL_BASE_MS = 60000;

export class TerapeakSalesSource {
  appliesTo(card: CardEntity): boolean {
    return !!card.ebayLink;
  }

  async fetch(card: CardEntity, page: Page): Promise<TerapeakSale[]> {
    const DAYS = 45;
    const endDate = Date.now();
    const startDate = endDate - DAYS * DAY_MS;
    return this.fetchWindow(card, page, startDate, endDate);
  }

  async fetchWindow(
    card: CardEntity,
    page: Page,
    startDate: number,
    endDate: number,
    opts: { throwOnRateLimit?: boolean } = {}
  ): Promise<TerapeakSale[]> {
    const query = queryFromLink(card.ebayLink);
    if (!query) return [];

    const byItem = new Map<string, TerapeakSale>();
    for (let offset = 0; offset < MAX_OFFSET; offset += PAGE_SIZE) {
      let blocked = false;
      let navFailed = false;
      for (let attempt = 0; ; attempt++) {
        try {
          await page.goto(this.researchUrl(query, offset, startDate, endDate), {
            waitUntil: "networkidle2",
            timeout: 60000,
          });
        } catch (error) {
          console.log(`[Terapeak] navigation failed for ${card.name} @${offset}`, error);
          navFailed = true;
          break;
        }

        await this.sleep(2500);
        await this.handleCloudflare(page);

        if (await this.isLoggedOut(page)) {
          console.warn(`[Terapeak] not authenticated at ${card.name}`);
          throw new TerapeakAuthError();
        }

        if (await this.isRateLimited(page)) {
          if (attempt >= RL_MAX_RETRIES) {
            if (opts.throwOnRateLimit) throw new TerapeakRateLimitError(card.name);
            console.warn(`[Terapeak] rate limit persisted at ${card.name} @${offset} — giving up page`);
            blocked = true;
            break;
          }
          const backoff = RL_BASE_MS * 2 ** attempt;
          console.warn(
            `[Terapeak] rate limited at ${card.name} @${offset} — backing off ` +
              `${Math.round(backoff / 1000)}s (attempt ${attempt + 1}/${RL_MAX_RETRIES})`
          );
          await this.sleep(backoff);
          continue;
        }
        break;
      }
      if (navFailed || blocked) break;

      const rows = await this.readRows(page);
      if (rows.length === 0) break;
      for (const raw of rows) {
        const sale = extractTerapeakRow(raw);
        if (sale && !byItem.has(sale.itemId)) byItem.set(sale.itemId, sale);
      }
      if (rows.length < PAGE_SIZE) break;
    }
    const sales = [...byItem.values()];
    console.log(`[Terapeak] ${card.name}: ${sales.length} sale(s)`);
    return sales;
  }

  async selectAllSites(page: Page): Promise<boolean> {
    const now = Date.now();
    await page.goto(this.researchUrl("pokemon", 0, now - 45 * DAY_MS, now), {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await this.sleep(3500);
    if (await this.isLoggedOut(page)) throw new TerapeakAuthError();

    const set = await page.evaluate(() => {
      const sel = [...document.querySelectorAll("select")].find((s) =>
        [...s.options].some((o) => o.value === "ALL")
      ) as HTMLSelectElement | undefined;
      if (!sel) return false;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value"
      )!.set!;
      setter.call(sel, "ALL");
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    });
    if (!set) {
      console.warn("[Terapeak] Listing Site selector not found — staying US-only");
      return false;
    }

    await this.sleep(1500);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => (b.textContent ?? "").trim() === "Research"
      ) as HTMLButtonElement | undefined;
      btn?.click();
    });
    await this.sleep(6000);
    console.log("[Terapeak] Listing Site set to All sites");
    return true;
  }

  private researchUrl(
    query: string,
    offset: number,
    startDate: number,
    endDate: number
  ): string {
    const dayRange = Math.round((endDate - startDate) / DAY_MS);
    const url = new URL("https://www.ebay.com/sh/research");
    url.searchParams.set("marketplace", "EBAY-US");
    url.searchParams.set("keywords", query);
    url.searchParams.set("dayRange", String(dayRange));
    url.searchParams.set("startDate", String(startDate));
    url.searchParams.set("endDate", String(endDate));
    url.searchParams.set("categoryId", "0");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("tabName", "SOLD");
    url.searchParams.set("tz", "America/New_York");
    return url.toString();
  }

  private async isLoggedOut(page: Page): Promise<boolean> {
    const url = page.url();
    if (/signin\.ebay\./i.test(url)) return true;
    const body = await this.readBodyText(page);
    return /sign in to (?:your account|continue)|access denied/i.test(body);
  }

  private async readRows(page: Page): Promise<RawTerapeakRow[]> {
    return page.$$eval("tr.research-table-row", (rows) =>
      rows.map((row) => {
        const text = (sel: string) =>
          row.querySelector(sel)?.textContent?.trim() ?? "";
        const nameEl = row.querySelector(
          ".research-table-row__product-info-name [data-item-id]"
        );
        return {
          itemId: nameEl?.getAttribute("data-item-id") ?? null,
          title: nameEl?.textContent?.trim() ?? "",
          priceText: text(".research-table-row__avgSoldPrice"),
          soldCountText: text(".research-table-row__totalSoldCount"),
          soldText: text(".research-table-row__dateLastSold"),
        };
      })
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async readBodyText(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => document.body.innerText);
    } catch {
      return "";
    }
  }

  private async handleCloudflare(page: Page): Promise<void> {
    const body = await this.readBodyText(page);
    if (body.includes("Checking your browser") || body.includes("Verifying you are human")) {
      console.log("[Terapeak] Cloudflare check detected");
      await this.sleep(5500);
    }
  }

  private async isRateLimited(page: Page): Promise<boolean> {
    const body = await this.readBodyText(page);
    return body.includes("Pardon Our Interruption") || body.includes("rate limited");
  }
}
