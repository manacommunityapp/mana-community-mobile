import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  paymentService,
  type CashfreeOrderResponse,
  type AdminSummaryResponse,
} from '@/services/paymentService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import { format } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  PAID:           { label: 'Paid',           bg: '#ECFDF5', color: '#059669' },
  CREATED:        { label: 'Pending',        bg: '#EEF2FF', color: '#4F46E5' },
  FAILED:         { label: 'Failed',         bg: '#FEF2F2', color: '#DC2626' },
  EXPIRED:        { label: 'Expired',        bg: '#F1F5F9', color: '#64748B' },
  REFUNDED:       { label: 'Refunded',       bg: '#FFF7ED', color: '#EA580C' },
  REFUND_PENDING: { label: 'Refund Pending', bg: '#FFF7ED', color: '#EA580C' },
  PENDING:        { label: 'Pending',        bg: '#EEF2FF', color: '#4F46E5' },
};

const STATUSES   = ['', 'PAID', 'FAILED', 'CREATED', 'PENDING', 'EXPIRED', 'REFUNDED', 'REFUND_PENDING'];
const REF_TYPES  = ['', 'SPORTS_REGISTRATION', 'EXPERIENCES_BOOKING', 'PROCUREMENT_ORDER'];
const REF_LABELS: Record<string, string> = {
  '': 'All Types',
  SPORTS_REGISTRATION: 'Sports',
  EXPERIENCES_BOOKING: 'Experiences',
  PROCUREMENT_ORDER:   'Procurement',
};

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
}

