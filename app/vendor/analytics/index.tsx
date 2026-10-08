import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { vendorService } from '@/services/vendorService';

export default function VendorCommerceAnalyticsScreen() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['vendor-commerce-analytics'],
    queryFn: () => vendorService.getCommerceAnalytics('v1'),
  });

  if (isLoading || !analytics) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading commerce analytics...</Text>
      </View>
    );
  }

  const maxRevenue = Math.max(...analytics.monthlyRevenueChart.map(m => m.revenue));

  return (
    <>
      <Stack.Screen options={{ title: 'Commerce Analytics', headerBackTitle: 'Dashboard' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* Top KPI row */}
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Gross Revenue</Text>
            <Text style={s.kpiValue}>₹{(analytics.totalGrossRevenue / 1000).toFixed(1)}k</Text>
            <Text style={s.kpiDelta}>+24% vs last mo</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Orders Fulfilled</Text>
            <Text style={s.kpiValue}>{analytics.totalOrdersFulfilled}</Text>
            <Text style={s.kpiDelta}>97.2% On-time</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Avg Order Value</Text>
            <Text style={s.kpiValue}>₹{analytics.averageOrderValue}</Text>
            <Text style={s.kpiDelta}>68% Repeat</Text>
          </View>
        </View>

        {/* Monthly Revenue Chart */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="bar-chart-outline" size={18} color={COLORS.primary} />
            <Text style={s.cardTitle}>Monthly Revenue Growth</Text>
          </View>
          <View style={s.chartContainer}>
            {analytics.monthlyRevenueChart.map(item => {
              const heightPct = Math.max(15, Math.round((item.revenue / maxRevenue) * 100));
              return (
                <View key={item.month} style={s.barCol}>
                  <Text style={s.barValue}>₹{(item.revenue / 1000).toFixed(0)}k</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { height: `${heightPct}%` }]} />
                  </View>
                  <Text style={s.barLabel}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Selling Wholesale SKUs */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="trophy-outline" size={18} color="#D97706" />
            <Text style={s.cardTitle}>Top Performing Deals</Text>
          </View>
          <View style={s.topProductsList}>
            {analytics.topProducts.map((p, idx) => (
              <View key={p.name} style={s.productRow}>
                <View style={s.rankBadge}>
                  <Text style={s.rankText}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.productName}>{p.name}</Text>
                  <Text style={s.productSub}>{p.unitsSold} units • {p.marginPct}% margin</Text>
                </View>
                <Text style={s.productRevenue}>₹{p.revenue.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="pie-chart-outline" size={18} color={COLORS.primary} />
            <Text style={s.cardTitle}>Category Sales Share</Text>
          </View>
          <View style={s.categoryList}>
            {analytics.categoryDistribution.map(cat => (
              <View key={cat.category} style={s.categoryRow}>
                <View style={{ flex: 1 }}>
                  <View style={s.catLabelRow}>
                    <Text style={s.catName}>{cat.category}</Text>
                    <Text style={s.catPct}>{cat.percentage}% ({cat.count} orders)</Text>
                  </View>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${cat.percentage}%` }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 12,
    gap: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  kpiValue: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  kpiDelta: { fontSize: 10, fontWeight: '700', color: '#059669' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    paddingTop: 16,
  },
  barCol: { alignItems: 'center', gap: 6, flex: 1 },
  barValue: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  barTrack: {
    width: 28,
    height: 90,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { backgroundColor: COLORS.primary, borderRadius: 6, width: '100%' },
  barLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  topProductsList: { gap: 10 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: { fontSize: 11, fontWeight: '900', color: '#B45309' },
  productName: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  productSub: { fontSize: 11, color: COLORS.textMuted },
  productRevenue: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  categoryList: { gap: 10 },
  categoryRow: { gap: 4 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  catPct: { fontSize: 11, color: COLORS.textMuted },
  progressTrack: { height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
});
