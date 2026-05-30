import { PrismaClient } from '@prisma/client';
import type {
  CollectionEntryData,
  CollectionRepositoryPort,
} from '../ports/collection.repository.port';

export class CollectionRepositoryPg implements CollectionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(productId: string, data: CollectionEntryData): Promise<void> {
    await this.prisma.collectionEntry.upsert({
      where: { productId },
      create: {
        productId,
        isOwned: data.isOwned,
        isWanted: data.isWanted,
        grade: data.grade,
        paidPrice: data.paidPrice,
        acquiredAt: data.acquiredAt,
      },
      update: {
        isOwned: data.isOwned,
        isWanted: data.isWanted,
        grade: data.grade,
        paidPrice: data.paidPrice,
        acquiredAt: data.acquiredAt,
      },
    });
  }

  async delete(productId: string): Promise<void> {
    await this.prisma.collectionEntry.deleteMany({ where: { productId } });
  }

  async findByProductId(productId: string): Promise<CollectionEntryData | null> {
    const record = await this.prisma.collectionEntry.findUnique({ where: { productId } });
    if (!record) return null;
    return {
      isOwned: record.isOwned,
      isWanted: record.isWanted,
      grade: record.grade,
      paidPrice: record.paidPrice,
      acquiredAt: record.acquiredAt,
    };
  }

  async findByProductIds(productIds: string[]): Promise<Map<string, CollectionEntryData>> {
    const records = await this.prisma.collectionEntry.findMany({
      where: { productId: { in: productIds } },
    });
    const map = new Map<string, CollectionEntryData>();
    for (const record of records) {
      map.set(record.productId, {
        isOwned: record.isOwned,
        isWanted: record.isWanted,
        grade: record.grade,
        paidPrice: record.paidPrice,
        acquiredAt: record.acquiredAt,
      });
    }
    return map;
  }
}
