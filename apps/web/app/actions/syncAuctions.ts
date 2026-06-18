'use server';

import { syncAllAuctions as _syncAllAuctions } from '@/lib/apiClient';

export async function syncAllAuctions() {
  return _syncAllAuctions();
}
