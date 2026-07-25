'use server';

import { getUnreviewedSales as _getUnreviewedSales } from '@/lib/apiClient';

export async function getUnreviewedSales(pageSize: number, after?: string) {
  return _getUnreviewedSales(pageSize, after);
}
