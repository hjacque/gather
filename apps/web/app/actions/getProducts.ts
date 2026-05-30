'use server';

import { getProducts as _getProducts } from '@/lib/apiClient';
import type { GetProductsQuery } from '@gather/api-contract';

export async function getProducts(filter: GetProductsQuery) {
  return _getProducts(filter);
}
