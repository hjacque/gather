'use server';

import {
  upsertCollectionEntry as _upsertCollectionEntry,
  deleteCollectionEntry as _deleteCollectionEntry,
} from '@/lib/apiClient';
import type { UpsertCollectionEntryRequest } from '@gather/api-contract';

export async function upsertCollectionEntry(
  cardId: string,
  entry: UpsertCollectionEntryRequest,
): Promise<void> {
  return _upsertCollectionEntry(cardId, entry);
}

export async function deleteCollectionEntry(cardId: string): Promise<void> {
  return _deleteCollectionEntry(cardId);
}
