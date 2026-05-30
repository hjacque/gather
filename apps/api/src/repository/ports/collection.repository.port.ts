export type CollectionEntryData = {
  isOwned: boolean;
  isWanted: boolean;
  grade: number | null;
  paidPrice: number | null;
  acquiredAt: Date | null;
};

export abstract class CollectionRepositoryPort {
  abstract upsert(productId: string, data: CollectionEntryData): Promise<void>;

  abstract delete(productId: string): Promise<void>;

  abstract findByProductId(productId: string): Promise<CollectionEntryData | null>;

  abstract findByProductIds(productIds: string[]): Promise<Map<string, CollectionEntryData>>;
}
