import type { GetAuctionsResponse } from "@gather/api-contract";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { AuctionRepositoryPort } from "../../repository/ports/auction.repository.port";
import { getEurToUsdRate } from "../sync/helper";
import { convertToEur } from "../sale/eurConverter";

// Assembles the cross-card Live Auctions feed: every ongoing auction (endTime in
// the future), its current bid converted to EUR at read time, joined to its
// Card for display, sorted ending-soonest. Unconvertible currencies are dropped
// (like Sales and Listings). A plain feed — no scoring, no pricing impact.
export class GetAuctionsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly auctionRepository: AuctionRepositoryPort,
  ) {}

  async execute(): Promise<GetAuctionsResponse> {
    const now = new Date();
    const [auctions, cards, usdToEur] = await Promise.all([
      this.auctionRepository.getOpenAuctions(now),
      this.cardRepository.getCards(),
      getEurToUsdRate(),
    ]);

    const cardById = new Map(cards.map((c) => [c.id, c]));

    return auctions
      .flatMap((auction) => {
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
      })
      .sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
  }
}
