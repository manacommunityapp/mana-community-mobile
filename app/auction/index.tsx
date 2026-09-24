import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { auctionService } from '@/services/auctionService';
import { CompactCountdown } from '@/components/auction/CountdownTimer';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { format } from 'date-fns';
import type { AuctionDto } from '@/types/api';

type AuctionTab = 'LIVE' | 'UPCOMING' | 'ENDED';

const TABS: { key: AuctionTab; label: string; emoji: string }[] = [
  { key: 'LIVE',     label: 'Live Now', emoji: '🔴' },
  { key: 'UPCOMING', label: 'Upcoming', emoji: '🗓' },
  { key: 'ENDED',    label: 'Ended',    emoji: '🏁' },
];

function AuctionCard({ auction }: { auction: AuctionDto }) {
  const router = useRouter();
  const thumb  = auction.imageUrls?.[0];
  const isLive = auction.status === 'LIVE' || auction.status === 'ENDING_SOON';

  return (
    <TouchableOpacity
      style={ac.card}
      onPress={() => router.push(`/auction/${auction.id}`)}
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={ac.imageWrap}>
        {thumb
          ? <Image source={{ uri: thumb }} style={ac.image} resizeMode="cover" />
          : <View style={ac.imagePh}><Text style={{ fontSize: 32 }}>🔨</Text></View>
        }
        {/* Live badge */}
        {isLive && (
          <View style={ac.liveBadge}>
            <View style={ac.liveDot} />
            <Text style={ac.liveText}>LIVE</Text>
          </View>
        )}
        {auction.status === 'ENDED' && (
          <View style={ac.endedBadge}><Text style={ac.endedText}>ENDED</Text></View>
        )}
      </View>

      {/* Info */}
      <View style={ac.info}>
        <Text style={ac.title} numberOfLines={2}>{auction.title}</Text>

        {/* Price */}
        <View style={ac.priceRow}>
          <View>
            <Text style={ac.priceLabel}>
              {auction.status === 'ENDED' ? 'Sold for' : 'Current Bid'}
            </Text>
            <Text style={ac.price}>
              ₹{(auction.status === 'ENDED' ? auction.finalPrice ?? auction.currentBid : auction.currentBid).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={ac.bidInfo}>
            <Text style={ac.bidCount}>🔨 {auction.bidCount} bids</Text>
            {auction.reserveMet && (
              <Text style={ac.reserveMet}>✅ Reserve met</Text>
            )}
          </View>
        </View>

        {/* Countdown or result */}
        {isLive && (
          <CompactCountdown endTime={auction.endTime} />
        )}
        {auction.status === 'UPCOMING' && (
          <CompactCountdown startTime={auction.startTime} />
        )}
        {auction.status === 'ENDED' && auction.winnerName && (
          <Text style={ac.winner}>🏆 Won by {auction.winnerName}</Text>
        )}
        {auction.status === 'ENDED' && !auction.winnerName && (
          <Text style={ac.noBids}>No bids placed</Text>
        )}

        {/* Seller + date */}
        <Text style={ac.meta} numberOfLines={1}>
          {isLive
            ? `Ends ${format(new Date(auction.endTime), 'h:mm a')}`
            : auction.status === 'UPCOMING'
            ? `Starts ${format(new Date(auction.startTime), 'dd MMM, h:mm a')}`
            : `Ended ${format(new Date(auction.endTime), 'dd MMM')}`
          } · {auction.sellerName}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const ac = StyleSheet.create({
  card:       { backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row' },
  imageWrap:  { width: 110, position: 'relative', backgroundColor: '#F3F4F6' },
  image:      { width: 110, height: '100%' },
  imagePh:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  liveBadge:  { position: 'absolute', top: 8, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  liveDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText:   { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  endedBadge: { position: 'absolute', top: 8, left: 6, backgroundColor: '#374151', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  endedText:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  info:       { flex: 1, padding: 12, gap: 5 },
  title:      { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  priceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  priceLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  price:      { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  bidInfo:    { alignItems: 'flex-end', gap: 2 },
  bidCount:   { fontSize: 12, color: COLORS.textMuted },
  reserveMet: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  winner:     { fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  noBids:     { fontSize: 12, color: COLORS.textMuted },
  meta:       { fontSize: 12, color: COLORS.textMuted },
});

// ── Screen ─────────────────────────────────────────────────────
export default function AuctionListScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<AuctionTab>('LIVE');

  const goHome = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tabs/feed');
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey:        ['auctions', tab],
    queryFn:         ({ pageParam = 0 }) => auctionService.getAuctions(tab, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
    refetchInterval: tab === 'LIVE' ? 15_000 : false,
  });

  const auctions = data?.pages.flatMap((p) => p.content) ?? [];
  const total    = data?.pages[0]?.totalElements ?? 0;

  const renderItem = useCallback(
    ({ item }: { item: AuctionDto }) => <AuctionCard auction={item} />,
    [],
  );

  const EMPTY: Record<AuctionTab, { emoji: string; text: string }> = {
    LIVE:     { emoji: '🔴', text: 'No live auctions right now.\nCheck back soon!' },
    UPCOMING: { emoji: '🗓', text: 'No upcoming auctions scheduled.' },
    ENDED:    { emoji: '🏁', text: 'No ended auctions yet.' },
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>Community Auction</Text>
          <Text style={s.subTitle}>
            {!isLoading && tab === 'LIVE' && total > 0 ? `${total} active auctions live` : 'Bid on community items'}
          </Text>
        </View>
        {tab === 'LIVE' && total > 0 && (
          <View style={s.liveHeaderPill}>
            <View style={s.liveHeaderDot} />
            <Text style={s.liveHeaderText}>{total} Live</Text>
          </View>
        )}
      </View>

      {/* Segmented Tabs */}
      <View style={s.tabsWrap}>
        <View style={s.tabsSegment}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.tabBtn, active && s.tabBtnActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.75}
              >
                <Text style={s.tabEmoji}>{t.emoji}</Text>
                <Text style={[s.tabText, active && s.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={s.loaderContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loaderText}>Loading auctions...</Text>
        </View>
      ) : (
        <FlatList
          data={auctions}
          keyExtractor={(a) => String(a.id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconCircle}>
                <Text style={{ fontSize: 32 }}>{EMPTY[tab].emoji}</Text>
              </View>
              <Text style={s.emptyTitle}>No auctions found</Text>
              <Text style={s.emptyText}>{EMPTY[tab].text}</Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  liveHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  liveHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.error,
  },
  liveHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.error,
  },

  // ── Tabs Segment ───────────────────────────────────────────────
  tabsWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsSegment: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  tabEmoji: {
    fontSize: 13,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── List & Empty ───────────────────────────────────────────────
  listContent: {
    paddingVertical: 10,
  },
  loaderContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
