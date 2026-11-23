import api, { apiClient } from './apiClient';
import { secureLog } from '@/security';

export interface GlobalSearchResult {
  type: 'RESIDENT' | 'MAINTENANCE' | 'EVENT' | 'NOTICE' | 'VISITOR';
  id: number;
  title: string;
  subtitle: string;
  url: string;
}

/**
 * True for the error axios raises when a request is cancelled via an
 * AbortSignal (`CanceledError` / `ERR_CANCELED`), or for a DOM `AbortError`.
 * Cancellation is an expected outcome, not a failure, so callers should
 * swallow only this and keep surfacing every other error.
 */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: string };
  return e.name === 'AbortError' || e.name === 'CanceledError' || e.code === 'ERR_CANCELED';
}

export async function globalSearch(
  query: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<GlobalSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await api.get<GlobalSearchResult[]>(
      `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal },
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    // A cancelled request is not a failure — don't log it as one.
    if (!isAbortError(err)) {
      secureLog.warn('[searchService] Global search failed', err);
    }
    throw err;
  }
}

export type SearchModule =
  | 'PERSON'
  | 'EVENT' | 'POOJA'
  | 'SPORTS_EVENT' | 'COACHING'
  | 'FOOD_RESTAURANT' | 'FOOD_MENU_ITEM' | 'GROCERY_PRODUCT' | 'HOME_CHEF'
  | 'HOME_SERVICE' | 'VENDOR'
  | 'MARKETPLACE_LISTING'
  | 'HEALTH_DOCTOR' | 'HEALTH_CLINIC'
  | 'COURSE' | 'WORKSHOP'
  | 'TRIP' | 'RIDE'
  | 'JOB' | 'PROFESSIONAL_SERVICE';

export interface SearchResultDto {
  id: string;
  module: SearchModule;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  deepLinkType: string;
  deepLinkId: string;
  rank: number;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResultDto[];
  facets: Record<string, number>;
  total: number;
  page: number;
  size: number;
}

export const searchService = {
  search: (params: {
    q: string;
    modules?: SearchModule[];
    page?: number;
    size?: number;
  }): Promise<SearchResponse> =>
    apiClient
      .get<SearchResponse>('/search', {
        params: {
          q: params.q,
          modules: params.modules?.join(','),
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      })
      .then((r) => r.data),
};
