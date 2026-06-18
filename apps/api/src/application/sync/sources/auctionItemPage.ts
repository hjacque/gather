/**
 * Auction item-page reader (pure). The auction analogue of
 * `parseItemPageState`: reads one auction's eBay item page down to its live
 * state — current bid (in EUR, the same standardization the listings refresh
 * uses) and bid count — or detects that the auction has ended/vanished.
 *
 * Reuses `parseItemPageState` for the EUR-amount + ended detection (an auction's
 * current bid renders in the same `.x-price-primary` slot a fixed price does),
 * and `parseBidCount` over the page body for the "<n> enchères" / "<n> bids"
 * caption.
 */
import { RawItemPage, parseItemPageState } from "./listingItemPage";
import { parseBidCount } from "./auctionRowExtractor";

export type AuctionItemPageState =
  | { status: "gone" }
  | { status: "active"; currentBidEur: number; bidCount: number | null }
  | { status: "unknown" };

export function parseAuctionItemPage(raw: RawItemPage): AuctionItemPageState {
  const state = parseItemPageState(raw);
  if (state.status === "gone") return { status: "gone" };
  if (state.status === "active") {
    return {
      status: "active",
      currentBidEur: state.priceEur,
      bidCount: parseBidCount(raw.bodyText),
    };
  }
  return { status: "unknown" };
}
