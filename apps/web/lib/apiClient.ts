import type {
  GetProductsQuery,
  GetProductsResponse,
  GetProductResponse,
  SyncProductResponse,
  UpdateProductNoteRequest,
  UpsertCollectionEntryRequest,
} from '@gather/api-contract';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

export async function getProducts(
  filter: GetProductsQuery,
): Promise<GetProductsResponse> {
  return apiFetch(`/products${toParams(filter)}`);
}

export async function getProduct(productId: string): Promise<GetProductResponse> {
  return apiFetch(`/products/${productId}`);
}

export async function syncProductCardMarket(productId: string): Promise<SyncProductResponse> {
  return apiFetch(`/sync/product/${productId}/cardmarket`);
}

export async function syncProductPsa(productId: string): Promise<SyncProductResponse> {
  return apiFetch(`/sync/product/${productId}/psa`);
}

export async function updateProductNote(productId: string, note: string | null): Promise<void> {
  return apiPatch(`/products/${productId}`, { note } satisfies UpdateProductNoteRequest);
}

export async function syncAllPromos(): Promise<void> {
  await apiFetch('/sync?rarity=promo');
}

export async function upsertCollectionEntry(
  productId: string,
  entry: UpsertCollectionEntryRequest,
): Promise<void> {
  return apiPut(`/collection/${productId}`, entry satisfies UpsertCollectionEntryRequest);
}

export async function deleteCollectionEntry(productId: string): Promise<void> {
  return apiDelete(`/collection/${productId}`);
}
