import { Platform } from "@gather/types";
import { PrismaClient } from "@prisma/client";
import { ListingRepositoryPort } from "../ports/listing.repository.port";
import { ListingEntity, NewListing } from "../../entities/listing.entity";
import { ListingMapper } from "./mappers/listing.mapper.pg";

export class ListingRepositoryPg implements ListingRepositoryPort {
  private listingMapper: ListingMapper;

  constructor(private readonly prisma: PrismaClient) {
    this.listingMapper = new ListingMapper();
  }

  async replaceCardListings(
    cardId: string,
    platform: Platform,
    listings: NewListing[]
  ): Promise<void> {
    // Full per-card replacement is the staleness model, but a user's
    // invalidation must outlive it: carry invalidatedAt forward by itemId so a
    // listing the user flagged stays hidden after a refresh re-sees it.
    const invalidated = await this.prisma.listing.findMany({
      where: { cardId, platform, invalidatedAt: { not: null } },
      select: { itemId: true, invalidatedAt: true },
    });
    const invalidatedAtByItem = new Map(
      invalidated.map((r) => [r.itemId, r.invalidatedAt])
    );
    await this.prisma.$transaction([
      this.prisma.listing.deleteMany({ where: { cardId, platform } }),
      this.prisma.listing.createMany({
        data: listings.map((l) => ({
          cardId: l.cardId,
          platform: l.platform,
          itemId: l.itemId,
          psaGrade: l.psaGrade,
          price: l.price,
          currency: l.currency,
          title: l.title,
          isBestOffer: l.isBestOffer,
          seller: l.seller,
          seenAt: l.seenAt,
          invalidatedAt: invalidatedAtByItem.get(l.itemId) ?? null,
        })),
      }),
    ]);
  }

  async getCardsListings(
    cardIds: string[],
    since: Date
  ): Promise<Map<string, ListingEntity[]>> {
    const rows = await this.prisma.listing.findMany({
      where: { cardId: { in: cardIds }, seenAt: { gte: since }, invalidatedAt: null },
    });

    const result = new Map<string, ListingEntity[]>();
    for (const row of rows) {
      const entity = this.listingMapper.toEntity(row);
      const list = result.get(row.cardId);
      if (list) list.push(entity);
      else result.set(row.cardId, [entity]);
    }
    return result;
  }

  async markListingInvalid(listingId: string): Promise<void> {
    await this.prisma.listing.update({
      where: { id: listingId },
      data: { invalidatedAt: new Date() },
    });
  }
}
