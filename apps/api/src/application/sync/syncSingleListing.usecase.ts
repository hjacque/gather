import { connect } from "puppeteer-real-browser";
import type { SyncListingResponse } from "@gather/api-contract";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { EbayItemPageSource } from "./sources/ebayItemPage.source";
import { parseItemPageState } from "./sources/listingItemPage";

export class SyncSingleListingUsecase {
  constructor(
    private readonly listingRepository: ListingRepositoryPort,
    private readonly itemPageSource: EbayItemPageSource
  ) {}

  async execute(listingId: string): Promise<SyncListingResponse> {
    const listing = await this.listingRepository.getListingById(listingId);
    if (!listing) throw new Error(`listing ${listingId} not found`);

    if (listing.platform !== "ebay") {
      return { listingId, removed: false, unchanged: true };
    }

    const { browser, page } = await this.openBrowser();
    try {
      const raw = await this.itemPageSource.fetchState(listing.itemId, page);
      const state = parseItemPageState(raw);

      if (state.status === "gone") {
        await this.listingRepository.deleteListing(listingId);
        return { listingId, removed: true };
      }
      if (state.status === "active") {
        await this.listingRepository.updateListingState(listingId, {
          price: state.priceEur,
          currency: "EUR",
          isBestOffer: state.isBestOffer,
          seenAt: new Date(),
        });
        return {
          listingId,
          removed: false,
          priceEur: state.priceEur,
          isBestOffer: state.isBestOffer,
        };
      }
      return { listingId, removed: false, unchanged: true };
    } finally {
      await page.close();
      await browser.close();
    }
  }

  private async openBrowser() {
    const { browser, page } = await connect({
      headless: false,
      disableXvfb: false,
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: { defaultViewport: null },
      ignoreAllFlags: false,
      plugins: [require("puppeteer-extra-plugin-stealth")()],
    });
    await page.setViewport({
      width: Math.floor(1024 + Math.random() * 100),
      height: Math.floor(768 + Math.random() * 100),
    });
    return { browser, page };
  }
}
