import { THEME } from '@/constants/theme';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { globalSearch, isAbortError, GlobalSearchResult } from '@/services/searchService';
import { COLORS, RADIUS, SHADOWS, FONTS } from '@/constants/config';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ── Type metadata ─────────────────────────────────────────────
const TYPE_META: Record<
  GlobalSearchResult['type'],
  { icon: IoniconsName; label: string; color: string; bg: string }
> = {
  RESIDENT:    { icon: 'person-outline',    label: 'Resident',    color: '#4F46E5', bg: '#EEF2FF' },
  MAINTENANCE: { icon: 'construct-outline', label: 'Maintenance', color: '#D97706', bg: '#FEF3C7' },
  EVENT:       { icon: 'calendar-outline',  label: 'Event',       color: '#059669', bg: '#D1FAE5' },
  NOTICE:      { icon: 'megaphone-outline', label: 'Notice',      color: '#2563EB', bg: '#DBEAFE' },
  VISITOR:     { icon: 'home-outline',      label: 'Visitor',     color: '#7C3AED', bg: '#EDE9FE' },
};

// ── Navigation targets ────────────────────────────────────────
// SECURITY: the route is derived locally from the result's `type` and `id`.
// The `url` the backend sends is never fed to the router: a leading-slash
// check does not stop `//evil.com` (protocol-relative, navigates off-origin
// on web) nor `/admin/...` or another tenant's screens. Any result whose
// `type` is not in this map is simply not tappable.
//
// Routes that exist in this app's `app/` tree:
//   EVENT  -> app/events/[id].tsx          (detail screen, takes the id)
// Types with no detail screen fall back to the closest existing list screen
// and the id is dropped:
//   RESIDENT    -> app/community/directory.tsx
//   MAINTENANCE -> app/helpdesk/index.tsx
//   NOTICE      -> app/notices/index.tsx
//   VISITOR     -> app/visitors/index.tsx
const RESULT_ROUTES: Record<
  GlobalSearchResult['type'],
  (id: GlobalSearchResult['id']) => string
> = {
  EVENT:       (id) => `/events/${encodeURIComponent(String(id))}`,
  RESIDENT:    () => '/community/directory',
  MAINTENANCE: () => '/helpdesk',
  NOTICE:      () => '/notices',
  VISITOR:     () => '/visitors',
};

function routeForResult(item: GlobalSearchResult): string | null {
  // `item.type` is server-supplied, so verify the map really owns the key and
  // that the value is a builder (guards against keys like `__proto__`).
  if (!Object.prototype.hasOwnProperty.call(RESULT_ROUTES, item.type)) return null;
  const build = RESULT_ROUTES[item.type];
  if (typeof build !== 'function') return null;
  if (item.id === null || item.id === undefined) return null;
  return build(item.id);
}

// ── Result item ───────────────────────────────────────────────
function ResultItem({
  item,
  onPress,
}: {
  item: GlobalSearchResult;
  onPress: () => void;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.NOTICE;
  return (
    <TouchableOpacity style={styles.resultRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={14} color={meta.color} />
        <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <View style={styles.resultText}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [cachedResults, setCachedResults] = useState<GlobalSearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  // Monotonically increasing id of the most recently *started* request, plus
  // the controller for the request still in flight. Together they make sure a
  // slow response from an older query can neither overwrite fresher results
  // nor clear the spinner belonging to the request that is still running.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    // Cancel whatever is in flight: its response is no longer wanted.
    abortRef.current?.abort();
    abortRef.current = null;
    const requestId = ++requestIdRef.current;

    if (!q.trim()) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setOffline(false);
    try {
      const data = await globalSearch(q, 20, controller.signal);
      // A newer request has started since: drop this (stale) response.
      if (requestId !== requestIdRef.current) return;
      setResults(data);
      if (data.length > 0) setCachedResults(data);
    } catch (err: unknown) {
      // Swallow cancellation specifically; it is the expected outcome for a
      // request we aborted ourselves. Everything else still surfaces.
      if (isAbortError(err)) return;
      if (requestId !== requestIdRef.current) return;
      // Detect offline vs server error heuristically
      const msg = err instanceof Error ? err.message : String(err);
      const isNetworkErr =
        msg.includes('Network Error') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('timeout') ||
        msg.includes('network');
      if (isNetworkErr) {
        setOffline(true);
      } else {
        setError('Search failed. Please try again.');
      }
      setResults([]);
    } finally {
      // Only the current request owns the spinner.
      if (requestId === requestIdRef.current) {
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(text), 300);
    },
    [runSearch],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Invalidate any in-flight request and abort it on unmount.
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    },
    [],
  );

  const handleResultPress = useCallback(
    (item: GlobalSearchResult) => {
      // Route is derived from `item.type` / `item.id` — see RESULT_ROUTES.
      // `item.url` from the backend is deliberately ignored.
      const route = routeForResult(item);
      if (route) router.push(route as never);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GlobalSearchResult>) => (
      <ResultItem item={item} onPress={() => handleResultPress(item)} />
    ),
    [handleResultPress],
  );

  // ── Determine what list to show ───────────────────────────
  const showOffline = offline && query.trim().length > 0;
  const showEmpty = !loading && !error && !showOffline && query.trim().length > 0 && results.length === 0;
  const showIdle = !loading && query.trim().length === 0;
  const listData = showOffline ? cachedResults : results;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.inputWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search residents, events, notices..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
          />
          {Platform.OS !== 'ios' && query.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.centeredState}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.stateText}>Searching...</Text>
        </View>
      )}

      {/* Offline warning */}
      {showOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#B45309" />
          <Text style={styles.offlineBannerText}>
            {cachedResults.length > 0
              ? 'Offline — showing cached results'
              : 'Search requires an internet connection'}
          </Text>
        </View>
      )}

      {/* Error */}
      {!!error && (
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
          <Text style={styles.stateText}>{error}</Text>
        </View>
      )}

      {/* Idle empty state */}
      {showIdle && !loading && (
        <View style={styles.centeredState}>
          <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.idleTitle}>Search Mana Community</Text>
          <Text style={styles.idleSubtitle}>
            Search across residents, maintenance requests, events, notices, and visitors
          </Text>
          <View style={styles.hintRow}>
            {(['RESIDENT', 'EVENT', 'NOTICE', 'MAINTENANCE', 'VISITOR'] as const).map((t) => {
              const m = TYPE_META[t];
              return (
                <View key={t} style={[styles.hintChip, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.icon} size={12} color={m.color} />
                  <Text style={[styles.hintChipText, { color: m.color }]}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* No results */}
      {showEmpty && (
        <View style={styles.centeredState}>
          <Ionicons name="search-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.idleTitle}>No results found</Text>
          <Text style={styles.idleSubtitle}>Try a different keyword or check the spelling</Text>
        </View>
      )}

      {/* Results list */}
      {!loading && listData.length > 0 && (
        <FlatList
          data={listData}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    ...SHADOWS.sm,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  inputIcon: { marginRight: 2 },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: FONTS.regular,
    padding: 0,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    marginTop: 8,
  },
  idleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginTop: 12,
    textAlign: 'center',
  },
  idleSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  hintRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  hintChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#B45309',
    fontFamily: FONTS.semiBold,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: THEME.border,
    marginLeft: 60,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    marginVertical: 2,
    ...SHADOWS.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    minWidth: 90,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  resultSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
});
