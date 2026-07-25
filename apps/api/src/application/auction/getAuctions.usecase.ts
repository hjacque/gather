import type { GetAuctionsResponse } from "@gather/api-contract";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { AuctionRepositoryPort } from "../../repository/ports/auction.repository.port";
import { getEurToUsdRate } from "../sync/helper";
import { convertToEur } from "../sale/eurConverter";
import { toEnglishCountry } from "../sync/sources/euLocation";

export type AuctionSort = "ending" | "bid" | "bids";

export type GetAuctionsParams = {
  grade?: number;
  sort?: AuctionSort;
};

export class GetAuctionsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly auctionRepository: AuctionRepositoryPort,
  ) {}

  async execute(params: GetAuctionsParams = {}): Promise<GetAuctionsResponse> {
    const { grade, sort = "ending" } = params;
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
            itemId: auction.itemId,
            cardId: auction.cardId,
            cardName: card.name,
            cardSetName: card.cardSet.name,
            imageUrl: card.imageUrl,
            psaGrade: auction.psaGrade,
            currentBidEur,
            bidCount: auction.bidCount,
            endTime: auction.endTime,
            bidCheckedAt: auction.bidCheckedAt,
            location: toEnglishCountry(auction.location),
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
