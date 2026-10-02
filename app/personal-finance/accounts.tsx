import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  personalFinanceService,
  PersonalAccountDto,
  AccountType,
} from '@/services/personalFinanceService';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  SAVINGS: 'Savings Account',
  CURRENT: 'Current Account',
  CREDIT_CARD: 'Credit Card',
  WALLET: 'Digital Wallet',
  CASH: 'Cash in Hand',
  INVESTMENT: 'Investment / Stocks',
  LOAN: 'Loan / Liability',
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  SAVINGS: 'business-outline',
  CURRENT: 'briefcase-outline',
  CREDIT_CARD: 'card-outline',
  WALLET: 'phone-portrait-outline',
  CASH: 'cash-outline',
  INVESTMENT: 'trending-up-outline',
  LOAN: 'alert-circle-outline',
};

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  SAVINGS: '#3B82F6',
  CURRENT: '#0EA5E9',
  CREDIT_CARD: '#EF4444',
  WALLET: '#8B5CF6',
  CASH: '#10B981',
  INVESTMENT: '#F59E0B',
  LOAN: '#DC2626',
};

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('en-IN');
  return (amount < 0 ? '-₹' : '₹') + abs;
}

export default function AccountsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<{
    name: string; type: AccountType; balance: string;
    creditLimit: string; bankName: string; accountNumber: string;
    billingDay: string; paymentDueDay: string;
  }>({
    name: '', type: 'SAVINGS', balance: '',
    creditLimit: '', bankName: '', accountNumber: '',
    billingDay: '15', paymentDueDay: '5',
  });

  const { data: accounts = [], isLoading, refetch } = useQuery<PersonalAccountDto[]>({
    queryKey: ['personal-finance-accounts'],
    queryFn: personalFinanceService.getAccounts,
  });

  const createMutation = useMutation({
    mutationFn: personalFinanceService.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-dashboard'] });
      setShowAddModal(false);
      setForm({ name: '', type: 'SAVINGS', balance: '', creditLimit: '', bankName: '', accountNumber: '', billingDay: '15', paymentDueDay: '5' });
      Alert.alert('✅ Account Created', 'Your account has been added.');
    },
    onError: () => Alert.alert('Error', 'Could not create account.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleAdd = () => {
    if (!form.name.trim()) return Alert.alert('Required', 'Enter account name.');
    const bal = parseFloat(form.balance) || 0;
    const isCredit = form.type === 'CREDIT_CARD' || form.type === 'LOAN';
    createMutation.mutate({
      name: form.name.trim(),
      type: form.type,
      balance: isCredit ? -Math.abs(bal) : bal,
      creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : undefined,
      currency: '₹',
      bankName: form.bankName.trim() || undefined,
      accountNumber: form.accountNumber.trim() || undefined,
      billingDay: form.type === 'CREDIT_CARD' ? parseInt(form.billingDay) || 15 : undefined,
      paymentDueDay: form.type === 'CREDIT_CARD' ? parseInt(form.paymentDueDay) || 5 : undefined,
      color: ACCOUNT_TYPE_COLORS[form.type],
      icon: ACCOUNT_TYPE_ICONS[form.type],
      isActive: true,
    });
  };

  const totalAssets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  if (isLoading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Net Worth Overview ── */}
      <View style={styles.netWorthCard}>
        <Text style={styles.netWorthLabel}>Total Net Worth</Text>
        <Text style={styles.netWorthVal}>{formatCurrency(netWorth)}</Text>
        <View style={styles.netWorthSplit}>
          <View style={styles.splitItem}>
            <Text style={styles.splitLabel}>Assets</Text>
            <Text style={[styles.splitVal, { color: '#10B981' }]}>+₹{totalAssets.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitItem}>
            <Text style={styles.splitLabel}>Liabilities</Text>
            <Text style={[styles.splitVal, { color: '#EF4444' }]}>-₹{totalLiabilities.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      {/* ── Add Account Button ── */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.addBtnText}>Add New Account</Text>
      </TouchableOpacity>

      {/* ── Accounts List ── */}
      <View style={{ gap: SPACING.md }}>
        {accounts.map(acc => {
          const isNegative = acc.balance < 0;
          return (
            <View key={acc.id} style={styles.accCard}>
              <View style={[styles.accIconWrap, { backgroundColor: (acc.color || '#3B82F6') + '22' }]}>
                <Ionicons name={(acc.icon as any) || 'wallet-outline'} size={22} color={acc.color || '#3B82F6'} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.accName}>{acc.name}</Text>
                  {acc.type === 'CREDIT_CARD' && (
                    <View style={styles.ccBadge}><Text style={styles.ccBadgeText}>Credit</Text></View>
                  )}
                </View>
                <Text style={styles.accType}>
                  {ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}
                  {acc.accountNumber ? ' · ' + acc.accountNumber : ''}
                </Text>

                {/* Credit Card Billing Cycle Info */}
                {acc.type === 'CREDIT_CARD' && acc.billingDay && (
                  <View style={styles.billingCycleRow}>
                    <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
                    <Text style={styles.billingCycleText}>
                      Statement: {acc.billingDay}th · Due: {acc.paymentDueDay || 5}th
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.accBalance, isNegative && { color: '#EF4444' }]}>
                  {formatCurrency(acc.balance)}
                </Text>
                {acc.creditLimit && acc.creditLimit > 0 && (
                  <Text style={styles.accLimit}>Limit ₹{acc.creditLimit.toLocaleString('en-IN')}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Add Account Modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Account</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Account Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                    onPress={() => setForm(f => ({ ...f, type: t }))}
                  >
                    <Ionicons name={ACCOUNT_TYPE_ICONS[t] as any} size={14} color={form.type === t ? '#FFFFFF' : COLORS.textSecondary} />
                    <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Account Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. HDFC Salary, SBI Card, Cash"
                placeholderTextColor={COLORS.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={styles.fieldLabel}>Bank / Provider (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. HDFC Bank, Amazon Pay"
                placeholderTextColor={COLORS.textMuted}
                value={form.bankName}
                onChangeText={v => setForm(f => ({ ...f, bankName: v }))}
              />

              <Text style={styles.fieldLabel}>Account / Card Last 4 digits (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. •••• 6234"
                placeholderTextColor={COLORS.textMuted}
                value={form.accountNumber}
                onChangeText={v => setForm(f => ({ ...f, accountNumber: v }))}
              />

              <Text style={styles.fieldLabel}>
                {form.type === 'CREDIT_CARD' || form.type === 'LOAN' ? 'Current Outstanding Balance (₹)' : 'Current Balance (₹)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={form.balance}
                onChangeText={v => setForm(f => ({ ...f, balance: v }))}
              />

              {form.type === 'CREDIT_CARD' && (
                <>
                  <Text style={styles.fieldLabel}>Credit Limit (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 150000"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={form.creditLimit}
                    onChangeText={v => setForm(f => ({ ...f, creditLimit: v }))}
                  />

                  <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Billing Statement Day</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="15"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                        value={form.billingDay}
                        onChangeText={v => setForm(f => ({ ...f, billingDay: v }))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Payment Due Day</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="5"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                        value={form.paymentDueDay}
                        onChangeText={v => setForm(f => ({ ...f, paymentDueDay: v }))}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, createMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleAdd}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={styles.confirmBtnText}>Save Account</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },

  netWorthCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.lg,
    marginBottom: SPACING.md, ...SHADOWS.md,
  },
  netWorthLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontFamily: 'DMSans-Regular' },
  netWorthVal: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', fontFamily: 'Outfit-Bold', marginVertical: SPACING.xs },
  netWorthSplit: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.xs },
  splitItem: { flex: 1, alignItems: 'center' },
  splitLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'DMSans-Regular' },
  splitVal: { fontSize: 13, fontWeight: '800', fontFamily: 'Outfit-Bold', marginTop: 1 },
  splitDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, paddingVertical: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', marginBottom: SPACING.md,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  accCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  accIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  accName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  accType: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  accBalance: { fontSize: 15, fontWeight: '900', color: '#10B981', fontFamily: 'Outfit-Bold' },
  accLimit: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  ccBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  ccBadgeText: { fontSize: 9, fontWeight: '800', color: '#EF4444' },
  billingCycleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  billingCycleText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, maxHeight: '90%', ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'DMSans-Medium' },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 14, color: COLORS.text, marginBottom: SPACING.md, fontFamily: 'DMSans-Regular',
  },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.xs, backgroundColor: '#F8FAFC' },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  typeChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm, paddingBottom: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
