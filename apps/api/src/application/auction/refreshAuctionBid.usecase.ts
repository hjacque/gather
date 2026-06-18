import { connect } from "puppeteer-real-browser";
import type { RefreshAuctionBidResponse } from "@gather/api-contract";
import { AuctionRepositoryPort } from "../../repository/ports/auction.repository.port";
import { EbayItemPageSource } from "../sync/sources/ebayItemPage.source";
import { parseAuctionItemPage } from "../sync/sources/auctionItemPage";

/**
 * Refresh one stored auction's current bid against its live eBay item page:
 * update its current bid (EUR) + bid count if they moved, or delete it if the
 * auction has ended. Opens its own short-lived browser session (the feed's
 * per-row refresh control). The auction sibling of SyncSingleListingUsecase.
 */
export class RefreshAuctionBidUsecase {
  constructor(
    private readonly auctionRepository: AuctionRepositoryPort,
    private readonly itemPageSource: EbayItemPageSource,
  ) {}

  async execute(auctionId: string): Promise<RefreshAuctionBidResponse> {
    const auction = await this.auctionRepository.getAuctionById(auctionId);
    if (!auction) throw new Error(`auction ${auctionId} not found`);

    const { browser, page } = await this.openBrowser();
    try {
      const raw = await this.itemPageSource.fetchState(auction.itemId, page);
      const state = parseAuctionItemPage(raw);

      if (state.status === "gone") {
        await this.auctionRepository.deleteAuction(auctionId);
        return { auctionId, removed: true };
      }
      if (state.status === "active") {
        const bidCheckedAt = new Date();
        const bidCount = state.bidCount ?? auction.bidCount;
        await this.auctionRepository.updateAuctionBid(auctionId, {
          currentBid: state.currentBidEur,
          currency: "EUR",
          bidCount,
          bidCheckedAt,
        });
        return {
          auctionId,
          removed: false,
          currentBidEur: state.currentBidEur,
          bidCount,
          bidCheckedAt,
        };
      }
      // Couldn't read the page (transient) — leave the stored bid as-is.
      return { auctionId, removed: false, unchanged: true };
    } finally {
      await page.close();
      await browser.close();
    }
  }

  private async openBrowser() {
    const { browser, page } = await connect({
      headless: true,
      disableXvfb: true,
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
