import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { AuctionRFQ } from '@/types/procurement';

type Filter = 'OPEN' | 'ALL';

function timeLeft(deadline?: string): string {
  if (!deadline) return '—';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h}h left`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h left`;
}

function isExpired(deadline?: string) {
  if (!deadline) return false;
  return new Date(deadline).getTime() <= Date.now();
}

export default function AuctionList() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [refreshing, setRefreshing] = useState(false);

  const { data: auctions = [], isLoading, refetch } = useQuery({
    queryKey: ['auctions'],
    queryFn: procurementHubService.getOpenAuctions,
  });

  const filtered = useMemo(() => {
    if (filter === 'ALL') return auctions;
    return auctions.filter(a => !isExpired(a.auctionDeadline));
  }, [auctions, filter]);

  const myBidCount = auctions.filter(a => a.myBid != null).length;
  const leadingCount = auctions.filter(a => a.myBid?.rank === 1).length;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={['#4C1D95', '#7C3AED']} style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Reverse Auctions</Text>
            <Text style={s.headerSub}>Competitive supplier bidding</Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => router.push('/procurement/auction/new' as any)}
          >
            <Ionicons name="add" size={18} color="#7C3AED" />
            <Text style={s.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
        <View style={s.statsRow}>
          <Stat label="Total" val={auctions.length} />
          <Stat label="Active" val={filtered.length} />
          <Stat label="My Bids" val={myBidCount} />
          <Stat label="Leading" val={leadingCount} accent />
        </View>
      </LinearGradient>

      {/* Filter */}
      <View style={s.tabs}>
        {(['OPEN', 'ALL'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.tab, filter === f && s.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f === 'OPEN' ? '⚡ Live' : '📋 All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} tintColor="#7C3AED" />}
      >
        {isLoading && <ActivityIndicator color="#7C3AED" style={{ marginTop: 32 }} />}

        {!isLoading && filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔨</Text>
            <Text style={s.emptyTitle}>No live auctions</Text>
            <Text style={s.emptySub}>Create an auction to get competitive bids from suppliers</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push('/procurement/auction/new' as any)}
            >
              <Text style={s.emptyBtnText}>Create Auction</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && filtered.map(a => (
          <AuctionCard
            key={a.id}
            auction={a}
            onPress={() => router.push(`/procurement/auction/${a.id}` as any)}
          />
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, val, accent }: { label: string; val: number; accent?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statVal, accent && s.statValAccent]}>{val}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function AuctionCard({ auction: a, onPress }: { auction: AuctionRFQ; onPress: () => void }) {
  const expired = isExpired(a.auctionDeadline);
  const leading = a.myBid?.rank === 1;
  const hasBid = a.myBid != null;

  return (
    <TouchableOpacity style={ac.card} onPress={onPress} activeOpacity={0.85}>
      <View style={ac.top}>
        <View style={{ flex: 1 }}>
          <Text style={ac.title} numberOfLines={1}>{a.title}</Text>
          <Text style={ac.item} numberOfLines={1}>📦 {a.primaryItem}</Text>
        </View>
        {!expired && (
          <View style={[ac.deadlineBadge, leading && { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="time-outline" size={11} color={leading ? '#059669' : '#7C3AED'} />
            <Text style={[ac.deadlineText, leading && { color: '#059669' }]}>
              {timeLeft(a.auctionDeadline)}
            </Text>
          </View>
        )}
        {expired && (
          <View style={[ac.deadlineBadge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[ac.deadlineText, { color: COLORS.textMuted }]}>Closed</Text>
          </View>
        )}
      </View>

      <View style={ac.metrics}>
        <View style={ac.metric}>
          <Text style={ac.metricVal}>{a.bidCount}</Text>
          <Text style={ac.metricLabel}>Bids</Text>
        </View>
        <View style={ac.metric}>
          <Text style={[ac.metricVal, { color: '#059669' }]}>
            {a.lowestBid ? `₹${a.lowestBid.toLocaleString('en-IN')}` : '—'}
          </Text>
          <Text style={ac.metricLabel}>Lowest Bid</Text>
        </View>
        {a.reservePrice && (
          <View style={ac.metric}>
            <Text style={ac.metricVal}>₹{a.reservePrice.toLocaleString('en-IN')}</Text>
            <Text style={ac.metricLabel}>Reserve</Text>
          </View>
        )}
        {a.estimatedValue && (
          <View style={ac.metric}>
            <Text style={ac.metricVal}>₹{(a.estimatedValue / 1000).toFixed(0)}K</Text>
            <Text style={ac.metricLabel}>Estimated</Text>
          </View>
        )}
      </View>

      {hasBid && (
        <View style={[ac.myBidRow, leading && { backgroundColor: '#DCFCE7' }]}>
          <Ionicons
            name={leading ? 'trophy' : 'pricetag-outline'}
            size={13}
            color={leading ? '#059669' : '#7C3AED'}
          />
          <Text style={[ac.myBidText, leading && { color: '#065F46' }]}>
            {leading ? `🥇 Leading at ₹${a.myBid!.bidAmount.toLocaleString('en-IN')}`
              : `My bid: ₹${a.myBid!.bidAmount.toLocaleString('en-IN')} · Rank #${a.myBid!.rank}`}
          </Text>
        </View>
      )}

      {!hasBid && !expired && (
        <View style={ac.ctaRow}>
          <Text style={ac.ctaText}>Place a bid to compete →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { padding: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  newBtnText: { fontSize: 13, fontWeight: '800', color: '#7C3AED' },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: '#fff' },
  statValAccent: { color: '#FDE68A' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: '#F1F5F9',
  },
  tabActive: { backgroundColor: '#F5F3FF' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#7C3AED', fontWeight: '700' },
  list: { padding: 12, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#7C3AED', borderRadius: RADIUS.md,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const ac = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  item: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  deadlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F3FF', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  deadlineText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  metrics: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10 },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricVal: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  metricLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  myBidRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.md, padding: 8,
  },
  myBidText: { fontSize: 12, fontWeight: '700', color: '#5B21B6' },
  ctaRow: { alignItems: 'flex-end' },
  ctaText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
});
