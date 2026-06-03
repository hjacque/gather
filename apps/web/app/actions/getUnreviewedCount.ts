'use server';

import { getUnreviewedCount as _getUnreviewedCount } from '@/lib/apiClient';

export async function getUnreviewedCount() {
  return _getUnreviewedCount();
}
