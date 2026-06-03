'use server';

import { getUnreviewedSales as _getUnreviewedSales } from '@/lib/apiClient';

export async function getUnreviewedSales(page: number, pageSize: number) {
  return _getUnreviewedSales(page, pageSize);
}
