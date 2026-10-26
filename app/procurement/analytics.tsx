import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { ProcurementAnalytics, CategorySpend, SupplierSpend } from '@/types/procurement';

const CATEGORY_LABELS: Record<string, string> = {
  CLEANING_SUPPLIES: 'Cleaning',
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  OFFICE_SUPPLIES: 'Office',
  GARDENING: 'Gardening',
  SECURITY_EQUIPMENT: 'Security',
  FURNITURE: 'Furniture',
  IT_EQUIPMENT: 'IT',
  FOOD_BEVERAGE: 'Food & Bev',
  MAINTENANCE: 'Maintenance',
  PACKAGING: 'Packaging',
  OTHER: 'Other',
};

const CATEGORY_COLORS = [
  '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626',
  '#0284C7', '#16A34A', '#EA580C', '#6366F1', '#374151',
];

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <View style={[s.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

function CategoryBar({ item, maxSpend, colorIdx }: { item: CategorySpend; maxSpend: number; colorIdx: number }) {
  const pct = maxSpend > 0 ? Math.max(4, (item.spend / maxSpend) * 100) : 4;
  const color = CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length];
  const label = CATEGORY_LABELS[item.category] ?? item.category;

  return (
    <View style={s.barRow}>
      <Text style={s.barLabel} numberOfLines={1}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <View style={s.barRight}>
        <Text style={s.barValue}>{fmt(item.spend)}</Text>
        <Text style={s.barCount}>{item.poCount} PO{item.poCount !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

export default function ProcurementAnalyticsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: analytics, isLoading, refetch } = useQuery<ProcurementAnalytics>({
    queryKey: ['procurement-analytics'],
    queryFn: () => procurementHubService.getProcurementAnalytics(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  const data = analytics ?? {
    totalSpend: 0, totalSavings: 0, savingsRate: 0,
    categorySpend: [], topSuppliers: [],
    totalRFQs: 0, awardedRFQs: 0, avgQuotesPerRFQ: 0, pendingPOValue: 0,
  };

  const maxCatSpend = Math.max(...data.categorySpend.map(c => c.spend), 1);
  const maxSupplierSpend = Math.max(...data.topSuppliers.map(s => s.spend), 1);
  const awardRate = data.totalRFQs > 0
    ? Math.round((data.awardedRFQs / data.totalRFQs) * 100)
    : 0;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={['#0F2744', '#1E3A5F', '#2563EB']} style={s.header}>
        <Text style={s.headerTitle}>Procurement Analytics</Text>
        <Text style={s.headerSub}>Financial overview & savings tracker</Text>
      </LinearGradient>

      {/* Key Stats */}
      <View style={s.statsGrid}>
        <StatCard
          label="Total Spend"
          value={fmt(data.totalSpend)}
          sub="Fulfilled POs"
          color="#2563EB"
        />
        <StatCard
          label="Total Savings"
          value={fmt(data.totalSavings)}
          sub={`${data.savingsRate.toFixed(1)}% vs estimate`}
          color="#059669"
        />
        <StatCard
          label="Pending POs"
          value={fmt(data.pendingPOValue)}
          sub="Awaiting delivery"
          color="#D97706"
        />
        <StatCard
          label="Award Rate"
          value={`${awardRate}%`}
          sub={`${data.awardedRFQs}/${data.totalRFQs} RFQs`}
          color="#7C3AED"
        />
      </View>

      {/* Savings highlight */}
      {data.totalSavings > 0 && (
        <View style={s.savingsCard}>
          <View style={s.savingsLeft}>
            <Text style={s.savingsEmoji}>💰</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.savingsTitle}>Great savings achieved!</Text>
            <Text style={s.savingsText}>
              You've saved {fmt(data.totalSavings)} ({data.savingsRate.toFixed(1)}%) through competitive
              RFQ bidding compared to your initial estimates.
            </Text>
          </View>
        </View>
      )}

      {/* Spend by Category */}
      {data.categorySpend.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Spend by Category</Text>
          <View style={s.sectionCard}>
            {data.categorySpend.map((item, idx) => (
              <CategoryBar key={item.category} item={item} maxSpend={maxCatSpend} colorIdx={idx} />
            ))}
          </View>
        </View>
      )}

      {/* Top Suppliers */}
      {data.topSuppliers.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top Suppliers</Text>
          <View style={s.sectionCard}>
            {data.topSuppliers.map((supp: SupplierSpend, idx) => (
              <View key={supp.supplierId} style={[s.supplierRow, idx > 0 && s.supplierRowBorder]}>
                <View style={s.supplierRank}>
                  <Text style={s.supplierRankText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.supplierName}>{supp.supplierName}</Text>
                  <Text style={s.supplierPOs}>{supp.poCount} purchase order{supp.poCount !== 1 ? 's' : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.supplierSpend}>{fmt(supp.spend)}</Text>
                  <View style={s.supplierBar}>
                    <View style={[
                      s.supplierBarFill,
                      {
                        width: `${Math.max(8, (supp.spend / maxSupplierSpend) * 100)}%`,
                        backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                      },
                    ]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* RFQ Performance */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>RFQ Performance</Text>
        <View style={s.perfGrid}>
          <View style={s.perfCard}>
            <Text style={s.perfValue}>{data.totalRFQs}</Text>
            <Text style={s.perfLabel}>Total RFQs</Text>
          </View>
          <View style={s.perfCard}>
            <Text style={s.perfValue}>{data.awardedRFQs}</Text>
            <Text style={s.perfLabel}>Awarded</Text>
          </View>
          <View style={s.perfCard}>
            <Text style={s.perfValue}>{data.avgQuotesPerRFQ.toFixed(1)}</Text>
            <Text style={s.perfLabel}>Avg Quotes</Text>
          </View>
          <View style={s.perfCard}>
            <Text style={s.perfValue}>{awardRate}%</Text>
            <Text style={s.perfLabel}>Award Rate</Text>
          </View>
        </View>
      </View>

      {/* Tips */}
      <View style={s.tipsCard}>
        <Text style={s.tipsTitle}>💡 Savings Tips</Text>
        {[
          'Invite 3+ suppliers per RFQ for best competitive pricing',
          'Set realistic estimated values to track savings accurately',
          'Use templates for recurring purchases to save time',
          'Review supplier performance ratings before awarding',
        ].map((tip, i) => (
          <View key={i} style={s.tipRow}>
            <Text style={s.tipDot}>•</Text>
            <Text style={s.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={s.actionsRow}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => router.push('/procurement/rfq/new' as any)}
        >
          <Ionicons name="document-text-outline" size={18} color="#2563EB" />
          <Text style={s.actionBtnText}>New RFQ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => router.push('/procurement/purchase-orders' as any)}
        >
          <Ionicons name="cube-outline" size={18} color="#7C3AED" />
          <Text style={s.actionBtnText}>View POs</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 24, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#93C5FD' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16,
  },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    ...SHADOWS.sm,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  statSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  savingsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#D1FAE5', borderRadius: 14, padding: 14,
    marginHorizontal: 16, marginBottom: 4,
  },
  savingsLeft: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  savingsEmoji: { fontSize: 22 },
  savingsTitle: { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 2 },
  savingsText: { fontSize: 12, color: '#047857', lineHeight: 18 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10, marginTop: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  barLabel: { width: 70, fontSize: 12, color: '#374151', fontWeight: '500' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barRight: { width: 60, alignItems: 'flex-end' },
  barValue: { fontSize: 12, fontWeight: '700', color: '#111827' },
  barCount: { fontSize: 10, color: '#9CA3AF' },
  supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  supplierRowBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  supplierRank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  supplierRankText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  supplierName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  supplierPOs: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  supplierSpend: { fontSize: 13, fontWeight: '700', color: '#111827' },
  supplierBar: { width: 60, height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  supplierBarFill: { height: 4, borderRadius: 2 },
  perfGrid: { flexDirection: 'row', gap: 10 },
  perfCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', ...SHADOWS.sm,
  },
  perfValue: { fontSize: 22, fontWeight: '800', color: '#1E3A5F' },
  perfLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  tipsCard: {
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  tipRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  tipDot: { fontSize: 12, color: '#D97706' },
  tipText: { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18 },
  actionsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB', ...SHADOWS.sm,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
