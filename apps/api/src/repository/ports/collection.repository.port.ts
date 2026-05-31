export type CollectionEntryData = {
  isOwned: boolean;
  isWanted: boolean;
};

export abstract class CollectionRepositoryPort {
  abstract upsert(cardId: string, data: CollectionEntryData): Promise<void>;

  abstract delete(cardId: string): Promise<void>;

  abstract findByCardId(cardId: string): Promise<CollectionEntryData | null>;

  abstract findByCardIds(cardIds: string[]): Promise<Map<string, CollectionEntryData>>;
}
