'use server';

import { getProduct as _getProduct } from '@/lib/apiClient';

export async function getProduct(productId: string) {
  return _getProduct(productId);
}
