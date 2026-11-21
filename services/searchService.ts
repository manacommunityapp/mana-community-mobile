import api from './apiClient';
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
