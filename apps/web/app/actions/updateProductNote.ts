'use server';

import { updateProductNote as _updateProductNote } from '@/lib/apiClient';

export async function updateProductNote(productId: string, note: string | null): Promise<void> {
  return _updateProductNote(productId, note);
}
