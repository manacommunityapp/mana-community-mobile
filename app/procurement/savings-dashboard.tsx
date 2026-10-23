import React, { useState } from 'react';
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
import type { SavingsDashboard, CategorySavings, SavingsEvent } from '@/types/procurement';

const CATEGORY_EMOJI: Record<string, string> = {
  CLEANING_SUPPLIES: '🧹', ELECTRICAL: '⚡', PLUMBING: '🔧',
  OFFICE_SUPPLIES: '📎', GARDENING: '🌿', SECURITY_EQUIPMENT: '🔒',
  FURNITURE: '🪑', IT_EQUIPMENT: '💻', FOOD_BEVERAGE: '🍽️',
  MAINTENANCE: '🔨', PACKAGING: '📦', OTHER: '🏷️',
};

function fmt(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function SavingsDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'categories'>('overview');

  const { data, isLoading, refetch } = useQuery<SavingsDashboard>({
    queryKey: ['savings-dashboard'],
    queryFn: procurementHubService.getSavingsDashboard,
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={['#14532D', '#16A34A']} style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>💰 Savings Dashboard</Text>
            <Text style={s.headerSub}>Competitive procurement savings tracker</Text>
          </View>
          <TouchableOpacity
            style={s.rfqBtn}
            onPress={() => router.push('/procurement/rfq/new' as any)}
          >
            <Ionicons name="add" size={16} color="#16A34A" />
            <Text style={s.rfqBtnText}>New RFQ</Text>
          </TouchableOpacity>
        </View>

        {data && (
          <View style={s.heroRow}>
            <View style={s.heroBox}>
              <Text style={s.heroVal}>{fmt(data.totalSavings)}</Text>
              <Text style={s.heroLabel}>Total Savings</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroBox}>
              <Text style={s.heroVal}>{data.savingsRate.toFixed(1)}%</Text>
              <Text style={s.heroLabel}>Savings Rate</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroBox}>
              <Text style={s.heroVal}>{fmt(data.totalSpend)}</Text>
              <Text style={s.heroLabel}>Total Spend</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Quick stats */}
      {data && (
        <View style={s.quickRow}>
          <QuickStat icon="trophy-outline" val={String(data.awardedRFQs)} label="Awarded RFQs" color="#16A34A" />
          <QuickStat icon="people-outline" val={String(data.competitiveBids)} label="Competitive Bids" color="#2563EB" />
          <QuickStat icon="ribbon-outline" val={data.categorySavings.length > 0 ? data.categorySavings[0].category.replace(/_/g,' ') : '—'} label="Top Category" color="#7C3AED" />
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabs}>
        {(['overview', 'events', 'categories'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, activeTab === t && s.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
              {t === 'overview' ? '📊 Overview' : t === 'events' ? '📋 Top Deals' : '🏷️ By Category'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />}
      >
        {isLoading && <ActivityIndicator color="#16A34A" style={{ marginTop: 32 }} />}

        {!isLoading && data && data.awardedRFQs === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💸</Text>
            <Text style={s.emptyTitle}>No savings data yet</Text>
            <Text style={s.emptySub}>Savings appear once you award quotes from competitive RFQs</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push('/procurement/rfq/new' as any)}
            >
              <Text style={s.emptyBtnText}>Create Your First RFQ</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && data.awardedRFQs > 0 && (
          <>
            {activeTab === 'overview' && <OverviewTab data={data} />}
            {activeTab === 'events' && <EventsTab events={data.topSavingsEvents} />}
            {activeTab === 'categories' && <CategoriesTab categories={data.categorySavings} totalSavings={data.totalSavings} />}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-tabs ──────────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: SavingsDashboard }) {
  const maxSavings = Math.max(...data.categorySavings.map(c => c.savings), 1);

  return (
    <View style={ov.root}>
      {/* Savings rate gauge */}
      <View style={ov.card}>
        <Text style={ov.cardTitle}>Savings Rate Progress</Text>
        <View style={ov.gaugeRow}>
          <Text style={ov.gaugeLabel}>0%</Text>
          <View style={ov.gaugeTrack}>
            <View style={[ov.gaugeFill, {
              width: `${Math.min(data.savingsRate, 100)}%`,
              backgroundColor: data.savingsRate >= 15 ? '#16A34A' : data.savingsRate >= 8 ? '#D97706' : '#DC2626',
            }]} />
          </View>
          <Text style={ov.gaugeLabel}>20%</Text>
        </View>
        <Text style={ov.gaugeValue}>{data.savingsRate.toFixed(1)}% average savings across {data.awardedRFQs} RFQs</Text>
      </View>

      {/* Category mini-bars */}
      {data.categorySavings.length > 0 && (
        <View style={ov.card}>
          <Text style={ov.cardTitle}>Savings by Category</Text>
          {data.categorySavings.slice(0, 6).map(c => (
            <View key={c.category} style={ov.barRow}>
              <Text style={ov.barEmoji}>{CATEGORY_EMOJI[c.category] || '📋'}</Text>
              <Text style={ov.barLabel} numberOfLines={1}>{c.category.replace(/_/g, ' ')}</Text>
              <View style={ov.barTrack}>
                <View style={[ov.barFill, { width: `${(c.savings / maxSavings) * 100}%` }]} />
              </View>
              <Text style={ov.barVal}>{fmt(c.savings)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Best deal highlight */}
      {data.topSavingsEvents.length > 0 && (
        <View style={ov.card}>
          <Text style={ov.cardTitle}>🏆 Best Deal</Text>
          <BestDealCard event={data.topSavingsEvents[0]} />
        </View>
      )}
    </View>
  );
}

function EventsTab({ events }: { events: SavingsEvent[] }) {
  if (events.length === 0) return (
    <View style={ev.empty}>
      <Text style={ev.emptyText}>No savings events yet</Text>
    </View>
  );
  return (
    <View style={ev.root}>
      {events.map(e => (
        <View key={e.rfqId} style={ev.card}>
          <View style={ev.top}>
            <View style={ev.rfqBadge}>
              <Text style={ev.rfqNum}>{e.rfqNumber}</Text>
            </View>
            {e.savings > 0 && (
              <View style={ev.savingsBadge}>
                <Ionicons name="trending-down" size={11} color="#16A34A" />
                <Text style={ev.savingsText}>Saved {fmt(e.savings)}</Text>
              </View>
            )}
          </View>
          <Text style={ev.title} numberOfLines={2}>{e.title}</Text>
          <View style={ev.metaRow}>
            <MetaItem icon="people-outline" val={`${e.quoteCount} quotes`} />
            <MetaItem icon="checkmark-circle-outline" val={e.winningSupplier} />
            <MetaItem icon="cash-outline" val={fmt(e.awardedAmount)} accent />
          </View>
          {e.estimatedValue && e.estimatedValue > e.awardedAmount && (
            <View style={ev.vsRow}>
              <Text style={ev.vsLabel}>Budget</Text>
              <Text style={ev.vsBudget}>{fmt(e.estimatedValue)}</Text>
              <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
              <Text style={ev.vsAward}>{fmt(e.awardedAmount)}</Text>
              <View style={ev.vsChip}>
                <Text style={ev.vsChipText}>-{Math.round((1 - e.awardedAmount / e.estimatedValue) * 100)}%</Text>
              </View>
            </View>
          )}
          <Text style={ev.date}>{fmtDate(e.createdAt)}</Text>
        </View>
      ))}
    </View>
  );
}

function CategoriesTab({ categories, totalSavings }: { categories: CategorySavings[]; totalSavings: number }) {
  if (categories.length === 0) return (
    <View style={ca.empty}><Text style={ca.emptyText}>No category data yet</Text></View>
  );
  return (
    <View style={ca.root}>
      {categories.map((c, i) => {
        const pct = totalSavings > 0 ? Math.round((c.savings / totalSavings) * 100) : 0;
        return (
          <View key={c.category} style={ca.card}>
            <View style={ca.rankCircle}>
              <Text style={ca.rankText}>#{i + 1}</Text>
            </View>
            <Text style={ca.emoji}>{CATEGORY_EMOJI[c.category] || '📋'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ca.catLabel}>{c.category.replace(/_/g, ' ')}</Text>
              <View style={ca.barTrack}>
                <View style={[ca.barFill, { width: `${pct}%` }]} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={ca.savingsVal}>{fmt(c.savings)}</Text>
              <Text style={ca.pct}>{pct}% of savings</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function QuickStat({ icon, val, label, color }: { icon: string; val: string; label: string; color: string }) {
  return (
    <View style={s.quickStat}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[s.quickVal, { color }]} numberOfLines={1}>{val}</Text>
      <Text style={s.quickLabel}>{label}</Text>
    </View>
  );
}

function BestDealCard({ event: e }: { event: SavingsEvent }) {
  return (
    <View style={ov.bestDeal}>
      <Text style={ov.bestTitle} numberOfLines={1}>{e.title}</Text>
      <Text style={ov.bestSupplier}>{e.winningSupplier} · {e.quoteCount} bids</Text>
      <View style={ov.bestSavingsRow}>
        <View style={ov.bestSavingsBadge}>
          <Text style={ov.bestSavingsText}>Saved {fmt(e.savings)}</Text>
        </View>
        <Text style={ov.bestDate}>{fmtDate(e.createdAt)}</Text>
      </View>
    </View>
  );
}

function MetaItem({ icon, val, accent }: { icon: string; val: string; accent?: boolean }) {
  return (
    <View style={ev.metaItem}>
      <Ionicons name={icon as any} size={11} color={accent ? '#16A34A' : '#94A3B8'} />
      <Text style={[ev.metaVal, accent && { color: '#16A34A', fontWeight: '700' }]} numberOfLines={1}>{val}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { padding: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  rfqBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7,
  },
  rfqBtnText: { fontSize: 13, fontWeight: '800', color: '#16A34A' },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroBox: { flex: 1, alignItems: 'center' },
  heroDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroVal: { fontSize: 22, fontWeight: '900', color: '#fff' },
  heroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },
  quickRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  quickStat: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  quickVal: { fontSize: 13, fontWeight: '800' },
  quickLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#16A34A' },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#16A34A', fontWeight: '800' },
  content: { padding: 12, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#16A34A', borderRadius: RADIUS.md,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const ov = StyleSheet.create({
  root: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gaugeLabel: { fontSize: 10, color: COLORS.textMuted, width: 24 },
  gaugeTrack: { flex: 1, height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 5 },
  gaugeValue: { fontSize: 11, color: COLORS.textMuted },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barEmoji: { fontSize: 14, width: 20 },
  barLabel: { fontSize: 11, color: '#334155', width: 80 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },
  barVal: { fontSize: 11, fontWeight: '700', color: '#16A34A', width: 44, textAlign: 'right' },
  bestDeal: { gap: 6 },
  bestTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  bestSupplier: { fontSize: 12, color: COLORS.textMuted },
  bestSavingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bestSavingsBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  bestSavingsText: { fontSize: 13, fontWeight: '800', color: '#16A34A' },
  bestDate: { fontSize: 11, color: COLORS.textMuted },
});

const ev = StyleSheet.create({
  root: { gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12, gap: 8, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rfqBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rfqNum: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  savingsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  savingsText: { fontSize: 10, fontWeight: '800', color: '#16A34A' },
  title: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  metaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaVal: { fontSize: 11, color: '#64748B' },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 6 },
  vsLabel: { fontSize: 10, color: COLORS.textMuted },
  vsBudget: { fontSize: 12, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  vsAward: { fontSize: 12, fontWeight: '800', color: '#16A34A' },
  vsChip: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  vsChipText: { fontSize: 10, fontWeight: '800', color: '#16A34A' },
  date: { fontSize: 10, color: COLORS.textMuted },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});

const ca = StyleSheet.create({
  root: { gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  rankCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 10, fontWeight: '900', color: '#16A34A' },
  emoji: { fontSize: 20 },
  catLabel: { fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  barTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 3 },
  savingsVal: { fontSize: 14, fontWeight: '900', color: '#16A34A' },
  pct: { fontSize: 10, color: COLORS.textMuted },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});
