'use server';

import {
  syncProductCardMarket as _syncProductCardMarket,
  syncProductPsa as _syncProductPsa,
  syncAllPromos as _syncAllPromos,
} from '@/lib/apiClient';
import type { SyncProductResponse } from '@gather/api-contract';

export async function syncProductCardMarket(productId: string): Promise<SyncProductResponse> {
  return _syncProductCardMarket(productId);
}

export async function syncProductPsa(productId: string): Promise<SyncProductResponse> {
  return _syncProductPsa(productId);
}

export async function syncAllPromos(): Promise<void> {
  return _syncAllPromos();
}

export type { SyncProductResponse };
