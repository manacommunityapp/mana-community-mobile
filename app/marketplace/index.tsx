import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, Dimensions, BackHandler, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '@/services/marketplaceService';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MarketplaceCategory, MarketplaceListingDto } from '@/types/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CATEGORIES: { key: MarketplaceCategory; label: string; emoji: string; color: string; bg: string }[] = [
  { key: 'ALL',         label: 'All',         emoji: '🏷️', color: '#4F46E5', bg: '#EEF2FF' },
  { key: 'FURNITURE',   label: 'Furniture',   emoji: '🛋️', color: '#B45309', bg: '#FEF3C7' },
  { key: 'ELECTRONICS', label: 'Electronics', emoji: '📱', color: '#0284C7', bg: '#E0F2FE' },
  { key: 'CLOTHING',    label: 'Clothing',    emoji: '👕', color: '#DB2777', bg: '#FCE7F3' },
  { key: 'BOOKS',       label: 'Books',       emoji: '📚', color: '#7C3AED', bg: '#F3E8FF' },
  { key: 'SPORTS',      label: 'Sports',      emoji: '🏋️', color: '#059669', bg: '#DCFCE7' },
  { key: 'KITCHEN',     label: 'Kitchen',     emoji: '🍳', color: '#DC2626', bg: '#FEE2E2' },
  { key: 'GARDEN',      label: 'Garden',      emoji: '🌱', color: '#0D9488', bg: '#CCFBF1' },
  { key: 'SERVICES',    label: 'Services',    emoji: '🔧', color: '#6366F1', bg: '#EDE9FE' },
  { key: 'FREE',        label: 'Free',        emoji: '🎁', color: '#16A34A', bg: '#DCFCE7' },
  { key: 'OTHER',       label: 'Other',       emoji: '📦', color: '#64748B', bg: '#F1F5F9' },
];

const QUICK_ACTIONS = [
  { label: 'Sell Item',    emoji: '📸', bg: '#DCFCE7', color: '#059669', route: '/marketplace/create' },
  { label: 'My Listings',  emoji: '📋', bg: '#EEF2FF', color: '#4F46E5', route: '/marketplace/my-listings' },
  { label: 'Saved',        emoji: '❤️', bg: '#FEE2E2', color: '#DC2626', route: '/marketplace/saved' },
  { label: 'Free Stuff',   emoji: '🎁', bg: '#F0FDFA', color: '#0D9488', action: 'free' },
];

