import { Platform } from "@gather/types";
import { PrismaClient } from "@prisma/client";
import { AuctionRepositoryPort } from "../ports/auction.repository.port";
import { AuctionEntity, NewAuction } from "../../entities/auction.entity";
import { AuctionMapper } from "./mappers/auction.mapper.pg";

export class AuctionRepositoryPg implements AuctionRepositoryPort {
  private auctionMapper: AuctionMapper;

  constructor(private readonly prisma: PrismaClient) {
    this.auctionMapper = new AuctionMapper();
  }

  async replaceCardAuctions(
    cardId: string,
    platform: Platform,
    auctions: NewAuction[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.auction.deleteMany({ where: { cardId, platform } }),
      this.prisma.auction.createMany({
        data: auctions.map((a) => ({
          cardId: a.cardId,
          platform: a.platform,
          itemId: a.itemId,
          psaGrade: a.psaGrade,
          currentBid: a.currentBid,
          currency: a.currency,
          bidCount: a.bidCount,
          endTime: a.endTime,
          title: a.title,
          seller: a.seller,
          location: a.location,
          bidCheckedAt: a.bidCheckedAt,
          seenAt: a.seenAt,
        })),
      }),
    ]);
  }

  async getOpenAuctions(now: Date): Promise<AuctionEntity[]> {
    const rows = await this.prisma.auction.findMany({
      where: { endTime: { gt: now } },
    });
    return rows.map((row) => this.auctionMapper.toEntity(row));
  }
}
