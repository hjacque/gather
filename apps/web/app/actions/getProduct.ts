'use server';

import { getProduct as _getProduct } from '@/lib/apiClient';
import type { GetProductResponse } from '@gather/api-contract';

export async function getProduct(productId: string): Promise<GetProductResponse> {
  return _getProduct(productId);
}

export type { GetProductResponse };
