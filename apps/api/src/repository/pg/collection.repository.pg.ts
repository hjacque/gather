import { PrismaClient } from '@prisma/client';
import type {
  CollectionEntryData,
  CollectionRepositoryPort,
} from '../ports/collection.repository.port';

export class CollectionRepositoryPg implements CollectionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(cardId: string, data: CollectionEntryData): Promise<void> {
    await this.prisma.collectionEntry.upsert({
      where: { cardId },
      create: {
        cardId,
        isOwned: data.isOwned,
        isWanted: data.isWanted,
      },
      update: {
        isOwned: data.isOwned,
        isWanted: data.isWanted,
      },
    });
  }

  async delete(cardId: string): Promise<void> {
    await this.prisma.collectionEntry.deleteMany({ where: { cardId } });
  }

  async findByCardId(cardId: string): Promise<CollectionEntryData | null> {
    const record = await this.prisma.collectionEntry.findUnique({ where: { cardId } });
    if (!record) return null;
    return {
      isOwned: record.isOwned,
      isWanted: record.isWanted,
    };
  }

  async findByCardIds(cardIds: string[]): Promise<Map<string, CollectionEntryData>> {
    const records = await this.prisma.collectionEntry.findMany({
      where: { cardId: { in: cardIds } },
    });
    const map = new Map<string, CollectionEntryData>();
    for (const record of records) {
      map.set(record.cardId, {
        isOwned: record.isOwned,
        isWanted: record.isWanted,
      });
    }
    return map;
  }
}
