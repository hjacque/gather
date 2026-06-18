'use server';

import { getAuctions as _getAuctions } from '@/lib/apiClient';

export async function getAuctions() {
  return _getAuctions();
}
