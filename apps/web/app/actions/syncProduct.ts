'use server';

import {
  syncProductCardMarket as _syncProductCardMarket,
  syncProductPsa as _syncProductPsa,
  syncAllPromos as _syncAllPromos,
} from '@/lib/apiClient';

export async function syncProductCardMarket(productId: string) {
  return _syncProductCardMarket(productId);
}

export async function syncProductPsa(productId: string) {
  return _syncProductPsa(productId);
}

export async function syncAllPromos() {
  return _syncAllPromos();
}
