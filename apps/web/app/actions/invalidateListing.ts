'use server';

import {
  invalidateListing as _invalidateListing,
  invalidateListingByItem as _invalidateListingByItem,
} from '@/lib/apiClient';

export async function invalidateListing(listingId: string) {
  return _invalidateListing(listingId);
}

export async function invalidateListingByItem(listingId: string) {
  return _invalidateListingByItem(listingId);
}
