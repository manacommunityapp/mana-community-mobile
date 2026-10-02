import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  personalFinanceService,
  PersonalRecurringDto,
  CreateRecurringDto,
  TransactionType,
} from '@/services/personalFinanceService';

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

export default function RecurringScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    type: TransactionType;
    amount: string;
    categoryId: string;
    accountId: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    nextDueDate: string;
  }>({
    name: '',
    type: 'EXPENSE',
    amount: '',
    categoryId: '',
    accountId: '',
    frequency: 'MONTHLY',
    nextDueDate: new Date().toISOString().split('T')[0],
  });

  const { data: recurringList = [], isLoading, refetch } = useQuery<PersonalRecurringDto[]>({
    queryKey: ['personal-finance-recurring'],
    queryFn: personalFinanceService.getRecurringTransactions,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['personal-finance-categories'],
    queryFn: personalFinanceService.getCategories,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['personal-finance-accounts'],
    queryFn: personalFinanceService.getAccounts,
  });

  const createMutation = useMutation({
    mutationFn: personalFinanceService.createRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-recurring'] });
      setShowModal(false);
      setForm({
        name: '',
        type: 'EXPENSE',
        amount: '',
        categoryId: '',
        accountId: accounts[0]?.id || '',
        frequency: 'MONTHLY',
        nextDueDate: new Date().toISOString().split('T')[0],
      });
      Alert.alert('✅ Created', 'Recurring rule has been added.');
    },
    onError: () => Alert.alert('Error', 'Could not create recurring rule.'),
  });

  const toggleMutation = useMutation({
    mutationFn: personalFinanceService.toggleRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-recurring'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleCreate = () => {
    if (!form.name.trim()) return Alert.alert('Required', 'Enter a rule name.');
    if (!form.amount || parseFloat(form.amount) <= 0) return Alert.alert('Required', 'Enter a valid amount.');
    const accId = form.accountId || accounts[0]?.id;
    if (!accId) return Alert.alert('Required', 'Select an account.');

    const dto: CreateRecurringDto = {
      name: form.name.trim(),
      type: form.type,
      amount: parseFloat(form.amount),
      categoryId: form.categoryId || categories[0]?.id || 'cat-housing',
      accountId: accId,
      frequency: form.frequency,
      nextDueDate: form.nextDueDate,
    };
    createMutation.mutate(dto);
  };

  const totalMonthlyCommitment = recurringList
    .filter(r => r.isActive && r.type === 'EXPENSE')
    .reduce((sum, r) => sum + r.amount, 0);

  if (isLoading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Summary Card ── */}
      <View style={styles.summaryCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Active Monthly Commitments</Text>
          <Text style={styles.summaryVal}>₹{totalMonthlyCommitment.toLocaleString('en-IN')}</Text>
          <Text style={styles.summarySub}>{recurringList.filter(r => r.isActive).length} active scheduled rules</Text>
        </View>
        <Ionicons name="repeat" size={32} color="rgba(255,255,255,0.7)" />
      </View>

      {/* ── Add Rule Button ── */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          setForm(f => ({ ...f, accountId: accounts[0]?.id || '', categoryId: categories[0]?.id || '' }));
          setShowModal(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.addBtnText}>Add Recurring Transaction</Text>
      </TouchableOpacity>

      {/* ── Recurring List ── */}
      <View style={{ gap: SPACING.sm }}>
        {recurringList.map(r => (
          <View key={r.id} style={[styles.ruleCard, !r.isActive && styles.ruleCardInactive]}>
            <View style={[styles.ruleIcon, { backgroundColor: (r.type === 'INCOME' ? '#10B981' : '#EF4444') + '22' }]}>
              <Ionicons
                name={(r.categoryIcon as any) || (r.type === 'INCOME' ? 'arrow-down' : 'arrow-up')}
                size={20}
                color={r.type === 'INCOME' ? '#10B981' : '#EF4444'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.ruleName}>{r.name}</Text>
                <View style={styles.freqBadge}>
                  <Text style={styles.freqText}>{r.frequency}</Text>
                </View>
              </View>
              <Text style={styles.ruleSub}>Next: {r.nextDueDate} • {r.categoryName}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.ruleAmt, { color: r.type === 'INCOME' ? '#10B981' : '#EF4444' }]}>
                {r.type === 'INCOME' ? '+' : '-'}₹{r.amount.toLocaleString('en-IN')}
              </Text>
              <Switch
                value={r.isActive}
                onValueChange={() => toggleMutation.mutate(r.id)}
                trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        ))}
      </View>

      {/* ── Add Recurring Modal ── */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Recurring Rule</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Rule Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Salary, Netflix, Society Maintenance"
                placeholderTextColor={COLORS.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                {(['EXPENSE', 'INCOME'] as TransactionType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, form.type === t && { backgroundColor: t === 'INCOME' ? '#10B981' : '#EF4444', borderColor: t === 'INCOME' ? '#10B981' : '#EF4444' }]}
                    onPress={() => setForm(f => ({ ...f, type: t }))}
                  >
                    <Text style={[styles.typeBtnText, form.type === t && { color: '#FFFFFF' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              />

              <Text style={styles.fieldLabel}>Frequency</Text>
              <View style={styles.freqRow}>
                {FREQUENCIES.map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[styles.freqChip, form.frequency === freq && styles.freqChipActive]}
                    onPress={() => setForm(f => ({ ...f, frequency: freq }))}
                  >
                    <Text style={[styles.freqChipText, form.frequency === freq && styles.freqChipTextActive]}>
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                {categories.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, form.categoryId === c.id && { backgroundColor: c.color + '22', borderColor: c.color }]}
                    onPress={() => setForm(f => ({ ...f, categoryId: c.id }))}
                  >
                    <Ionicons name={c.icon as any} size={14} color={form.categoryId === c.id ? c.color : COLORS.textMuted} />
                    <Text style={[styles.catChipText, form.categoryId === c.id && { color: c.color, fontWeight: '700' }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.catChip, form.accountId === a.id && { backgroundColor: a.color + '22', borderColor: a.color }]}
                    onPress={() => setForm(f => ({ ...f, accountId: a.id }))}
                  >
                    <Ionicons name={a.icon as any} size={14} color={form.accountId === a.id ? a.color : COLORS.textMuted} />
                    <Text style={[styles.catChipText, form.accountId === a.id && { color: a.color, fontWeight: '700' }]}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Next Due Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={form.nextDueDate}
                onChangeText={v => setForm(f => ({ ...f, nextDueDate: v }))}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, createMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={styles.confirmBtnText}>Create Rule</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  summaryCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, ...SHADOWS.md,
  },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontFamily: 'DMSans-Regular' },
  summaryVal: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', fontFamily: 'Outfit-Bold', marginTop: 2 },
  summarySub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, paddingVertical: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', marginBottom: SPACING.md,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  ruleCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  ruleCardInactive: { opacity: 0.55 },
  ruleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ruleName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  freqBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  freqText: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  ruleSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  ruleAmt: { fontSize: 14, fontWeight: '900', fontFamily: 'Outfit-Bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, maxHeight: '90%', ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'DMSans-Medium' },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 14, color: COLORS.text, marginBottom: SPACING.md, fontFamily: 'DMSans-Regular',
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  typeBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  typeBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold' },
  freqRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.md },
  freqChip: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: '#F8FAFC' },
  freqChipActive: { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  freqChipText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  freqChipTextActive: { color: COLORS.primary },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.xs, backgroundColor: '#F8FAFC' },
  catChipText: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm, paddingBottom: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