export default function MarketplaceBrowseScreen({ isTab = false }: { isTab?: boolean }) {
  const router     = useRouter();
  const qc         = useQueryClient();
  const searchRef  = useRef<TextInput>(null);

  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState<MarketplaceCategory>('ALL');
  const [freeOnly,    setFreeOnly]    = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  const saveMutation = useMutation({
    mutationFn: (listing: MarketplaceListingDto) =>
      marketplaceService.toggleSave(listing.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace'] }),
  });

  const handleCategoryPress = useCallback((key: MarketplaceCategory) => {
    setCategory(key);
    setFreeOnly(false);
  }, []);

  const handleQuickAction = useCallback((action: typeof QUICK_ACTIONS[0]) => {
    if (action.action === 'free') {
      setCategory('FREE');
      setFreeOnly(true);
    } else if (action.route) {
      router.push(action.route as any);
    }
  }, [router]);

  const pairs: MarketplaceListingDto[][] = [];
  for (let i = 0; i < listings.length; i += 2) {
    pairs.push(listings.slice(i, i + 2));
  }

  const renderHeader = () => (
    <View>
      {/* Quick Actions */}
      <View style={s.quickRow}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={s.quickCard}
            onPress={() => handleQuickAction(a)}
            activeOpacity={0.7}
          >
            <View style={[s.quickIcon, { backgroundColor: a.bg }]}>
              <Text style={s.quickEmoji}>{a.emoji}</Text>
            </View>
            <Text style={s.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Grid — fixed 2 rows of 5 */}
      <View style={s.catSection}>
        <View style={s.sectionHeader}>
          <View style={[s.sectionDot, { backgroundColor: '#6366F1' }]} />
          <Text style={s.sectionTitle}>Browse Categories</Text>
        </View>
        <View style={s.catGrid}>
          {CATEGORIES.slice(0, CATEGORIES.length > 10 ? 9 : 10).map((c) => {
            const isActive = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[s.catItem, isActive && s.catItemActive]}
                onPress={() => handleCategoryPress(c.key)}
                activeOpacity={0.7}
              >
                <View style={[s.catIconBox, { backgroundColor: isActive ? c.color : c.bg }]}>
                  <Text style={s.catEmoji}>{c.emoji}</Text>
                </View>
                <Text style={[s.catLabel, isActive && { color: c.color, fontWeight: '700' }]} numberOfLines={1}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          {CATEGORIES.length > 10 && (
            <TouchableOpacity
              style={s.catItem}
              onPress={() => setShowAllCats(true)}
              activeOpacity={0.7}
            >
              <View style={[s.catIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Text style={s.catMoreCount}>+{CATEGORIES.length - 9}</Text>
              </View>
              <Text style={s.catLabel}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Listings Header */}
      <View style={s.listingsHeader}>
        <View style={s.sectionHeader}>
          <View style={[s.sectionDot, { backgroundColor: '#059669' }]} />
          <Text style={s.sectionTitle}>
            {category === 'ALL' ? 'Latest Listings' : CATEGORIES.find(c => c.key === category)?.label || 'Listings'}
          </Text>
          {!isLoading && (
            <View style={s.countBadge}>
              <Text style={s.countText}>{total}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient colors={['#312E81', '#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gradientHeader}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            {!isTab && (
              <TouchableOpacity onPress={goHome} style={s.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>🏪 Marketplace</Text>
              {!isLoading && (
                <Text style={s.headerSub}>{total} listings in your community</Text>
              )}
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              style={[s.headerIconBtn, isSearchOpen && s.headerIconBtnActive]}
              onPress={() => {
                setIsSearchOpen((prev) => !prev);
                if (isSearchOpen) setSearch('');
              }}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Ionicons
                name={isSearchOpen ? 'close-outline' : 'search-outline'}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.sellBtn}
              onPress={() => router.push('/marketplace/create')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={s.sellBtnText}>Sell</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Strip */}
        <View style={s.statsStrip}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{total || '—'}</Text>
            <Text style={s.statLabel}>Listings</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{CATEGORIES.length - 1}</Text>
            <Text style={s.statLabel}>Categories</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>🎁</Text>
            <Text style={s.statLabel}>Free Items</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>🤝</Text>
            <Text style={s.statLabel}>Negotiate</Text>
          </View>
        </View>

        {/* Search in Header (Toggled via search icon) */}
        {isSearchOpen && (
          <View style={s.searchWrap}>
            <Ionicons name="search" size={16} color="#94A3B8" />
            <TextInput
              ref={searchRef}
              style={s.search}
              placeholder="Search furniture, electronics, books…"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </LinearGradient>

      {/* Listings grid */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Loading marketplace…</Text>
        </View>
      ) : (
        <FlatList
          data={pairs}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={renderHeader}
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
              : listings.length > 0
                ? <View style={s.footerSafe} />
                : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Text style={s.emptyEmoji}>🛒</Text>
              </View>
              <Text style={s.emptyTitle}>No listings found</Text>
              <Text style={s.emptySub}>
                {search
                  ? 'Try a different search term'
                  : 'Be the first to sell something!'}
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push('/marketplace/create')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.emptyBtnGrad}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={s.emptyBtnText}>Post a Listing</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      {/* All Categories Modal */}
      <Modal visible={showAllCats} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAllCats(false)}>
        <View style={s.catModalContainer}>
          <View style={s.catModalHeader}>
            <View style={s.catModalTitleRow}>
              <View style={[s.sectionDot, { backgroundColor: '#6366F1' }]} />
              <Text style={s.catModalTitle}>All Categories</Text>
            </View>
            <TouchableOpacity style={s.catModalClose} onPress={() => setShowAllCats(false)} hitSlop={8}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.catModalGrid} showsVerticalScrollIndicator={false}>
            {CATEGORIES.map((c) => {
              const isActive = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[s.catModalItem, isActive && { backgroundColor: c.bg, borderColor: c.color }]}
                  onPress={() => { handleCategoryPress(c.key); setShowAllCats(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.catModalIconBox, { backgroundColor: isActive ? c.color : c.bg }]}>
                    <Text style={s.catModalEmoji}>{c.emoji}</Text>
                  </View>
                  <Text style={[s.catModalLabel, isActive && { color: c.color, fontWeight: '700' }]}>{c.label}</Text>
                  {isActive && <Ionicons name="checkmark-circle" size={16} color={c.color} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Gradient Header ──
  gradientHeader: {
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
    fontFamily: FONTS.regular,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerIconBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderColor: '#FFFFFF',
  },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sellBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },

  // ── Stats Strip ──
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    fontFamily: FONTS.regular,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // ── Search ──
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
    ...SHADOWS.sm,
  },
  search: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },

  // ── Quick Actions ──
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmoji: {
    fontSize: 18,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.medium,
  },

  // ── Category Section ──
  catSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    fontFamily: FONTS.displayBold,
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    fontFamily: FONTS.semiBold,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
  },
  catItem: {
    width: (SCREEN_WIDTH - 56) / 5,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  catItemActive: {
    backgroundColor: '#F0F0FF',
  },
  catIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: {
    fontSize: 18,
  },
  catLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: FONTS.medium,
  },
  catMoreCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    fontFamily: FONTS.displayBold,
  },

  // ── Listings ──
  listingsHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },

  // ── Empty ──
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyEmoji: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  emptyBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  emptyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  footerSafe: {
    height: 20,
  },

  // ── Categories Modal ──
  catModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  catModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
    backgroundColor: '#FFFFFF',
  },
  catModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  catModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catModalGrid: {
    padding: 16,
    gap: 8,
  },
  catModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  catModalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catModalEmoji: {
    fontSize: 22,
  },
  catModalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.medium,
  },
});
