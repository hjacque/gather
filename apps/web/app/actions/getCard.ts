'use server';

import { getCard as _getCard } from '@/lib/apiClient';

export async function getCard(cardId: string) {
  return _getCard(cardId);
}
