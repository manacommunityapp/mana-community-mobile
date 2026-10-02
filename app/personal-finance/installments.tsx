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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  personalFinanceService,
  PersonalInstallmentDto,
  CreatePersonalInstallmentDto,
} from '@/services/personalFinanceService';

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function PersonalFinanceInstallments() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states for adding loan/EMI
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyEmi, setMonthlyEmi] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [totalTenorMonths, setTotalTenorMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('acc-1');

  const {
    data: installments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['personal-finance-installments'],
    queryFn: personalFinanceService.getInstallments,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['personal-finance-accounts'],
    queryFn: personalFinanceService.getAccounts,
  });

  const createInstallmentMutation = useMutation({
    mutationFn: (dto: CreatePersonalInstallmentDto) => personalFinanceService.createInstallment(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-installments'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('EMI Added', 'Your loan/EMI amortization schedule is now active!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to add EMI');
    },
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => personalFinanceService.payInstallment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-installments'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-transactions'] });
      Alert.alert('EMI Paid', 'Monthly installment recorded and account debited!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to process EMI payment');
    },
  });

  const resetForm = () => {
    setName('');
    setTotalAmount('');
    setMonthlyEmi('');
    setInterestRate('');
    setTotalTenorMonths('');
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a loan / purchase description');
      return;
    }
    const tot = parseFloat(totalAmount);
    const emi = parseFloat(monthlyEmi);
    const tenors = parseInt(totalTenorMonths, 10);
    if (!tot || !emi || !tenors) {
      Alert.alert('Required', 'Please fill in Total Amount, Monthly EMI, and Total Tenors');
      return;
    }

    createInstallmentMutation.mutate({
      name: name.trim(),
      totalAmount: tot,
      monthlyEmi: emi,
      interestRate: parseFloat(interestRate) || 0,
      totalTenorMonths: tenors,
      startDate,
      accountId,
      isAutoDeduct: true,
    });
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading loans & EMIs...</Text>
      </View>
    );
  }

  const activeInstallments = installments.filter(i => i.status !== 'COMPLETED');
  const totalDebt = activeInstallments.reduce((s, i) => s + i.remainingAmount, 0);
  const totalMonthlyEmi = activeInstallments.reduce((s, i) => s + i.monthlyEmi, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Summary Header ── */}
      <View style={styles.debtCard}>
        <View style={styles.debtHeader}>
          <View>
            <Text style={styles.debtLabel}>Total Outstanding Loan / EMI Debt</Text>
            <Text style={styles.debtAmount}>{formatCurrency(totalDebt)}</Text>
          </View>
          <View style={styles.debtIconWrap}>
            <Ionicons name="card" size={24} color="#EF4444" />
          </View>
        </View>

        <View style={styles.burdenStrip}>
          <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
          <Text style={styles.burdenText}>
            Monthly EMI Commitment: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(totalMonthlyEmi)}/mo</Text>
          </Text>
        </View>
      </View>

      {/* ── Section Header ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Active Loans & EMIs ({activeInstallments.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Loan/EMI</Text>
        </TouchableOpacity>
      </View>

      {/* ── Installment Amortization Cards ── */}
      {installments.map((inst) => {
        const pct = Math.min(inst.percentPaid, 100);
        const isFinished = inst.status === 'COMPLETED' || inst.remainingTenorMonths === 0;

        return (
          <View key={inst.id} style={[styles.instCard, isFinished && { opacity: 0.7 }]}>
            <View style={styles.instHeader}>
              <View style={styles.instIcon}>
                <Ionicons name={isFinished ? 'checkmark-circle' : 'receipt'} size={22} color={isFinished ? '#10B981' : COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.instName}>{inst.name}</Text>
                <Text style={styles.instSub}>
                  {inst.accountName ? `Debits from ${inst.accountName}` : 'Active amortization'}
                  {inst.interestRate ? ` • ${inst.interestRate}% APR` : ' • 0% No-Cost EMI'}
                </Text>
              </View>
              <View style={[styles.statusBadge, isFinished ? styles.statusFinished : styles.statusActive]}>
                <Text style={[styles.statusText, isFinished ? { color: '#10B981' } : { color: COLORS.primary }]}>
                  {isFinished ? 'Closed' : `${inst.remainingTenorMonths} left`}
                </Text>
              </View>
            </View>

            {/* Amortization Progress Bar */}
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: isFinished ? '#10B981' : COLORS.primary }]} />
            </View>

            {/* Stats Row */}
            <View style={styles.statsGrid}>
              <View>
                <Text style={styles.statLabel}>Monthly EMI</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{formatCurrency(inst.monthlyEmi)}</Text>
              </View>
              <View>
                <Text style={styles.statLabel}>Paid ({inst.totalTenorMonths - inst.remainingTenorMonths}/{inst.totalTenorMonths})</Text>
                <Text style={styles.statValue}>{formatCurrency(inst.paidAmount)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.statLabel}>Remaining</Text>
                <Text style={styles.statValue}>{formatCurrency(inst.remainingAmount)}</Text>
              </View>
            </View>

            {/* Due Date & Pay Button */}
            {!isFinished && (
              <View style={styles.bottomRow}>
                <View style={styles.dueWrap}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={styles.dueText}>Next due: {inst.nextDueDate || 'Upcoming'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => payMutation.mutate(inst.id)}
                  disabled={payMutation.isPending}
                >
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Pay This Month</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* ── Add Loan Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💳 Add Loan / EMI Purchase</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Item / Loan Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. iPhone 16 Pro EMI or Car Loan"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Total Principal Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 120000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={totalAmount}
                onChangeText={setTotalAmount}
              />

              <Text style={styles.inputLabel}>Monthly EMI (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={monthlyEmi}
                onChangeText={setMonthlyEmi}
              />

              <Text style={styles.inputLabel}>Total Tenor (Months)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 12"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={totalTenorMonths}
                onChangeText={setTotalTenorMonths}
              />

              <Text style={styles.inputLabel}>Annual Interest Rate (%, optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="0 for No-Cost EMI, or e.g. 8.5"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={interestRate}
                onChangeText={setInterestRate}
              />

              <Text style={styles.inputLabel}>Deduct EMI from Account</Text>
              <View style={styles.accountPickerRow}>
                {accounts.map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountChip, accountId === acc.id && styles.accountChipActive]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <Text style={[styles.accountChipText, accountId === acc.id && { color: '#FFFFFF' }]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={createInstallmentMutation.isPending}
              >
                {createInstallmentMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Loan & Track</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: SPACING.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  debtCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...SHADOWS.sm,
  },
  debtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  debtLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  debtAmount: { fontSize: 28, fontWeight: 'bold', color: '#EF4444', marginTop: 4 },
  debtIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  burdenStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  burdenText: { fontSize: 13, color: '#991B1B' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  instCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  instHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.sm },
  instIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  instName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  instSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusActive: { backgroundColor: '#EEF2FF' },
  statusFinished: { backgroundColor: '#ECFDF5' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  track: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginVertical: SPACING.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  statLabel: { fontSize: 11, color: '#94A3B8' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: { fontSize: 12, color: '#64748B' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  payBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
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
  accountPickerRow: { gap: 6, marginVertical: 6 },
  accountChip: { padding: 10, borderRadius: RADIUS.md, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  accountChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  accountChipText: { fontSize: 13, color: '#334155' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
