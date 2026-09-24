import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '@/services/marketplaceService';
import { COLORS } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';
import type { MarketplaceListingDto } from '@/types/api';

type StatusTab = 'ACTIVE' | 'SOLD' | 'EXPIRED';

const TABS: { key: StatusTab; label: string; emoji: string }[] = [
  { key: 'ACTIVE',  label: 'Active',  emoji: '🟢' },
  { key: 'SOLD',    label: 'Sold',    emoji: '✅' },
  { key: 'EXPIRED', label: 'Expired', emoji: '⏱' },
];

function MyListingRow({
  listing,
  onEdit,
  onMarkSold,
  onDelete,
}: {
  listing:    MarketplaceListingDto;
  onEdit:     (l: MarketplaceListingDto) => void;
  onMarkSold: (l: MarketplaceListingDto) => void;
  onDelete:   (l: MarketplaceListingDto) => void;
}) {
  const router = useRouter();
  const thumb  = listing.imageUrls?.[0];

  return (
    <TouchableOpacity
      style={rc.card}
      onPress={() => router.push(`/marketplace/${listing.id}`)}
      activeOpacity={0.8}
    >
      {/* Thumbnail */}
      <View style={rc.thumbWrap}>
        {thumb
          ? <Image source={{ uri: thumb }} style={rc.thumb} resizeMode="cover" />
          : <View style={rc.thumbPlaceholder}><Text style={{ fontSize: 24 }}>🏷️</Text></View>
        }
        {listing.status === 'SOLD' && (
          <View style={rc.soldOverlay}><Text style={rc.soldText}>SOLD</Text></View>
        )}
      </View>

      {/* Info */}
      <View style={rc.info}>
        <Text style={rc.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={rc.price}>
          {listing.isFree ? 'Free' : `₹${listing.price.toLocaleString('en-IN')}`}
        </Text>
        <View style={rc.stats}>
          <Text style={rc.stat}>👁 {listing.viewCount}</Text>
          <Text style={rc.stat}>🤍 {listing.savedCount}</Text>
          <Text style={rc.stat}>
            {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={rc.actions}>
        {listing.status === 'ACTIVE' && (
          <>
            <TouchableOpacity style={rc.actionBtn} onPress={() => onEdit(listing)}>
              <Text style={rc.actionEmoji}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={rc.actionBtn} onPress={() => onMarkSold(listing)}>
              <Text style={rc.actionEmoji}>✅</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={[rc.actionBtn, rc.deleteBtn]} onPress={() => onDelete(listing)}>
          <Text style={rc.actionEmoji}>🗑</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const rc = StyleSheet.create({
  card:           { flexDirection: 'row', backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  thumbWrap:      { width: 88, height: 88, position: 'relative', backgroundColor: '#F3F4F6', flexShrink: 0 },
  thumb:          { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  soldOverlay:    { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  soldText:       { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  info:           { flex: 1, padding: 12, gap: 3 },
  title:          { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  price:          { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  stats:          { flexDirection: 'row', gap: 10, marginTop: 2 },
  stat:           { fontSize: 11, color: COLORS.textMuted },
  actions:        { flexDirection: 'column', padding: 8, gap: 6 },
  actionBtn:      { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  deleteBtn:      { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  actionEmoji:    { fontSize: 16 },
});

// ── Screen ─────────────────────────────────────────────────────
export default function MyListingsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [tab, setTab] = useState<StatusTab>('ACTIVE');

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['my-listings', tab],
    queryFn:  ({ pageParam = 0 }) => marketplaceService.getMyListings(tab, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const listings = data?.pages.flatMap((p) => p.content) ?? [];
  const total    = data?.pages[0]?.totalElements ?? 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['my-listings'] });
    qc.invalidateQueries({ queryKey: ['marketplace'] });
  };

  const soldMutation   = useMutation({ mutationFn: (id: number) => marketplaceService.markAsSold(id), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: (id: number) => marketplaceService.deleteListing(id), onSuccess: invalidate });

  const handleEdit    = useCallback((l: MarketplaceListingDto) => router.push({ pathname: '/marketplace/create', params: { editId: l.id } }), [router]);
  const handleSold    = useCallback((l: MarketplaceListingDto) => {
    Alert.alert('Mark as Sold', `Mark "${l.title}" as sold?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Sold', onPress: () => soldMutation.mutate(l.id) },
    ]);
  }, [soldMutation]);
  const handleDelete  = useCallback((l: MarketplaceListingDto) => {
    Alert.alert('Delete Listing', `Delete "${l.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(l.id) },
    ]);
  }, [deleteMutation]);

  const EMPTY_MSG: Record<StatusTab, string> = {
    ACTIVE:  "You don't have any active listings.",
    SOLD:    "No sold listings yet.",
    EXPIRED: "No expired listings.",
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>My Listings</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/marketplace/create')}
        >
          <Text style={s.addBtnText}>+ Sell</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {!isLoading && total > 0 && (
        <View style={s.summaryBar}>
          <Text style={s.summaryText}>{total} {tab.toLowerCase()} listing{total !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>
              {t.emoji} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => String(l.id)}
          renderItem={({ item }) => (
            <MyListingRow
              listing={item}
              onEdit={handleEdit}
              onMarkSold={handleSold}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🛒</Text>
              <Text style={s.emptyText}>{EMPTY_MSG[tab]}</Text>
              {tab === 'ACTIVE' && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/marketplace/create')}>
                  <Text style={s.emptyBtnText}>Post Your First Listing</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:           { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:          { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  addBtn:         { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  summaryBar:     { backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 6 },
  summaryText:    { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  tabs:           { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:            { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText:        { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive:  { color: COLORS.primary, fontWeight: '700' },
  empty:          { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:     { fontSize: 48 },
  emptyText:      { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },
  emptyBtn:       { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});
