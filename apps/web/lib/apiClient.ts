import type {
  GetAuctionsResponse,
  RefreshAuctionBidResponse,
  GetCardsQuery,
  GetCardsResponse,
  GetCardResponse,
  GetOpportunitiesResponse,
  GetUnreviewedSalesResponse,
  GetUnreviewedCountResponse,
  ReviewSaleRequest,
  SyncCardListingsResponse,
  SyncCardResponse,
  SyncListingResponse,
  UpdateAuctionRequest,
  UpdateCardNoteRequest,
  UpdateListingStatusRequest,
  UpsertCollectionEntryRequest,
} from '@gather/api-contract';

const BASE_URL = process.env.API_URL ?? 'http://localhost:4200';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function apiPatch(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: PATCH ${path}`);
}

async function apiPut(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: PUT ${path}`);
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API ${res.status}: DELETE ${path}`);
}

function toParams(filter: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getCards(
  filter: GetCardsQuery,
): Promise<GetCardsResponse> {
  return apiFetch(`/cards${toParams(filter)}`);
}

export async function getCard(cardId: string): Promise<GetCardResponse> {
  return apiFetch(`/cards/${cardId}`);
}

export async function syncCardCardMarket(cardId: string): Promise<SyncCardResponse> {
  return apiFetch(`/sync/card/${cardId}/cardmarket`);
}

export async function syncCardPsa(cardId: string): Promise<SyncCardResponse> {
  return apiFetch(`/sync/card/${cardId}/psa`);
}

export type SyncSalesResponse = {
  cardId: string;
  scraped: number;
  withinWindow: number;
  upserted: number;
  skipped: number;
  autoValidated: number;
  reverified: number;
  confirmed: number;
  invalidated: number;
};

export async function syncCardSales(cardId: string): Promise<SyncSalesResponse> {
  return apiFetch(`/sync/sales/card/${cardId}`);
}

export async function updateCardNote(cardId: string, note: string | null): Promise<void> {
  return apiPatch(`/cards/${cardId}`, { note } satisfies UpdateCardNoteRequest);
}

export async function invalidateSale(saleId: string): Promise<void> {
  return apiPatch(`/sales/${saleId}`, {
    action: 'invalidate',
  } satisfies ReviewSaleRequest);
}

export async function invalidateListing(listingId: string): Promise<void> {
  return apiPatch(`/listings/${listingId}`, {
    action: 'invalidate',
  } satisfies UpdateListingStatusRequest);
}

export async function getUnreviewedSales(
  page: number,
  pageSize: number,
): Promise<GetUnreviewedSalesResponse> {
  return apiFetch(`/sales/unreviewed${toParams({ page, pageSize })}`);
}

export async function getUnreviewedCount(): Promise<GetUnreviewedCountResponse> {
  return apiFetch(`/sales/unreviewed/count`);
}

export async function approveSale(
  saleId: string,
  edits: { psaGrade?: number; price?: number } = {},
): Promise<void> {
  return apiPatch(`/sales/${saleId}`, {
    action: 'approve',
    ...edits,
  } satisfies ReviewSaleRequest);
}

export async function syncAllPromos(): Promise<void> {
  await apiFetch('/sync');
}

export async function syncAllListings(): Promise<void> {
  await apiFetch('/sync/listings');
}

export async function syncCardListings(cardId: string): Promise<SyncCardListingsResponse> {
  return apiFetch(`/sync/listings/card/${cardId}`);
}

export async function syncListing(listingId: string): Promise<SyncListingResponse> {
  return apiFetch(`/sync/listings/${listingId}`);
}

export async function syncAllSales(): Promise<void> {
  await apiFetch('/sync/sales');
}

export async function getOpportunities(): Promise<GetOpportunitiesResponse> {
  return apiFetch('/opportunities');
}

export type GetAuctionsParams = {
  grade?: number;
  sort?: 'ending' | 'bid' | 'bids';
};

export async function getAuctions(
  params: GetAuctionsParams = {},
): Promise<GetAuctionsResponse> {
  return apiFetch(`/auctions${toParams(params)}`);
}

export async function syncAllAuctions(): Promise<void> {
  await apiFetch('/sync/auctions');
}

export async function refreshAuctionBid(
  auctionId: string,
): Promise<RefreshAuctionBidResponse> {
  return apiFetch(`/auctions/${auctionId}/refresh-bid`);
}

export async function invalidateAuction(auctionId: string): Promise<void> {
  return apiPatch(`/auctions/${auctionId}`, {
    action: 'invalidate',
  } satisfies UpdateAuctionRequest);
}

export async function invalidateAuctionByItem(
  auctionId: string,
): Promise<void> {
  return apiPatch(`/auctions/${auctionId}`, {
    action: 'invalidateByItem',
  } satisfies UpdateAuctionRequest);
}

export async function editAuctionGrade(
  auctionId: string,
  psaGrade: number,
): Promise<void> {
  return apiPatch(`/auctions/${auctionId}`, {
    action: 'editGrade',
    psaGrade,
  } satisfies UpdateAuctionRequest);
}

export async function syncAllPop(): Promise<void> {
  await apiFetch('/sync/psa');
}

export async function upsertCollectionEntry(
  cardId: string,
  entry: UpsertCollectionEntryRequest,
): Promise<void> {
  return apiPut(`/collection/${cardId}`, entry satisfies UpsertCollectionEntryRequest);
}

export async function deleteCollectionEntry(cardId: string): Promise<void> {
  return apiDelete(`/collection/${cardId}`);
}
