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
