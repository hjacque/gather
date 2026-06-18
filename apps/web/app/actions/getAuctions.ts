'use server';

import {
  getAuctions as _getAuctions,
  type GetAuctionsParams,
} from '@/lib/apiClient';

export async function getAuctions(params: GetAuctionsParams = {}) {
  return _getAuctions(params);
}
