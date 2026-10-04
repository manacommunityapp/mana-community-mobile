import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  societyFinanceService,
  SocietyInvoiceDto,
  CreateSocietyInvoiceDto,
  InvoiceLineItem,
  InvoiceStatus,
} from '@/services/societyFinanceService';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: '#64748B',
  SENT: '#3B82F6',
  PAID: '#10B981',
  OVERDUE: '#EF4444',
  CANCELLED: '#94A3B8',
};

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function SocietyInvoicesScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SocietyInvoiceDto | null>(null);

  // Form State
  const [unitNumber, setUnitNumber] = useState('');
  const [residentName, setResidentName] = useState('');
  const [residentEmail, setResidentEmail] = useState('');
  const [residentPhone, setResidentPhone] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: 'Monthly Maintenance Fee', quantity: 1, rate: 4500, amount: 4500 },
    { description: 'Sinking Fund Contribution', quantity: 1, rate: 1000, amount: 1000 },
  ]);

  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['society-invoices', statusFilter],
    queryFn: () => societyFinanceService.getInvoices(statusFilter),
  });

  const createMutation = useMutation({
    mutationFn: societyFinanceService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['society-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['society-finance-dashboard'] });
      setCreateModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Society invoice has been generated and dispatched.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to create invoice.');
    },
  });

  const resetForm = () => {
    setUnitNumber('');
    setResidentName('');
    setResidentEmail('');
    setResidentPhone('');
    setLineItems([
      { description: 'Monthly Maintenance Fee', quantity: 1, rate: 4500, amount: 4500 },
      { description: 'Sinking Fund Contribution', quantity: 1, rate: 1000, amount: 1000 },
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleShareInvoice = async (inv: SocietyInvoiceDto) => {
    const summary = `🏢 *SOCIETY DEMAND NOTE*
Invoice: ${inv.invoiceNumber}
Unit: ${inv.unitNumber} (${inv.residentName})
Due Date: ${inv.dueDate}
Total Due: ${formatCurrency(inv.balanceDue)}
Status: ${inv.status}

Please pay through Mana Community App or Bank Transfer.`;
    try {
      await Share.share({ message: summary, title: inv.invoiceNumber });
    } catch {}
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { description: 'Additional Charge', quantity: 1, rate: 500, amount: 500 }]);
  };

  const updateLineItem = (index: number, desc: string, amt: number) => {
    setLineItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], description: desc, rate: amt, amount: amt };
      return next;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const formSubtotal = lineItems.reduce((s, it) => s + it.amount, 0);
  const formTax = Math.round(formSubtotal * 0.18);
  const formTotal = formSubtotal + formTax;

  const handleCreate = () => {
    if (!unitNumber.trim() || !residentName.trim()) {
      Alert.alert('Required Fields', 'Please enter Flat/Unit Number and Resident Name.');
      return;
    }
    if (lineItems.length === 0) {
      Alert.alert('Line Items', 'Please add at least one line item charge.');
      return;
    }

    createMutation.mutate({
      unitNumber: unitNumber.trim(),
      residentName: residentName.trim(),
      residentEmail: residentEmail.trim() || undefined,
      residentPhone: residentPhone.trim() || undefined,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
      lineItems,
    });
  };

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUnit = inv.unitNumber.toLowerCase().includes(q);
      const matchName = inv.residentName.toLowerCase().includes(q);
      const matchNo = inv.invoiceNumber.toLowerCase().includes(q);
      if (!matchUnit && !matchName && !matchNo) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ── Search & Filter Bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search flat number, resident, invoice #..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status Tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 6 }}>
        {['ALL', 'SENT', 'PAID', 'OVERDUE', 'DRAFT'].map(st => (
          <TouchableOpacity
            key={st}
            style={[styles.tabChip, statusFilter === st && styles.tabChipActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.tabChipText, statusFilter === st && styles.tabChipTextActive]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Invoice List ── */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptySub}>Change filter or create a new demand invoice.</Text>
          </View>
        ) : (
          filtered.map(inv => (
            <View key={inv.id} style={styles.invCard}>
              <View style={styles.invHeader}>
                <View>
                  <Text style={styles.unitTitle}>Flat {inv.unitNumber}</Text>
                  <Text style={styles.invNumber}>{inv.invoiceNumber} • Due {inv.dueDate}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[inv.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[inv.status] }]}>{inv.status}</Text>
                </View>
              </View>

              <View style={styles.invBody}>
                <Text style={styles.residentName}>👤 {inv.residentName}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.totalLabel}>Total: {formatCurrency(inv.totalAmount)}</Text>
                  <Text style={[styles.dueAmount, { color: inv.balanceDue > 0 ? '#EF4444' : '#10B981' }]}>
                    {inv.balanceDue > 0 ? `Due: ${formatCurrency(inv.balanceDue)}` : 'Settled'}
                  </Text>
                </View>
              </View>

              <View style={styles.invFooter}>
                <TouchableOpacity style={styles.viewBtn} onPress={() => setSelectedInvoice(inv)}>
                  <Ionicons name="eye-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.viewBtnText}>View Breakdown</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareBtn} onPress={() => handleShareInvoice(inv)}>
                  <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                  <Text style={styles.shareBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Create Invoice Modal ── */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Society Demand Invoice</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Flat / Unit Number</Text>
              <TextInput style={styles.input} placeholder="e.g. A-402" placeholderTextColor="#94A3B8" value={unitNumber} onChangeText={setUnitNumber} />

              <Text style={styles.inputLabel}>Resident Full Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Rajesh Sharma" placeholderTextColor="#94A3B8" value={residentName} onChangeText={setResidentName} />

              <Text style={styles.inputLabel}>Phone & Email (optional)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Phone Number" placeholderTextColor="#94A3B8" value={residentPhone} onChangeText={setResidentPhone} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Email Address" placeholderTextColor="#94A3B8" value={residentEmail} onChangeText={setResidentEmail} />
              </View>

              <Text style={styles.inputLabel}>Payment Due Date</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" value={dueDate} onChangeText={setDueDate} />

              {/* Line Items */}
              <View style={styles.lineItemHeaderRow}>
                <Text style={styles.inputLabel}>Charges & Line Items</Text>
                <TouchableOpacity onPress={addLineItem}>
                  <Text style={styles.addItemText}>+ Add Item</Text>
                </TouchableOpacity>
              </View>

              {lineItems.map((item, idx) => (
                <View key={idx} style={styles.lineItemRow}>
                  <TextInput
                    style={[styles.input, { flex: 2, marginBottom: 0 }]}
                    placeholder="Description"
                    placeholderTextColor="#94A3B8"
                    value={item.description}
                    onChangeText={v => updateLineItem(idx, v, item.amount)}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Amount"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={String(item.amount)}
                    onChangeText={v => updateLineItem(idx, item.description, parseFloat(v) || 0)}
                  />
                  {lineItems.length > 1 && (
                    <TouchableOpacity onPress={() => removeLineItem(idx)} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Invoice Total Summary */}
              <View style={styles.summaryBox}>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Subtotal</Text>
                  <Text style={styles.sumVal}>{formatCurrency(formSubtotal)}</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>GST (18%)</Text>
                  <Text style={styles.sumVal}>{formatCurrency(formTax)}</Text>
                </View>
                <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6, marginTop: 4 }]}>
                  <Text style={[styles.sumLabel, { fontWeight: 'bold' }]}>Grand Total</Text>
                  <Text style={[styles.sumVal, { fontWeight: 'bold', color: COLORS.primary }]}>{formatCurrency(formTotal)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Dispatch Invoice</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Invoice Detail Breakdown Modal ── */}
      <Modal visible={!!selectedInvoice} transparent animationType="fade" onRequestClose={() => setSelectedInvoice(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice #{selectedInvoice?.invoiceNumber}</Text>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1E293B' }}>Unit {selectedInvoice.unitNumber} - {selectedInvoice.residentName}</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Issued: {selectedInvoice.issueDate} • Due: {selectedInvoice.dueDate}</Text>

                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8 }}>Itemized Breakdown</Text>
                  {selectedInvoice.lineItems.map((it, i) => (
                    <View key={i} style={styles.sumRow}>
                      <Text style={styles.sumLabel}>{it.description}</Text>
                      <Text style={styles.sumVal}>{formatCurrency(it.amount)}</Text>
                    </View>
                  ))}
                  <View style={[styles.sumRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }]}>
                    <Text style={{ fontWeight: 'bold' }}>Total Demand</Text>
                    <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{formatCurrency(selectedInvoice.totalAmount)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchRow: { flexDirection: 'row', padding: SPACING.md, gap: 8, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: RADIUS.md,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  tabsBar: { maxHeight: 42 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabChipText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  tabChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  list: { padding: SPACING.md, paddingBottom: 60 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  invCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  unitTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  invNumber: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  invBody: { marginVertical: 10 },
  residentName: { fontSize: 13, color: '#475569' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  totalLabel: { fontSize: 12, color: '#64748B' },
  dueAmount: { fontSize: 14, fontWeight: 'bold' },
  invFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shareBtnText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: SPACING.sm, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: SPACING.xs,
  },
  lineItemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  addItemText: { fontSize: 12, color: COLORS.primary, fontWeight: 'bold' },
  lineItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  summaryBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: RADIUS.md, marginVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  sumLabel: { fontSize: 13, color: '#64748B' },
  sumVal: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
