'use server';

import { updateCardNote as _updateCardNote } from '@/lib/apiClient';

export async function updateCardNote(cardId: string, note: string | null): Promise<void> {
  return _updateCardNote(cardId, note);
}
