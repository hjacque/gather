'use server';

import {
  invalidateAuction as _invalidateAuction,
  invalidateAuctionByItem as _invalidateAuctionByItem,
  editAuctionGrade as _editAuctionGrade,
} from '@/lib/apiClient';

export async function invalidateAuction(auctionId: string) {
  return _invalidateAuction(auctionId);
}

export async function invalidateAuctionByItem(auctionId: string) {
  return _invalidateAuctionByItem(auctionId);
}

export async function editAuctionGrade(auctionId: string, psaGrade: number) {
  return _editAuctionGrade(auctionId, psaGrade);
}
