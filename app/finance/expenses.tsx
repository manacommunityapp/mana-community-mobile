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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  societyFinanceService,
  SocietyExpenseDto,
  ApprovalStatus,
} from '@/services/societyFinanceService';

const STATUS_BADGES: Record<ApprovalStatus, { bg: string; text: string; label: string }> = {
  PENDING_MAKER: { bg: '#FEF3C7', text: '#D97706', label: 'Draft' },
  PENDING_CHECKER: { bg: '#FEF3C7', text: '#D97706', label: '1. Checker Review' },
  PENDING_APPROVER: { bg: '#E0E7FF', text: '#4338CA', label: '2. Treasurer Approval' },
  APPROVED: { bg: '#DCFCE7', text: '#15803D', label: '3. Approved' },
  REJECTED: { bg: '#FEE2E2', text: '#B91C1C', label: 'Rejected' },
  PAID: { bg: '#F1F5F9', text: '#475569', label: 'Disbursed / Paid' },
};

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function SocietyExpensesScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [actionModalExp, setActionModalExp] = useState<SocietyExpenseDto | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [utrInput, setUtrInput] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Security Services');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);

  const {
    data: expenses = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['society-expenses', statusFilter],
    queryFn: () => societyFinanceService.getExpenses(statusFilter as any),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['society-vendors'],
    queryFn: societyFinanceService.getVendors,
  });

  const createMutation = useMutation({
    mutationFn: (dto: any) => societyFinanceService.createExpenseVoucher(dto, user?.name || 'Accountant'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['society-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['society-finance-dashboard'] });
      setCreateModalVisible(false);
      resetForm();
      Alert.alert('Voucher Created', 'Payment voucher initiated. Awaiting Checker verification.');
    },
  });

  const resetForm = () => {
    setTitle('');
    setCategory('Security Services');
    setAmount('');
    setDescription('');
    setSelectedVendorId('');
    setReceiptUrl(undefined);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handlePickReceipt = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) {
      setReceiptUrl(res.assets[0].uri);
    }
  };

  const handleCreate = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0 || !title.trim()) {
      Alert.alert('Required Fields', 'Please enter a valid title and amount.');
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      category,
      amount: num,
      description: description.trim(),
      accountId: 'coa-101',
      vendorId: selectedVendorId || undefined,
      receiptUrl,
    });
  };

  // Approval actions
  const handleCheckerVerify = async (exp: SocietyExpenseDto) => {
    await societyFinanceService.checkerVerifyExpense(exp.id, user?.name || 'Treasurer (Checker)', actionNotes || 'Challans and invoice verified.');
    queryClient.invalidateQueries({ queryKey: ['society-expenses'] });
    setActionModalExp(null);
    setActionNotes('');
    Alert.alert('Verified', 'Voucher passed to President / Treasurer for final sign-off.');
  };

  const handleApproverSignOff = async (exp: SocietyExpenseDto) => {
    await societyFinanceService.approverSignOffExpense(exp.id, user?.name || 'President (Approver)', actionNotes || 'Approved for bank disbursement.');
    queryClient.invalidateQueries({ queryKey: ['society-expenses'] });
    setActionModalExp(null);
    setActionNotes('');
    Alert.alert('Approved', 'Voucher approved for fund disbursement.');
  };

  const handleDisburse = async (exp: SocietyExpenseDto) => {
    if (!utrInput.trim()) {
      Alert.alert('UTR Required', 'Please enter Bank UTR / Cheque Reference Number.');
      return;
    }
    await societyFinanceService.disburseExpense(exp.id, utrInput.trim(), 'NET_BANKING_RTGS');
    queryClient.invalidateQueries({ queryKey: ['society-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['society-finance-dashboard'] });
    setActionModalExp(null);
    setUtrInput('');
    Alert.alert('Disbursed', 'Payment recorded as paid with bank reference.');
  };

  return (
    <View style={styles.container}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>3-Tier Expense Approvals</Text>
          <Text style={styles.sub}>Maker ➔ Checker ➔ Approver ➔ Disbursed</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>New Voucher</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status Tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 6 }}>
        {['ALL', 'PENDING_CHECKER', 'PENDING_APPROVER', 'APPROVED', 'PAID'].map(st => (
          <TouchableOpacity
            key={st}
            style={[styles.tabChip, statusFilter === st && styles.tabChipActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.tabChipText, statusFilter === st && styles.tabChipTextActive]}>
              {st === 'ALL' ? 'All' : st.replace('PENDING_', 'Pending ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Voucher List ── */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : expenses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Expense Vouchers</Text>
            <Text style={styles.emptySub}>Create a payment voucher to initiate approval workflow.</Text>
          </View>
        ) : (
          expenses.map(exp => {
            const badge = STATUS_BADGES[exp.status] || STATUS_BADGES.PENDING_CHECKER;
            return (
              <View key={exp.id} style={styles.card}>
                <View style={styles.cHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cTitle}>{exp.title}</Text>
                    <Text style={styles.cMeta}>{exp.voucherNumber} • {exp.category}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <View style={styles.cBody}>
                  <Text style={styles.cDesc}>{exp.description}</Text>
                  {exp.vendorName && <Text style={styles.cVendor}>🏢 Vendor: {exp.vendorName}</Text>}
                  <Text style={styles.cAmt}>{formatCurrency(exp.amount)}</Text>
                </View>

                {/* Audit Trail Row */}
                <View style={styles.auditBox}>
                  <Text style={styles.auditText}>📝 Maker: {exp.makerName} ({exp.makerDate})</Text>
                  {exp.checkerName && <Text style={styles.auditText}>🔍 Checker: {exp.checkerName} ({exp.checkerDate})</Text>}
                  {exp.approverName && <Text style={styles.auditText}>✍️ Approver: {exp.approverName} ({exp.approverDate})</Text>}
                  {exp.utrReference && <Text style={[styles.auditText, { color: '#10B981', fontWeight: 'bold' }]}>🏦 Bank UTR: {exp.utrReference}</Text>}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {exp.status === 'PENDING_CHECKER' && (
                    <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#F59E0B' }]} onPress={() => setActionModalExp(exp)}>
                      <Text style={styles.actBtnText}>Checker Review ➔</Text>
                    </TouchableOpacity>
                  )}
                  {exp.status === 'PENDING_APPROVER' && (
                    <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#4338CA' }]} onPress={() => setActionModalExp(exp)}>
                      <Text style={styles.actBtnText}>Sign-Off Approval ➔</Text>
                    </TouchableOpacity>
                  )}
                  {exp.status === 'APPROVED' && (
                    <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#10B981' }]} onPress={() => setActionModalExp(exp)}>
                      <Text style={styles.actBtnText}>Record Bank Disbursement ➔</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Create Voucher Modal ── */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Society Payment Voucher</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Voucher Title</Text>
              <TextInput style={styles.input} placeholder="e.g. Monthly Security Guard Deployment" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />

              <Text style={styles.inputLabel}>Expense Category</Text>
              <TextInput style={styles.input} placeholder="e.g. Security, Housekeeping, Repairs" placeholderTextColor="#94A3B8" value={category} onChangeText={setCategory} />

              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput style={[styles.input, { fontSize: 18, fontWeight: 'bold' }]} placeholder="0.00" placeholderTextColor="#94A3B8" keyboardType="numeric" value={amount} onChangeText={setAmount} />

              <Text style={styles.inputLabel}>Select Vendor (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                {vendors.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vChip, selectedVendorId === v.id && styles.vChipActive]}
                    onPress={() => setSelectedVendorId(selectedVendorId === v.id ? '' : v.id)}
                  >
                    <Text style={[styles.vChipText, selectedVendorId === v.id && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                      {v.vendorName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Description & Invoice Reference</Text>
              <TextInput style={[styles.input, { height: 60 }]} placeholder="Bill number, work order reference..." placeholderTextColor="#94A3B8" multiline value={description} onChangeText={setDescription} />

              {/* Receipt / Invoice Photo Attachment */}
              <Text style={styles.inputLabel}>Invoice / Bill Attachment</Text>
              {receiptUrl ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
                  <Image source={{ uri: receiptUrl }} style={{ width: 50, height: 50, borderRadius: 6 }} />
                  <TouchableOpacity onPress={() => setReceiptUrl(undefined)}>
                    <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickReceipt}>
                  <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.attachBtnText}>Attach Vendor Bill Photo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Initiate Approval Workflow</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Workflow Action Modal ── */}
      <Modal visible={!!actionModalExp} transparent animationType="fade" onRequestClose={() => setActionModalExp(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionModalExp?.status === 'PENDING_CHECKER' ? 'Checker Verification' : actionModalExp?.status === 'PENDING_APPROVER' ? 'Treasurer / President Sign-Off' : 'Disbursement'}
              </Text>
              <TouchableOpacity onPress={() => setActionModalExp(null)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {actionModalExp && (
              <ScrollView>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1E293B' }}>{actionModalExp.title}</Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Amount: {formatCurrency(actionModalExp.amount)}</Text>

                {actionModalExp.status === 'APPROVED' ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>Bank UTR / Cheque Reference Number</Text>
                    <TextInput style={styles.input} placeholder="e.g. HDFCR52026092788392" placeholderTextColor="#94A3B8" value={utrInput} onChangeText={setUtrInput} />
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10B981' }]} onPress={() => handleDisburse(actionModalExp)}>
                      <Text style={styles.saveBtnText}>Mark Disbursed / Paid</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>Review Notes / Sign-Off Remarks</Text>
                    <TextInput style={[styles.input, { height: 60 }]} placeholder="Verified duty registers, GST compliance, PF receipts..." placeholderTextColor="#94A3B8" multiline value={actionNotes} onChangeText={setActionNotes} />
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={() => actionModalExp.status === 'PENDING_CHECKER' ? handleCheckerVerify(actionModalExp) : handleApproverSignOff(actionModalExp)}
                    >
                      <Text style={styles.saveBtnText}>Confirm Sign-Off</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  topBar: { flexDirection: 'row', padding: SPACING.md, justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  sub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: RADIUS.md,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  tabsBar: { maxHeight: 42 },
  tabChip: {
    paddingHorizontal: 12,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  cMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cBody: { marginVertical: 8 },
  cDesc: { fontSize: 13, color: '#475569' },
  cVendor: { fontSize: 12, color: '#6366F1', marginTop: 4, fontWeight: '600' },
  cAmt: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 4 },
  auditBox: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: RADIUS.sm, marginVertical: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  auditText: { fontSize: 11, color: '#64748B', marginVertical: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  actBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm },
  actBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
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
  vChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  vChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  vChipText: { fontSize: 12, color: '#475569' },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: SPACING.sm,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginVertical: 6,
  },
  attachBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
