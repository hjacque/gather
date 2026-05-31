'use server';

import { getCards as _getCards } from '@/lib/apiClient';
import type { GetCardsQuery } from '@gather/api-contract';

export async function getCards(filter: GetCardsQuery) {
  return _getCards(filter);
}
