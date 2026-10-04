import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { vendorService } from '@/services/vendorService';
import type { VendorSettlement } from '@/types/vendor';

export default function VendorSettlementsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'ESCROW' | 'PAID'>('ALL');

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['vendor-settlements'],
    queryFn: () => vendorService.getSettlements('v1'),
  });

  const payoutMutation = useMutation({
    mutationFn: (id: string) => vendorService.requestSettlementPayout(id),
    onSuccess: (res) => {
      Alert.alert('Payout Requested', res.message);
      queryClient.invalidateQueries({ queryKey: ['vendor-settlements'] });
    },
    onError: () => {
      Alert.alert('Error', 'Unable to initiate payout request.');
    }
  });

  const filteredSettlements = settlements.filter(s => {
    if (filter === 'ESCROW') return s.payoutStatus === 'ESCROW_HOLD';
    if (filter === 'PAID') return s.payoutStatus === 'PAID';
    return true;
  });

  const totalGross = settlements.reduce((acc, s) => acc + s.grossSales, 0);
  const totalNet = settlements.reduce((acc, s) => acc + s.netPayoutAmount, 0);
  const inEscrow = settlements
    .filter(s => s.payoutStatus === 'ESCROW_HOLD')
    .reduce((acc, s) => acc + s.netPayoutAmount, 0);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading settlement ledger...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Settlements & Payouts', headerBackTitle: 'Dashboard' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* KPI Financial Overview */}
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Total Gross Sales</Text>
            <Text style={s.kpiValue}>₹{totalGross.toLocaleString()}</Text>
            <Text style={s.kpiSub}>Across all group deals</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: '#86EFAC' }]}>
            <Text style={s.kpiLabel}>In Escrow Hold</Text>
            <Text style={[s.kpiValue, { color: '#059669' }]}>₹{inEscrow.toLocaleString()}</Text>
            <Text style={s.kpiSub}>Releasing post pickup</Text>
          </View>
        </View>

        {/* Bank Account Info Card */}
        <View style={s.bankCard}>
          <View style={s.bankIconWrap}>
            <Ionicons name="business" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bankTitle}>HDFC Bank Primary Settlement A/C</Text>
            <Text style={s.bankSub}>Account ending in •••• 4821 (Verified ✓)</Text>
          </View>
          <View style={s.escrowBadge}>
            <Text style={s.escrowBadgeText}>Auto-Deposit</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={s.filterRow}>
          {(['ALL', 'ESCROW', 'PAID'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.filterChip, filter === tab && s.filterChipActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[s.filterChipText, filter === tab && s.filterChipTextActive]}>
                {tab === 'ALL' ? 'All Batches' : tab === 'ESCROW' ? 'Escrow Hold' : 'Settled & Paid'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settlements List */}
        <View style={s.listWrap}>
          {filteredSettlements.map(item => {
            const isEscrow = item.payoutStatus === 'ESCROW_HOLD';
            return (
              <View key={item.id} style={s.settlementCard}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dealTitle}>{item.dealTitle}</Text>
                    <Text style={s.batchRef}>Batch #{item.id} • {item.orderCount} Orders</Text>
                  </View>
                  <View style={[s.statusBadge, isEscrow ? s.statusEscrow : s.statusPaid]}>
                    <Text style={[s.statusBadgeText, isEscrow ? s.textEscrow : s.textPaid]}>
                      {isEscrow ? 'Escrow Hold' : 'Paid Out'}
                    </Text>
                  </View>
                </View>

                <View style={s.feeBreakdown}>
                  <View style={s.feeRow}>
                    <Text style={s.feeLabel}>Gross Sales:</Text>
                    <Text style={s.feeValue}>₹{item.grossSales.toLocaleString()}</Text>
                  </View>
                  <View style={s.feeRow}>
                    <Text style={s.feeLabel}>Platform Fee ({item.platformFeePct}%):</Text>
                    <Text style={[s.feeValue, { color: '#DC2626' }]}>- ₹{item.platformFeeAmount.toLocaleString()}</Text>
                  </View>
                  <View style={s.feeRow}>
                    <Text style={s.feeLabel}>TDS / Tax Deducted:</Text>
                    <Text style={[s.feeValue, { color: '#DC2626' }]}>- ₹{item.taxDeducted.toLocaleString()}</Text>
                  </View>
                  <View style={[s.feeRow, s.netRow]}>
                    <Text style={s.netLabel}>Net Vendor Payout:</Text>
                    <Text style={s.netValue}>₹{item.netPayoutAmount.toLocaleString()}</Text>
                  </View>
                </View>

                {isEscrow && (
                  <TouchableOpacity
                    style={s.payoutBtn}
                    onPress={() => payoutMutation.mutate(item.id)}
                    disabled={payoutMutation.isPending}
                  >
                    <Ionicons name="flash-outline" size={16} color="#fff" />
                    <Text style={s.payoutBtnText}>Request Payout to Bank</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
  kpiGrid: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  kpiValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  kpiSub: { fontSize: 10, color: COLORS.textMuted },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  bankIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  bankSub: { fontSize: 11, color: COLORS.textMuted },
  escrowBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  escrowBadgeText: { fontSize: 10, fontWeight: '800', color: '#166534' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff' },
  listWrap: { gap: 12 },
  settlementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dealTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  batchRef: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusEscrow: { backgroundColor: '#FEF3C7' },
  statusPaid: { backgroundColor: '#DCFCE7' },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  textEscrow: { color: '#92400E' },
  textPaid: { color: '#166534' },
  feeBreakdown: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 10, gap: 4 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { fontSize: 12, color: COLORS.textMuted },
  feeValue: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  netRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6, marginTop: 2 },
  netLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  netValue: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  payoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
  },
  payoutBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
