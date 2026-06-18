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
    // Full per-card replacement is the staleness model, but user moderation must
    // outlive it: carry invalidatedAt and a manual grade fix forward by itemId so
    // a flagged/corrected auction the re-sync still sees keeps the moderation.
    const moderated = await this.prisma.auction.findMany({
      where: {
        cardId,
        platform,
        OR: [{ invalidatedAt: { not: null } }, { gradeEditedAt: { not: null } }],
      },
      select: {
        itemId: true,
        invalidatedAt: true,
        gradeEditedAt: true,
        psaGrade: true,
      },
    });
    const modByItem = new Map(moderated.map((m) => [m.itemId, m]));
    await this.prisma.$transaction([
      this.prisma.auction.deleteMany({ where: { cardId, platform } }),
      this.prisma.auction.createMany({
        data: auctions.map((a) => {
          const mod = modByItem.get(a.itemId);
          return {
            cardId: a.cardId,
            platform: a.platform,
            itemId: a.itemId,
            // A manual grade fix wins over the re-parsed scraped grade.
            psaGrade: mod?.gradeEditedAt ? mod.psaGrade : a.psaGrade,
            currentBid: a.currentBid,
            currency: a.currency,
            bidCount: a.bidCount,
            endTime: a.endTime,
            title: a.title,
            seller: a.seller,
            location: a.location,
            bidCheckedAt: a.bidCheckedAt,
            seenAt: a.seenAt,
            invalidatedAt: mod?.invalidatedAt ?? null,
            gradeEditedAt: mod?.gradeEditedAt ?? null,
          };
        }),
      }),
    ]);
  }

  async getOpenAuctions(now: Date): Promise<AuctionEntity[]> {
    const rows = await this.prisma.auction.findMany({
      where: { endTime: { gt: now }, invalidatedAt: null },
    });
    return rows.map((row) => this.auctionMapper.toEntity(row));
  }

  async getAuctionById(auctionId: string): Promise<AuctionEntity | null> {
    const row = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });
    return row ? this.auctionMapper.toEntity(row) : null;
  }

  async updateAuctionBid(
    auctionId: string,
    state: {
      currentBid: number;
      currency: string;
      bidCount: number;
      bidCheckedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        currentBid: state.currentBid,
        currency: state.currency,
        bidCount: state.bidCount,
        bidCheckedAt: state.bidCheckedAt,
      },
    });
  }

  async deleteAuction(auctionId: string): Promise<void> {
    await this.prisma.auction.delete({ where: { id: auctionId } });
  }

  async markAuctionInvalid(auctionId: string): Promise<void> {
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { invalidatedAt: new Date() },
    });
  }

  async updateAuctionGrade(auctionId: string, psaGrade: number): Promise<void> {
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { psaGrade, gradeEditedAt: new Date() },
    });
  }

  async pruneEndedAuctions(now: Date): Promise<number> {
    const { count } = await this.prisma.auction.deleteMany({
      where: { endTime: { lte: now } },
    });
    return count;
  }
}
