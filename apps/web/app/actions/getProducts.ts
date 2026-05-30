'use server';

import { getProducts as _getProducts } from '@/lib/apiClient';
import type {
  GetProductsResponse,
  GetProductsResponseItem,
  GetProductsQuery,
} from '@gather/api-contract';

export async function getProducts(filter: GetProductsQuery): Promise<GetProductsResponse> {
  return _getProducts(filter);
}

export type { GetProductsResponse, GetProductsResponseItem, GetProductsQuery };
export type { GetProductsQuery as GetProductFilter };
