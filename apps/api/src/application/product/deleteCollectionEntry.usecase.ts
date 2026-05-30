import type { CollectionRepositoryPort } from '../../repository/ports/collection.repository.port';

export class DeleteCollectionEntryUsecase {
  constructor(private readonly collectionRepository: CollectionRepositoryPort) {}

  async execute(productId: string): Promise<void> {
    await this.collectionRepository.delete(productId);
  }
}
