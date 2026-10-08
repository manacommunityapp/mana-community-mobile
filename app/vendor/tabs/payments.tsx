import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import { vendorService, type VendorInvoice, type InvoiceStatus } from '@/services/vendorService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

const STATUS_META: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  DRAFT:   { label: 'Draft',   color: '#6B7280', bg: '#F3F4F6', icon: 'create-outline' },
  SENT:    { label: 'Sent',    color: '#2563EB', bg: '#DBEAFE', icon: 'send' },
  PAID:    { label: 'Paid',    color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' },
  OVERDUE: { label: 'Overdue', color: COLORS.error, bg: COLORS.errorLight, icon: 'alert-circle' },
};

const FILTER_STATUS: Record<FilterKey, InvoiceStatus | null> = {
  all: null, draft: 'DRAFT', sent: 'SENT', paid: 'PAID', overdue: 'OVERDUE',
};

export default function VendorPaymentsScreen() {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadInvoices = async () => {
    const data = await vendorService.getInvoices();
    setInvoices(data);
  };

  useEffect(() => { loadInvoices(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const filtered = filter === 'all'
    ? invoices
    : invoices.filter(i => i.status === FILTER_STATUS[filter]);

  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE').reduce((sum, i) => sum + i.amount, 0);

  const handleSendInvoice = (invoice: VendorInvoice) => {
    Alert.alert('Send Invoice', `Send ${invoice.invoiceNumber} to ${invoice.customerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          await vendorService.sendInvoice(invoice.id);
          await loadInvoices();
        },
      },
    ]);
  };

  const renderInvoice = ({ item }: { item: VendorInvoice }) => {
    const meta = STATUS_META[item.status];

    return (
      <View style={[s.card, item.status === 'OVERDUE' && s.cardOverdue]}>
        <View style={s.cardTop}>
          <View style={[s.invoiceIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={s.cardBody}>
            <View style={s.titleRow}>
              <Text style={s.invoiceNumber}>{item.invoiceNumber}</Text>
              <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            <Text style={s.customerText}>{item.customerName} · {item.flat}</Text>
            <Text style={s.serviceText}>{item.service}</Text>
            <View style={s.metaRow}>
              <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>Issued {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : 'N/A'}</Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={[s.metaText, item.status === 'OVERDUE' && { color: COLORS.error, fontWeight: '600' }]}>
                Due {item.dueDate}
              </Text>
            </View>
          </View>
          <Text style={s.amount}>₹{item.amount.toLocaleString()}</Text>
        </View>

        {item.paidAt && (
          <View style={s.paidRow}>
            <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
            <Text style={s.paidText}>Paid on {new Date(item.paidAt).toLocaleDateString()}</Text>
          </View>
        )}

        {item.status === 'DRAFT' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => handleSendInvoice(item)}>
              <Ionicons name="send" size={14} color="#fff" />
              <Text style={s.actionBtnTextLight}>Send Invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Payments</Text>
      </View>

      {/* Summary cards */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderLeftColor: COLORS.success }]}>
          <Text style={s.summaryLabel}>Received</Text>
          <Text style={[s.summaryValue, { color: COLORS.success }]}>₹{totalPaid.toLocaleString()}</Text>
        </View>
        <View style={[s.summaryCard, { borderLeftColor: VENDOR_COLORS.accent }]}>
          <Text style={s.summaryLabel}>Pending</Text>
          <Text style={[s.summaryValue, { color: VENDOR_COLORS.accent }]}>₹{totalPending.toLocaleString()}</Text>
        </View>
      </View>

      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderInvoice}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VENDOR_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No invoices</Text>
            <Text style={s.emptyDesc}>No invoices match this filter</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  summaryRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 4, ...SHADOWS.sm,
  },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  summaryValue: { fontSize: 20, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: VENDOR_COLORS.accent, borderColor: VENDOR_COLORS.accentDark },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardOverdue: { borderColor: COLORS.error, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  invoiceIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  invoiceNumber: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  statusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  customerText: { fontSize: 12, color: COLORS.textMuted },
  serviceText: { fontSize: 12, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  metaDot: { fontSize: 11, color: COLORS.textMuted, marginHorizontal: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  paidRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  paidText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  actions: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  actionBtnPrimary: { backgroundColor: VENDOR_COLORS.accent },
  actionBtnTextLight: { fontSize: 13, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
