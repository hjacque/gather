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
        })),
      }),
    ]);
  }

  async getCardsListings(
    cardIds: string[],
    since: Date
  ): Promise<Map<string, ListingEntity[]>> {
    const rows = await this.prisma.listing.findMany({
      where: { cardId: { in: cardIds }, seenAt: { gte: since } },
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
}
