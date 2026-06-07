'use server';

import { getOpportunities as _getOpportunities } from '@/lib/apiClient';

export async function getOpportunities() {
  return _getOpportunities();
}
