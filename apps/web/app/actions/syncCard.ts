'use server';

import {
  syncCardCardMarket as _syncCardCardMarket,
  syncCardPsa as _syncCardPsa,
  syncCardSales as _syncCardSales,
  syncAllPromos as _syncAllPromos,
  syncAllListings as _syncAllListings,
  syncAllSales as _syncAllSales,
  syncAllPop as _syncAllPop,
} from '@/lib/apiClient';

export async function syncCardCardMarket(cardId: string) {
  return _syncCardCardMarket(cardId);
}

export async function syncCardPsa(cardId: string) {
  return _syncCardPsa(cardId);
}

export async function syncCardSales(cardId: string) {
  return _syncCardSales(cardId);
}

export async function syncAllPromos() {
  return _syncAllPromos();
}

export async function syncAllListings() {
  return _syncAllListings();
}

export async function syncAllSales() {
  return _syncAllSales();
}

export async function syncAllPop() {
  return _syncAllPop();
}
