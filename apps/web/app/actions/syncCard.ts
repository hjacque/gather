'use server';

import {
  syncCardCardMarket as _syncCardCardMarket,
  syncCardPsa as _syncCardPsa,
  syncAllPromos as _syncAllPromos,
} from '@/lib/apiClient';

export async function syncCardCardMarket(cardId: string) {
  return _syncCardCardMarket(cardId);
}

export async function syncCardPsa(cardId: string) {
  return _syncCardPsa(cardId);
}

export async function syncAllPromos() {
  return _syncAllPromos();
}
