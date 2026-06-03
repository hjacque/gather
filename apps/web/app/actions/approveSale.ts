'use server';

import { approveSale as _approveSale } from '@/lib/apiClient';

export async function approveSale(
  saleId: string,
  edits: { psaGrade?: number; price?: number } = {},
) {
  return _approveSale(saleId, edits);
}
