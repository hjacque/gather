import type { GetAuctionsResponse } from "@gather/api-contract";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { AuctionRepositoryPort } from "../../repository/ports/auction.repository.port";
import { getEurToUsdRate } from "../sync/helper";
import { convertToEur } from "../sale/eurConverter";

// Feed sort orders. Default is ending-soonest; the others let the user scan by
// price or traction. "ending" never inverts — it is the live feed's spine.
export type AuctionSort = "ending" | "bid" | "bids";

export type GetAuctionsParams = {
  // Restrict to a single PSA grade (1–10), or all grades when absent.
  grade?: number;
  sort?: AuctionSort;
  // Hide auctions below this bid count (e.g. 1 hides zero-bid auctions).
  minBids?: number;
};

// Assembles the cross-card Live Auctions feed: every ongoing auction (endTime in
// the future), its current bid converted to EUR at read time, joined to its
// Card for display. Supports a PSA-grade filter, a min-bids filter, and a sort
// (default ending-soonest). Unconvertible currencies are dropped (like Sales and
// Listings). A plain feed — no scoring, no pricing impact.
export class GetAuctionsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly auctionRepository: AuctionRepositoryPort,
  ) {}

  async execute(params: GetAuctionsParams = {}): Promise<GetAuctionsResponse> {
    const { grade, sort = "ending", minBids } = params;
    const now = new Date();
    const [auctions, cards, usdToEur] = await Promise.all([
      this.auctionRepository.getOpenAuctions(now),
      this.cardRepository.getCards(),
      getEurToUsdRate(),
    ]);

    const cardById = new Map(cards.map((c) => [c.id, c]));

    const records = auctions
      .flatMap((auction) => {
        if (grade !== undefined && auction.psaGrade !== grade) return [];
        if (minBids !== undefined && auction.bidCount < minBids) return [];
        const card = cardById.get(auction.cardId);
        if (!card) return [];
        const currentBidEur = convertToEur(
          auction.currentBid,
          auction.currency,
          usdToEur,
        );
        if (currentBidEur === null) return [];
        return [
          {
            id: auction.id,
            cardId: auction.cardId,
            cardName: card.name,
            cardSetName: card.cardSet.name,
            imageUrl: card.imageUrl,
            psaGrade: auction.psaGrade,
            currentBidEur,
            bidCount: auction.bidCount,
            endTime: auction.endTime,
            bidCheckedAt: auction.bidCheckedAt,
            location: auction.location,
            url: `https://www.ebay.fr/itm/${auction.itemId}`,
          },
        ];
      });

    const comparator =
      sort === "bid"
        ? (a: (typeof records)[number], b: (typeof records)[number]) =>
            b.currentBidEur - a.currentBidEur
        : sort === "bids"
          ? (a: (typeof records)[number], b: (typeof records)[number]) =>
              b.bidCount - a.bidCount
          : (a: (typeof records)[number], b: (typeof records)[number]) =>
              a.endTime.getTime() - b.endTime.getTime();

    return records.sort(comparator);
  }
}
