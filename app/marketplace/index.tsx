import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, Dimensions, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '@/services/marketplaceService';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { COLORS } from '@/constants/config';
import type { MarketplaceCategory, MarketplaceListingDto } from '@/types/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Category chips ─────────────────────────────────────────────
const CATEGORIES: { key: MarketplaceCategory; label: string; emoji: string }[] = [
  { key: 'ALL',         label: 'All',         emoji: '🏷️' },
  { key: 'FURNITURE',   label: 'Furniture',   emoji: '🛋️' },
  { key: 'ELECTRONICS', label: 'Electronics', emoji: '📱' },
  { key: 'CLOTHING',    label: 'Clothing',    emoji: '👕' },
  { key: 'BOOKS',       label: 'Books',       emoji: '📚' },
  { key: 'SPORTS',      label: 'Sports',      emoji: '🏋️' },
  { key: 'KITCHEN',     label: 'Kitchen',     emoji: '🍳' },
  { key: 'GARDEN',      label: 'Garden',      emoji: '🌱' },
  { key: 'SERVICES',    label: 'Services',    emoji: '🔧' },
  { key: 'FREE',        label: 'Free',        emoji: '🎁' },
  { key: 'OTHER',       label: 'Other',       emoji: '📦' },
];

export default function MarketplaceBrowseScreen({ isTab = false }: { isTab?: boolean }) {
  const router     = useRouter();
  const qc         = useQueryClient();
  const searchRef  = useRef<TextInput>(null);

  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('ALL');
  const [freeOnly, setFreeOnly] = useState(false);

  const goHome = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tabs/feed');
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      if (isTab) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, isTab])
  );

  // Apply free filter if FREE category selected
  const activeCategory = category === 'FREE' ? 'ALL' : category;
  const isFreeFilter   = category === 'FREE' || freeOnly;

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['marketplace', activeCategory, search, isFreeFilter],
    queryFn: ({ pageParam = 0 }) =>
      marketplaceService.getListings(
        {
          category: activeCategory === 'ALL' ? undefined : activeCategory,
          search:   search || undefined,
          freeOnly: isFreeFilter || undefined,
        },
        pageParam,
      ),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const listings = data?.pages.flatMap((p) => p.content) ?? [];
  const total    = data?.pages[0]?.totalElements ?? 0;

  // Toggle wishlist — backend uses a single idempotent toggle endpoint
  const saveMutation = useMutation({
    mutationFn: (listing: MarketplaceListingDto) =>
      marketplaceService.toggleSave(listing.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace'] }),
  });

  const handleCategoryPress = useCallback((key: MarketplaceCategory) => {
    setCategory(key);
    setFreeOnly(false);
  }, []);

  // Render items 2 per row via pairs
  const pairs: MarketplaceListingDto[][] = [];
  for (let i = 0; i < listings.length; i += 2) {
    pairs.push(listings.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            {!isTab && (
              <TouchableOpacity onPress={goHome} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.backBtn}>
                <Ionicons name="arrow-back" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={s.headerTitle}>Marketplace</Text>
              {!isLoading && (
                <Text style={s.headerSub}>{total} listings in your community</Text>
              )}
            </View>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.myBtn}
              onPress={() => router.push('/marketplace/my-listings')}
            >
              <Text style={s.myBtnText}>My Listings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => router.push('/marketplace/create')}
            >
              <Text style={s.addBtnText}>+ Sell</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            ref={searchRef}
            style={s.search}
            placeholder="Search listings…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[s.chip, category === c.key && s.chipActive]}
              onPress={() => handleCategoryPress(c.key)}
            >
              <Text style={s.chipEmoji}>{c.emoji}</Text>
              <Text style={[s.chipText, category === c.key && s.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Listings grid */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={pairs}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item: pair }) => (
            <View style={s.row}>
              {pair.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onSave={(l) => saveMutation.mutate(l)}
                  isSaving={saveMutation.isPending}
                />
              ))}
              {/* Filler if odd number */}
              {pair.length === 1 && (
                <View style={{ width: (SCREEN_WIDTH - 36) / 2 }} />
              )}
            </View>
          )}
          contentContainerStyle={s.grid}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} />
              : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🛒</Text>
              <Text style={s.emptyTitle}>No listings found</Text>
              <Text style={s.emptySub}>
                {search
                  ? 'Try a different search term'
                  : 'Be the first to sell something!'}
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push('/marketplace/create')}
              >
                <Text style={s.emptyBtnText}>Post a Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingTop: 4 },
  headerTop:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerSub:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  headerActions:{ flexDirection: 'row', gap: 8, alignItems: 'center' },
  myBtn:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  myBtnText:    { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  addBtn:       { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, gap: 8 },
  searchIcon:   { fontSize: 16 },
  search:       { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  chips:        { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  chipActive:   { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  chipEmoji:    { fontSize: 14 },
  chipText:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  grid:         { padding: 12, gap: 12 },
  row:          { flexDirection: 'row', gap: 12 },
  empty:        { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji:   { fontSize: 52 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub:     { fontSize: 14, color: COLORS.textMuted },
  emptyBtn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
