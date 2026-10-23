import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { BulkBuyCampaign, BulkBuyCampaignStatus } from '@/types/procurement';

const TABS: { label: string; status?: string }[] = [
  { label: 'Active', status: 'ACTIVE' },
  { label: 'Committed', status: 'COMMITTED' },
  { label: 'All' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  CLEANING_SUPPLIES: '🧹', ELECTRICAL: '⚡', PLUMBING: '🔧',
  OFFICE_SUPPLIES: '📎', GARDENING: '🌿', SECURITY_EQUIPMENT: '🔒',
  FURNITURE: '🪑', IT_EQUIPMENT: '💻', FOOD_BEVERAGE: '🍱',
  MAINTENANCE: '🏢', PACKAGING: '📦', OTHER: '📦',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT:     { bg: '#F1F5F9', text: '#64748B' },
  ACTIVE:    { bg: '#DCFCE7', text: '#166534' },
  COMMITTED: { bg: '#DBEAFE', text: '#1D4ED8' },
  AWARDED:   { bg: '#F3E8FF', text: '#7C3AED' },
  CLOSED:    { bg: '#F3F4F6', text: '#374151' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
};

function daysLeft(deadlineDate: string): number {
  const diff = new Date(deadlineDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

export default function BulkBuyCampaigns() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const status = TABS[tab].status;

  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ['bulkbuy-campaigns', status],
    queryFn: () => procurementHubService.getBulkBuyCampaigns(status),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filtered = campaigns.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.productName.toLowerCase().includes(search.toLowerCase()),
  );

  const active = campaigns.filter(c => c.status === 'ACTIVE');
  const committed = campaigns.filter(c => c.status === 'COMMITTED');
  const myCommitted = campaigns.filter(c => c.myCommitmentQuantity != null && c.myCommitmentQuantity > 0);

  return (
    <View style={s.root}>
      {/* Header */}
      <LinearGradient colors={['#0F2744', '#1E3A5F', '#2563EB']} style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>🛒 BulkBuy Campaigns</Text>
            <Text style={s.headerSub}>Pool demand, unlock better prices</Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => router.push('/procurement/bulkbuy/new' as any)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statVal}>{active.length}</Text>
            <Text style={s.statLbl}>Active</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statVal}>{committed.length}</Text>
            <Text style={s.statLbl}>Committed</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statVal}>{myCommitted.length}</Text>
            <Text style={s.statLbl}>Joined</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search campaigns..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t.label}
            style={[s.tab, tab === i && s.tabActive]}
            onPress={() => setTab(i)}
          >
            <Text style={[s.tabText, tab === i && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🛒</Text>
              <Text style={s.emptyTitle}>No campaigns found</Text>
              <Text style={s.emptySub}>
                {tab === 0
                  ? 'No active BulkBuy campaigns right now.'
                  : 'Nothing here yet.'}
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push('/procurement/bulkbuy/new' as any)}
              >
                <Text style={s.emptyBtnText}>+ Create Campaign</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map(c => (
              <CampaignCard key={c.id} campaign={c} onPress={() =>
                router.push(`/procurement/bulkbuy/${c.id}` as any)
              } />
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

function CampaignCard({
  campaign: c,
  onPress,
}: {
  campaign: BulkBuyCampaign;
  onPress: () => void;
}) {
  const progress = c.minOrderQuantity > 0
    ? Math.min(1, c.currentQuantity / c.minOrderQuantity)
    : 0;
  const pct = Math.round(progress * 100);
  const days = daysLeft(c.deadlineDate);
  const st = STATUS_COLORS[c.status] ?? STATUS_COLORS.DRAFT;
  const isJoined = c.myCommitmentQuantity != null && c.myCommitmentQuantity > 0;

  // Next tier
  const sortedTiers = [...(c.priceTiers ?? [])].sort((a, b) => a.minQuantity - b.minQuantity);
  const nextTier = sortedTiers.find(t => t.minQuantity > c.currentQuantity);
  const moreNeeded = nextTier ? nextTier.minQuantity - c.currentQuantity : 0;

  const savings = c.retailPrice && c.currentEffectivePrice
    ? Math.round(((c.retailPrice - c.currentEffectivePrice) / c.retailPrice) * 100)
    : 0;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>
      <View style={s.cardTop}>
        <View style={s.cardEmoji}>
          <Text style={{ fontSize: 22 }}>{CATEGORY_EMOJI[c.category] ?? '📦'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={1}>{c.title}</Text>
          <Text style={s.cardProduct} numberOfLines={1}>{c.productName} · {c.unit}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[s.statusText, { color: st.text }]}>{c.status}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={s.progressSection}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${pct}%` as any,
            backgroundColor: progress >= 1 ? '#059669' : '#2563EB' }]} />
        </View>
        <View style={s.progressRow}>
          <Text style={s.progressText}>{c.currentQuantity} / {c.minOrderQuantity} {c.unit}</Text>
          <Text style={s.progressPct}>{pct}%</Text>
        </View>
        {nextTier && moreNeeded > 0 && (
          <Text style={s.tierHint}>
            🎯 {moreNeeded} more → ₹{nextTier.pricePerUnit}/{c.unit}
          </Text>
        )}
      </View>

      {/* Pricing row */}
      <View style={s.pricingRow}>
        <View>
          {c.currentEffectivePrice != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.price}>₹{c.currentEffectivePrice}/{c.unit}</Text>
              {savings > 0 && (
                <View style={s.savingsBadge}>
                  <Text style={s.savingsText}>{savings}% off</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={s.price}>Price TBD</Text>
          )}
          {c.retailPrice && c.currentEffectivePrice && c.retailPrice > c.currentEffectivePrice && (
            <Text style={s.retailPrice}>MRP ₹{c.retailPrice}/{c.unit}</Text>
          )}
        </View>
        <View style={s.metaRight}>
          <Text style={s.metaText}>👥 {c.commitmentCount}</Text>
          <Text style={[s.deadlineText, days <= 2 && { color: '#DC2626' }]}>
            ⏰ {days === 0 ? 'Ends today' : `${days}d left`}
          </Text>
        </View>
      </View>

      {/* CTA */}
      {c.status === 'ACTIVE' && (
        <View style={[s.cta, isJoined && s.ctaJoined]}>
          {isJoined ? (
            <>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={s.ctaJoinedText}>
                Committed: {c.myCommitmentQuantity} {c.unit}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cart-outline" size={14} color="#fff" />
              <Text style={s.ctaText}>Join Campaign →</Text>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  header: { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#BAE6FD', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  newBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 10, color: '#BAE6FD', marginTop: 1 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', margin: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B' },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 12, marginBottom: 12,
    backgroundColor: '#E2E8F0', borderRadius: RADIUS.lg, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 7, borderRadius: RADIUS.md, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', ...SHADOWS.sm },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#1E293B', fontWeight: '700' },

  list: { paddingHorizontal: 12, gap: 10 },

  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm, gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardEmoji: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  cardProduct: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },

  progressSection: { gap: 4 },
  progressBar: {
    height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 11, color: COLORS.textMuted },
  progressPct: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  tierHint: { fontSize: 11, color: '#059669', fontWeight: '600' },

  pricingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  price: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  retailPrice: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through', marginTop: 1 },
  savingsBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  savingsText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  metaRight: { alignItems: 'flex-end', gap: 2 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  deadlineText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2563EB', borderRadius: RADIUS.md, paddingVertical: 9,
  },
  ctaJoined: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  ctaText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  ctaJoinedText: { fontSize: 13, fontWeight: '700', color: '#059669' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#2563EB', borderRadius: RADIUS.lg,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
