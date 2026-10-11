import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '@/services/marketplaceService';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import type { MarketplaceListingDto } from '@/types/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function WishlistScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['marketplace', 'wishlist'],
    queryFn: ({ pageParam = 0 }) => marketplaceService.getSavedListings(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const listings = data?.pages.flatMap((p) => p.content) ?? [];
  const total = data?.pages[0]?.totalElements ?? listings.length;

  const unsaveMutation = useMutation({
    mutationFn: (listing: MarketplaceListingDto) =>
      marketplaceService.toggleSave(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });

  const pairs: MarketplaceListingDto[][] = [];
  for (let i = 0; i < listings.length; i += 2) {
    pairs.push(listings.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Saved Wishlist</Text>
          {!isLoading && (
            <Text style={s.headerSub}>{total} saved item{total === 1 ? '' : 's'}</Text>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Loading saved items…</Text>
        </View>
      ) : (
        <FlatList
          data={pairs}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item: pair }) => (
            <View style={s.row}>
              {pair.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={{ ...listing, isSaved: true }}
                  onSave={(l) => unsaveMutation.mutate(l)}
                  isSaving={unsaveMutation.isPending}
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
              : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="heart-dislike-outline" size={36} color="#EC4899" />
              </View>
              <Text style={s.emptyTitle}>Your Wishlist is Empty</Text>
              <Text style={s.emptySub}>
                Save items by tapping the heart icon while exploring the neighborhood marketplace.
              </Text>
              <TouchableOpacity
                style={s.exploreBtn}
                onPress={() => router.push('/marketplace')}
                activeOpacity={0.8}
              >
                <Text style={s.exploreBtnText}>Explore Marketplace</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  grid: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
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
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 36,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  exploreBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
});
