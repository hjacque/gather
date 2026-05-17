import type {
  GetProductsQuery,
  GetProductsResponse,
  GetProductResponse,
  GetProductOfTheDayQuery,
  GetProductOfTheDayResponse,
  SyncProductResponse,
  UpdateProductNoteRequest,
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

export async function getProductOfTheDay(
  query: GetProductOfTheDayQuery,
): Promise<GetProductOfTheDayResponse | undefined> {
  return apiFetch(`/product-of-the-day${toParams(query)}`);
}

export async function syncProduct(productId: string): Promise<SyncProductResponse> {
  return apiFetch(`/sync/product/${productId}`);
}

export async function updateProductNote(productId: string, note: string | null): Promise<void> {
  return apiPatch(`/products/${productId}`, { note } satisfies UpdateProductNoteRequest);
}
