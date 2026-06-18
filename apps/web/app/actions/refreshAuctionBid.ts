'use server';

import { refreshAuctionBid as _refreshAuctionBid } from '@/lib/apiClient';

export async function refreshAuctionBid(auctionId: string) {
  return _refreshAuctionBid(auctionId);
}
