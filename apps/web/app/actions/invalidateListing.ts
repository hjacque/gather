'use server';

import { invalidateListing as _invalidateListing } from '@/lib/apiClient';

export async function invalidateListing(listingId: string) {
  return _invalidateListing(listingId);
}
