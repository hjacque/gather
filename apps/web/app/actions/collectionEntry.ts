'use server';

import {
  upsertCollectionEntry as _upsertCollectionEntry,
  deleteCollectionEntry as _deleteCollectionEntry,
} from '@/lib/apiClient';
import type { UpsertCollectionEntryRequest } from '@gather/api-contract';

export async function upsertCollectionEntry(
  productId: string,
  entry: UpsertCollectionEntryRequest,
): Promise<void> {
  return _upsertCollectionEntry(productId, entry);
}

export async function deleteCollectionEntry(productId: string): Promise<void> {
  return _deleteCollectionEntry(productId);
}