function StatCard({ label, value, icon, bg, color }: StatCardProps) {
  return (
    <View style={[s.statCard, { flex: 1 }]}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Refund modal ──────────────────────────────────────────────────────────────

interface RefundModalProps {
  order: CashfreeOrderResponse;
  loading: boolean;
  onClose: () => void;
  onConfirm: (amount: number, reason: string) => void;
}

function RefundModal({ order, loading, onClose, onConfirm }: RefundModalProps) {
  const [amount, setAmount] = useState(String(order.amount));
  const [reason, setReason] = useState('');

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Initiate Refund</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={s.modalBody}>
            <Text style={s.fieldLabel}>Order</Text>
            <Text style={s.monoText}>{order.manaOrderId}</Text>

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Refund Amount (₹)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={s.input}
              placeholderTextColor="#94A3B8"
            />

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Reason</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for refund…"
              multiline
              numberOfLines={3}
              style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={s.modalFooter}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, (loading || !amount) && { opacity: 0.5 }]}
              onPress={() => onConfirm(Number(amount), reason)}
              disabled={loading || !amount || Number(amount) <= 0}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.confirmBtnText}>Confirm</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Order row ─────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  onRefund,
}: {
  order: CashfreeOrderResponse;
  onRefund: (o: CashfreeOrderResponse) => void;
}) {
  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG['EXPIRED'];
  return (
    <View style={s.row}>
      <View style={s.rowTop}>
        <Text style={s.rowId} numberOfLines={1}>{order.manaOrderId}</Text>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <View style={s.rowMid}>
        <Text style={s.rowAmount}>{fmt(order.amount)}</Text>
        <Text style={s.rowMeta}>{order.referenceType?.replace(/_/g, ' ')} · #{order.referenceId}</Text>
      </View>
      <View style={s.rowBottom}>
        <Text style={s.rowDate}>
          {format(new Date(order.createdAt), 'd MMM yyyy, HH:mm')}
        </Text>
        {order.status === 'PAID' && (
          <TouchableOpacity style={s.refundBtn} onPress={() => onRefund(order)}>
            <Ionicons name="return-down-back-outline" size={12} color="#EA580C" />
            <Text style={s.refundBtnText}>Refund</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AdminPaymentReportScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [statusFilter,  setStatusFilter]  = useState('');
  const [refTypeFilter, setRefTypeFilter] = useState('');
  const [page,          setPage]          = useState(0);
  const [refundTarget,  setRefundTarget]  = useState<CashfreeOrderResponse | null>(null);

  const { data: summary } = useQuery<AdminSummaryResponse>({
    queryKey: ['payments', 'admin', 'summary'],
    queryFn:  () => paymentService.getAdminSummary(),
  });

  const { data: report, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['payments', 'admin', 'report', statusFilter, refTypeFilter, page],
    queryFn:  () => paymentService.getAdminReport({
      status:  statusFilter  || undefined,
      refType: refTypeFilter || undefined,
      page,
      size: 20,
    }),
  });

  const refundMut = useMutation({
    mutationFn: ({ orderId, amount, reason }: { orderId: string; amount: number; reason: string }) =>
      paymentService.adminInitiateRefund(orderId, amount, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', 'admin'] });
      setRefundTarget(null);
      Alert.alert('Refund initiated', 'The refund is being processed.');
    },
    onError: () => Alert.alert('Error', 'Failed to initiate refund. Please try again.'),
  });

  const orders      = report?.content ?? [];
  const totalPages  = report?.totalPages ?? 1;
  const totalItems  = report?.totalElements ?? 0;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Payment Reports</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={o => String(o.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={() => (
          <>
            {/* Summary cards */}
            {summary && (
              <View style={s.statsRow}>
                <StatCard
                  label="Collected"
                  value={fmt(summary.totalCollected)}
                  icon="trending-up-outline"
                  bg="#ECFDF5"
                  color="#059669"
                />
                <View style={{ width: 10 }} />
                <StatCard
                  label="Refunded"
                  value={fmt(summary.totalRefunded)}
                  icon="trending-down-outline"
                  bg="#FFF7ED"
                  color="#EA580C"
                />
                <View style={{ width: 10 }} />
                <StatCard
                  label="Paid Orders"
                  value={String(summary.countByStatus?.['PAID'] ?? 0)}
                  icon="card-outline"
                  bg="#EEF2FF"
                  color="#4F46E5"
                />
              </View>
            )}

            {/* Filter chips */}
            <Text style={s.filterHeading}>Filter by Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
              {STATUSES.map(s2 => (
                <TouchableOpacity
                  key={s2 || 'all'}
                  style={[s.chip, statusFilter === s2 && s.chipActive]}
                  onPress={() => { setStatusFilter(s2); setPage(0); }}
                >
                  <Text style={[s.chipText, statusFilter === s2 && s.chipTextActive]}>
                    {s2 || 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.filterHeading}>Filter by Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chips, { marginBottom: 12 }]}>
              {REF_TYPES.map(t => (
                <TouchableOpacity
                  key={t || 'all'}
                  style={[s.chip, refTypeFilter === t && s.chipActive]}
                  onPress={() => { setRefTypeFilter(t); setPage(0); }}
                >
                  <Text style={[s.chipText, refTypeFilter === t && s.chipTextActive]}>
                    {REF_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.resultCount}>{totalItems} transaction{totalItems !== 1 ? 's' : ''}</Text>

            {isLoading && <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.primary} />}
          </>
        )}
        renderItem={({ item }) => (
          <OrderRow order={item} onRefund={setRefundTarget} />
        )}
        ListEmptyComponent={!isLoading ? (
          <Text style={s.empty}>No transactions found</Text>
        ) : null}
        ListFooterComponent={totalPages > 1 ? (
          <View style={s.pagination}>
            <TouchableOpacity
              style={[s.pageBtn, page === 0 && s.pageBtnDisabled]}
              onPress={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <Ionicons name="chevron-back" size={18} color={page === 0 ? '#CBD5E1' : COLORS.primary} />
            </TouchableOpacity>
            <Text style={s.pageLabel}>Page {page + 1} of {totalPages}</Text>
            <TouchableOpacity
              style={[s.pageBtn, page >= totalPages - 1 && s.pageBtnDisabled]}
              onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? '#CBD5E1' : COLORS.primary} />
            </TouchableOpacity>
          </View>
        ) : null}
      />

      {refundTarget && (
        <RefundModal
          order={refundTarget}
          loading={refundMut.isPending}
          onClose={() => setRefundTarget(null)}
          onConfirm={(amount, reason) =>
            refundMut.mutate({ orderId: refundTarget.manaOrderId, amount, reason })
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F8FAFC' },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn:    { marginRight: 12 },
  headerTitle:{ ...FONTS.h2, flex: 1 },

  statsRow:   { flexDirection: 'row', marginHorizontal: 16, marginTop: 16 },
  statCard:   { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14, alignItems: 'center', ...SHADOWS.sm },
  statIcon:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue:  { ...FONTS.h3, fontSize: 16 },
  statLabel:  { ...FONTS.caption, marginTop: 2, textAlign: 'center' },

  filterHeading: { ...FONTS.caption, marginTop: 16, marginBottom: 6, marginHorizontal: 16, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  chips:      { paddingHorizontal: 16 },
  chip:       { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:   { ...FONTS.caption, color: '#64748B' },
  chipTextActive: { color: '#fff' },

  resultCount:{ ...FONTS.caption, marginHorizontal: 16, marginBottom: 4, color: '#94A3B8' },
  empty:      { textAlign: 'center', color: '#94A3B8', marginTop: 40, ...FONTS.body },

  row:        { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm },
  rowTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  rowId:      { ...FONTS.caption, fontFamily: 'monospace', color: '#64748B', flex: 1, marginRight: 8 },
  badge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText:  { fontSize: 11, fontWeight: '600' },
  rowMid:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  rowAmount:  { ...FONTS.h3, fontSize: 16 },
  rowMeta:    { ...FONTS.caption, color: '#94A3B8' },
  rowBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowDate:    { ...FONTS.caption, color: '#94A3B8' },
  refundBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  refundBtnText: { fontSize: 11, fontWeight: '600', color: '#EA580C' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageBtn:    { padding: 8, borderRadius: 8, backgroundColor: '#fff', ...SHADOWS.sm },
  pageBtnDisabled: { opacity: 0.4 },
  pageLabel:  { ...FONTS.body, color: '#64748B' },

  // Refund modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle:   { ...FONTS.h2 },
  modalBody:    { padding: 20 },
  modalFooter:  { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 8 },
  fieldLabel:   { ...FONTS.caption, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  monoText:     { fontFamily: 'monospace', fontSize: 13, color: '#1E293B' },
  input:        { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  cancelBtn:    { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText:{ ...FONTS.body, color: '#64748B' },
  confirmBtn:   { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText:{ ...FONTS.body, color: '#fff', fontWeight: '600' },
});
