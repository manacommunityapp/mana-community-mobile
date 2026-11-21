import api from './apiClient';
import { secureLog } from '@/security';

export interface GlobalSearchResult {
  type: 'RESIDENT' | 'MAINTENANCE' | 'EVENT' | 'NOTICE' | 'VISITOR';
  id: number;
  title: string;
  subtitle: string;
  url: string;
}

export async function globalSearch(
  query: string,
  limit = 20,
): Promise<GlobalSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await api.get<GlobalSearchResult[]>(
      `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    secureLog.warn('[searchService] Global search failed', err);
    throw err;
  }
}
