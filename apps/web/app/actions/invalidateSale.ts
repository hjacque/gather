'use server';

import { invalidateSale as _invalidateSale } from '@/lib/apiClient';

export async function invalidateSale(saleId: string) {
  return _invalidateSale(saleId);
}
