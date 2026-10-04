import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import { vendorService } from '@/services/vendorService';

export default function VendorDealsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: deals = [], isLoading, refetch } = useQuery({
    queryKey: ['vendor-deals'],
    queryFn: () => vendorService.getVendorActiveDeals('v1'),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Group Buy Deals</Text>
          <Text style={s.headerSub}>Manage wholesale campaigns & track volume unlock</Text>
        </View>
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => router.push('/vendor/deals/create' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={s.createBtnText}>New Deal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VENDOR_COLORS.accent} />}
      >
        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={VENDOR_COLORS.accent} /></View>
        ) : deals.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="pricetags-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No Active Deals</Text>
            <Text style={s.emptySub}>Create your first bulk group buying campaign for residential communities.</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push('/vendor/deals/create' as any)}
            >
              <Text style={s.emptyBtnText}>+ Launch New Deal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          deals.map((deal: any) => {
            const progress = Math.min(1, deal.committedQty / (deal.targetQty || 1));
            return (
              <View key={deal.id} style={s.dealCard}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dealTitle}>{deal.title}</Text>
                    <Text style={s.dealCategory}>{deal.category} ? {deal.pricingModel}</Text>
                  </View>
                  <View style={s.statusBadge}>
                    <Text style={s.statusText}>{deal.dealStatus}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={s.progressSection}>
                  <View style={s.progressHeader}>
                    <Text style={s.progressLabel}>
                      <Text style={s.bold}>{deal.committedQty}</Text> / {deal.targetQty} units ordered
                    </Text>
                    <Text style={s.progressPct}>{Math.round(progress * 100)}%</Text>
                  </View>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
                  </View>
                </View>

                {/* Metrics */}
                <View style={s.metricsRow}>
                  <View style={s.metricItem}>
                    <Text style={s.metricNum}>?{deal.currentTierPrice}</Text>
                    <Text style={s.metricLabel}>Current Price</Text>
                  </View>
                  <View style={s.metricDivider} />
                  <View style={s.metricItem}>
                    <Text style={s.metricNum}>{deal.currentParticipants}</Text>
                    <Text style={s.metricLabel}>Buyers</Text>
                  </View>
                  <View style={s.metricDivider} />
                  <View style={s.metricItem}>
                    <Text style={s.metricNum}>{deal.daysLeft}d</Text>
                    <Text style={s.metricLabel}>Remaining</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={s.manifestBtn}
                    onPress={() => router.push((`/vendor/deals/${deal.id}/manifest`) as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="clipboard-outline" size={16} color={VENDOR_COLORS.accent} />
                    <Text style={s.manifestBtnText}>Fulfillment Manifest</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.viewLiveBtn}
                    onPress={() => router.push((`/group-buying/deal/${deal.id}`) as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={s.viewLiveBtnText}>Customer View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: VENDOR_COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyBox: { alignItems: 'center', padding: 40, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { backgroundColor: VENDOR_COLORS.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.md, marginTop: 6 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  dealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dealTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  dealCategory: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#166534' },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary },
  bold: { fontWeight: '800', color: COLORS.text },
  progressPct: { fontSize: 12, fontWeight: '800', color: VENDOR_COLORS.accent },
  progressTrack: { height: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: VENDOR_COLORS.accent, borderRadius: RADIUS.full },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  metricItem: { alignItems: 'center', gap: 2 },
  metricNum: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  metricLabel: { fontSize: 11, color: COLORS.textMuted },
  metricDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  cardActions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  manifestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: VENDOR_COLORS.accentLight,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  manifestBtnText: { color: VENDOR_COLORS.accent, fontWeight: '700', fontSize: 13 },
  viewLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewLiveBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
});
