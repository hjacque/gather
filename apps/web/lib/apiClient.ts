import type {
  GetCardsQuery,
  GetCardsResponse,
  GetCardResponse,
  SyncCardResponse,
  UpdateCardNoteRequest,
  UpsertCollectionEntryRequest,
} from '@gather/api-contract';

const BASE_URL = process.env.API_URL ?? 'http://localhost:3000';

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

export async function updateCardNote(cardId: string, note: string | null): Promise<void> {
  return apiPatch(`/cards/${cardId}`, { note } satisfies UpdateCardNoteRequest);
}

export async function syncAllPromos(): Promise<void> {
  await apiFetch('/sync');
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
