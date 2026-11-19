import { useState, useEffect, useCallback, useRef } from 'react';
import { searchService, SearchResponse, SearchModule } from '@/services/searchService';

// Graceful AsyncStorage — in-memory fallback if package is absent
let _AsyncStorage: any = null;
try {
  _AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  // package not available — use in-memory only
}

const RECENT_KEY = '@mana/recent_searches';
const MAX_RECENT = 8;
const _inMemoryRecents: string[] = [];

async function getRecentSearches(): Promise<string[]> {
  if (!_AsyncStorage) return [..._inMemoryRecents];
  try {
    return JSON.parse((await _AsyncStorage.getItem(RECENT_KEY)) ?? '[]');
  } catch {
    return [];
  }
}

async function addRecentSearch(q: string): Promise<void> {
  const trimmed = q.trim();
  if (!trimmed) return;
  if (!_AsyncStorage) {
    const idx = _inMemoryRecents.indexOf(trimmed);
    if (idx !== -1) _inMemoryRecents.splice(idx, 1);
    _inMemoryRecents.unshift(trimmed);
    if (_inMemoryRecents.length > MAX_RECENT) _inMemoryRecents.length = MAX_RECENT;
    return;
  }
  try {
    const list = (await getRecentSearches()).filter((s) => s !== trimmed);
    await _AsyncStorage.setItem(RECENT_KEY, JSON.stringify([trimmed, ...list].slice(0, MAX_RECENT)));
  } catch {}
}

async function clearRecentSearches(): Promise<void> {
  _inMemoryRecents.length = 0;
  if (!_AsyncStorage) return;
  try {
    await _AsyncStorage.removeItem(RECENT_KEY);
  } catch {}
}

export function useSearch(initialModules?: SearchModule[]) {
  const [query, setQuery] = useState('');
  const [activeModules, setActiveModules] = useState<SearchModule[]>(initialModules ?? []);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
  }, []);

  const executeSearch = useCallback(
    async (q: string, modules: SearchModule[], p: number) => {
      if (!q.trim()) {
        setResponse(null);
        return;
      }
      setLoading(true);
      try {
        const res = await searchService.search({
          q,
          modules: modules.length ? modules : undefined,
          page: p,
          size: 20,
        });
        setResponse((prev) =>
          p > 0 && prev ? { ...res, results: [...prev.results, ...res.results] } : res,
        );
        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounced search on query/module change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResponse(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setPage(0);
      executeSearch(query, activeModules, 0);
      addRecentSearch(query).then(() => getRecentSearches().then(setRecentSearches));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeModules.join(',')]);

  const loadMore = useCallback(() => {
    if (!response || response.results.length >= response.total || loading) return;
    const next = page + 1;
    setPage(next);
    executeSearch(query, activeModules, next);
  }, [response, loading, page, query, activeModules, executeSearch]);

  const toggleModule = useCallback((m: SearchModule) => {
    setActiveModules((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }, []);

  const clearAllModules = useCallback(() => setActiveModules([]), []);

  const clearRecents = useCallback(async () => {
    await clearRecentSearches();
    setRecentSearches([]);
  }, []);

  return {
    query,
    setQuery,
    activeModules,
    toggleModule,
    clearAllModules,
    response,
    loading,
    error,
    loadMore,
    hasMore: response != null ? response.results.length < response.total : false,
    recentSearches,
    clearRecents,
  };
}
