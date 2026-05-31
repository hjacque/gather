import type { CollectionRepositoryPort, CollectionEntryData } from '../../repository/ports/collection.repository.port';

export class UpsertCollectionEntryUsecase {
  constructor(private readonly collectionRepository: CollectionRepositoryPort) {}

  async execute(cardId: string, data: CollectionEntryData): Promise<void> {
    await this.collectionRepository.upsert(cardId, data);
  }
}
