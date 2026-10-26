import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { PurchaseOrder, POStatus } from '@/types/procurement';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:        { label: 'Draft',         color: '#6B7280', bg: '#F3F4F6' },
  SENT:         { label: 'Sent',          color: '#2563EB', bg: '#EFF6FF' },
  ACKNOWLEDGED: { label: 'Acknowledged',  color: '#059669', bg: '#ECFDF5' },
  FULFILLED:    { label: 'Fulfilled',     color: '#166534', bg: '#DCFCE7' },
  PARTIAL:      { label: 'Partial',       color: '#D97706', bg: '#FFFBEB' },
  CANCELLED:    { label: 'Cancelled',     color: '#DC2626', bg: '#FEF2F2' },
};

const STATUS_FILTERS: (POStatus | 'ALL')[] = ['ALL', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'FULFILLED', 'CANCELLED'];

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function dateFmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PurchaseOrders() {
  const router = useRouter();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<POStatus | 'ALL'>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: pos = [], isLoading, refetch } = useQuery({
    queryKey: ['procurement-pos', statusFilter],
    queryFn: () => procurementHubService.getPurchaseOrders(statusFilter === 'ALL' ? undefined : statusFilter),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      procurementHubService.updatePOStatus(id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-pos'] });
      qc.invalidateQueries({ queryKey: ['procurement-stats'] });
    },
    onError: () => Alert.alert('Error', 'Failed to update purchase order status.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleMarkReceived(po: PurchaseOrder) {
    Alert.alert(
      'Mark as Fulfilled',
      `Confirm goods receipt for PO ${po.poNumber} from ${po.supplierName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Receipt', onPress: () => updateMut.mutate({ id: po.id, status: 'FULFILLED' }) },
      ],
    );
  }

  const totalValue = pos.reduce((sum, po) => sum + po.grandTotal, 0);
  const activePos = pos.filter(p => ['SENT', 'ACKNOWLEDGED', 'PARTIAL'].includes(p.status));

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />}
    >
      {/* Summary strip */}
      <View style={s.summaryStrip}>
        <View style={s.summaryItem}>
          <Text style={s.summaryVal}>{pos.length}</Text>
          <Text style={s.summaryLabel}>Total POs</Text>
        </View>
        <View style={s.divider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryVal}>{activePos.length}</Text>
          <Text style={s.summaryLabel}>In Progress</Text>
        </View>
        <View style={s.divider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: '#2563EB' }]}>{fmt(totalValue)}</Text>
          <Text style={s.summaryLabel}>Total Value</Text>
        </View>
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterChips}
        style={{ marginBottom: 4 }}
      >
        {STATUS_FILTERS.map(st => {
          const cfg = st === 'ALL' ? { color: '#374151', bg: '#F1F5F9' } : (STATUS_CONFIG[st] || { color: '#6B7280', bg: '#F3F4F6' });
          const active = statusFilter === st;
          return (
            <TouchableOpacity
              key={st}
              style={[s.chip, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[s.chipText, active && { color: cfg.color, fontWeight: '700' }]}>
                {st === 'ALL' ? 'All' : STATUS_CONFIG[st]?.label || st}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* PO List */}
      {isLoading && <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />}

      {!isLoading && pos.length === 0 && (
        <View style={s.empty}>
          <Ionicons name="cube-outline" size={36} color="#93C5FD" />
          <Text style={s.emptyTitle}>No purchase orders</Text>
          <Text style={s.emptySub}>
            Award a supplier quote to generate a purchase order.
          </Text>
          <TouchableOpacity style={s.goBtn} onPress={() => router.push('/procurement' as any)}>
            <Text style={s.goBtnText}>Go to Procurement Hub</Text>
          </TouchableOpacity>
        </View>
      )}

      {pos.map(po => {
        const cfg = STATUS_CONFIG[po.status] || { label: po.status, color: '#6B7280', bg: '#F3F4F6' };
        const expanded = expandedId === po.id;
        const daysLeft = Math.max(0, Math.ceil((new Date(po.deliveryDeadline).getTime() - Date.now()) / 86400000));
        const overdue = daysLeft === 0 && !['FULFILLED', 'CANCELLED'].includes(po.status);

        return (
          <TouchableOpacity
            key={po.id}
            style={s.poCard}
            onPress={() => setExpandedId(expanded ? null : po.id)}
            activeOpacity={0.85}
          >
            {/* PO header */}
            <View style={s.poHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.poNum}>{po.poNumber}</Text>
                  {po.rfqNumber && (
                    <View style={s.rfqPill}>
                      <Text style={s.rfqPillText}>{po.rfqNumber}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.poSupplier} numberOfLines={1}>{po.supplierName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={s.poAmount}>{fmt(po.grandTotal)}</Text>
                <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                  <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
                  <Text style={[s.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            </View>

            {/* Delivery row */}
            <View style={s.deliveryRow}>
              <Ionicons name="calendar-outline" size={13} color={overdue ? '#DC2626' : COLORS.textMuted} />
              <Text style={[s.deliveryText, overdue && { color: '#DC2626', fontWeight: '700' }]}>
                Delivery by {dateFmt(po.deliveryDeadline)}
                {!['FULFILLED', 'CANCELLED'].includes(po.status) && ` · ${daysLeft}d ${overdue ? 'overdue' : 'left'}`}
              </Text>
            </View>

            {/* Expanded details */}
            {expanded && (
              <View style={s.expandedSection}>
                {/* Items breakdown */}
                <View style={s.itemsBox}>
                  <Text style={s.boxTitle}>Items</Text>
                  {po.items.map((item, idx) => (
                    <View key={idx} style={s.itemRow}>
                      <Text style={s.itemName} numberOfLines={1}>{item.productName}</Text>
                      <Text style={s.itemQty}>{item.quantity} {item.unit}</Text>
                      <Text style={s.itemPrice}>{fmt(item.totalPrice)}</Text>
                    </View>
                  ))}
                </View>

                {/* Totals */}
                <View style={s.totalsBox}>
                  <TotalRow label="Sub-total" value={fmt(po.subTotal)} />
                  <TotalRow label="GST" value={fmt(po.gstAmount)} />
                  <TotalRow label="Delivery" value={po.deliveryCharge === 0 ? 'Free' : fmt(po.deliveryCharge)} />
                  <View style={[s.totalRow, s.grandTotalRow]}>
                    <Text style={s.grandTotalLabel}>Grand Total</Text>
                    <Text style={s.grandTotalVal}>{fmt(po.grandTotal)}</Text>
                  </View>
                </View>

                <View style={s.poMeta}>
                  <Text style={s.poMetaText}>Payment: {po.paymentTerms}</Text>
                  <Text style={s.poMetaText}>Deliver to: {po.deliveryAddress}</Text>
                  {po.notes && <Text style={s.poMetaText}>Notes: {po.notes}</Text>}
                </View>

                {/* Actions */}
                {['SENT', 'ACKNOWLEDGED', 'PARTIAL'].includes(po.status) && (
                  <TouchableOpacity
                    style={s.receiveBtn}
                    onPress={() => handleMarkReceived(po)}
                    disabled={updateMut.isPending}
                  >
                    <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                    <Text style={s.receiveBtnText}>Mark Goods Received</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Expand caret */}
            <View style={s.caretRow}>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.totalRow}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={s.totalVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 12, paddingTop: 12, gap: 10 },
  summaryStrip: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: RADIUS.lg,
    paddingVertical: 14, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  divider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  filterChips: { paddingLeft: 0, gap: 6, paddingBottom: 2 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#fff', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  poCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  poHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  poNum: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  rfqPill: { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  rfqPillText: { fontSize: 9, fontWeight: '700', color: '#4F46E5' },
  poSupplier: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  poAmount: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '700' },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deliveryText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  expandedSection: { gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  itemsBox: { gap: 6 },
  boxTitle: { fontSize: 12, fontWeight: '800', color: '#374151' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontSize: 12, color: '#374151' },
  itemQty: { fontSize: 11, color: COLORS.textMuted, width: 64 },
  itemPrice: { fontSize: 12, fontWeight: '700', color: '#1E293B', width: 72, textAlign: 'right' },
  totalsBox: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10, gap: 6,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalRow: { paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  totalLabel: { fontSize: 12, color: COLORS.textMuted },
  totalVal: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  grandTotalLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  grandTotalVal: { fontSize: 16, fontWeight: '900', color: '#1E3A5F' },
  poMeta: { gap: 3 },
  poMetaText: { fontSize: 11, color: COLORS.textMuted },
  receiveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: RADIUS.md, padding: 11, ...SHADOWS.sm,
  },
  receiveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  caretRow: { alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', maxWidth: 260 },
  goBtn: {
    marginTop: 8, backgroundColor: '#EFF6FF', borderRadius: RADIUS.md,
    paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: '#BFDBFE',
  },
  goBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
});
