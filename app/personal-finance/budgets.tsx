import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  personalFinanceService,
  PersonalBudgetDto,
  CreateBudgetDto,
} from '@/services/personalFinanceService';

function BudgetCard({ budget, dayInfo }: {
  budget: PersonalBudgetDto;
  dayInfo: { day: number; totalDays: number; remainingDays: number; pacePct: number };
}) {
  const pct = Math.min(budget.percentUsed, 100);
  const expectedSpent = (dayInfo.day / dayInfo.totalDays) * budget.limitAmount;
  const isAheadOfPace = budget.spentAmount > expectedSpent && !budget.isOverspent;
  const dailyAllowance = Math.round(Math.max(0, budget.remainingAmount) / Math.max(1, dayInfo.remainingDays));

  const barColor = budget.isOverspent
    ? '#EF4444'
    : isAheadOfPace
    ? '#F59E0B'
    : '#10B981';

  return (
    <View style={[styles.budgetCard, budget.isOverspent && styles.budgetCardOverspent]}>
      <View style={styles.budgetCardHeader}>
        <View style={styles.budgetCardLeft}>
          <View style={[styles.budgetIcon, { backgroundColor: (budget.categoryColor || '#6B7280') + '22' }]}>
            <Ionicons name={(budget.categoryIcon as any) || 'ellipse-outline'} size={20} color={budget.categoryColor || '#6B7280'} />
          </View>
          <View>
            <Text style={styles.budgetCatName}>{budget.categoryName}</Text>
            <Text style={styles.budgetPeriodLabel}>Day {dayInfo.day} of {dayInfo.totalDays} · {budget.period}</Text>
          </View>
        </View>

        {budget.isOverspent ? (
          <View style={styles.overspentBadge}>
            <Ionicons name="warning" size={10} color="#EF4444" />
            <Text style={styles.overspentText}>Over Budget</Text>
          </View>
        ) : isAheadOfPace ? (
          <View style={[styles.overspentBadge, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="trending-up" size={10} color="#D97706" />
            <Text style={[styles.overspentText, { color: '#D97706' }]}>Fast Pace</Text>
          </View>
        ) : (
          <View style={[styles.overspentBadge, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="checkmark-circle" size={10} color="#059669" />
            <Text style={[styles.overspentText, { color: '#059669' }]}>On Track</Text>
          </View>
        )}
      </View>

      {/* Progress Bar with Expected Pace Marker */}
      <View style={styles.progressTrackWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        </View>
        {/* Benchmark Pace Needle */}
        <View style={[styles.paceMarker, { left: `${Math.min(dayInfo.pacePct, 98)}%` as any }]} />
      </View>

      {/* Amounts */}
      <View style={styles.budgetAmtRow}>
        <View>
          <Text style={styles.budgetAmtLabel}>Spent</Text>
          <Text style={[styles.budgetAmt, { color: barColor }]}>₹{budget.spentAmount.toLocaleString('en-IN')}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.budgetAmtLabel}>Pace Benchmark</Text>
          <Text style={[styles.budgetAmt, { color: COLORS.textSecondary }]}>₹{Math.round(expectedSpent).toLocaleString('en-IN')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.budgetAmtLabel}>Limit</Text>
          <Text style={styles.budgetAmt}>₹{budget.limitAmount.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Intelligence Note */}
      <View style={styles.paceAdviceRow}>
        {!budget.isOverspent ? (
          <Text style={styles.budgetRemainingText}>
            ₹{Math.max(budget.remainingAmount, 0).toLocaleString('en-IN')} remaining (₹{dailyAllowance}/day for {dayInfo.remainingDays} days)
          </Text>
        ) : (
          <Text style={[styles.budgetRemainingText, { color: '#EF4444' }]}>
            ₹{Math.abs(budget.remainingAmount).toLocaleString('en-IN')} over limit!
          </Text>
        )}
      </View>
    </View>
  );
}

export default function BudgetsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ categoryId: string; limit: string; alert: string }>({
    categoryId: '', limit: '', alert: '80',
  });

  const now = new Date();
  const dayInfo = useMemo(() => {
    const today = now.getDate();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remaining = Math.max(1, lastDayOfMonth - today);
    const pace = (today / lastDayOfMonth) * 100;
    return {
      day: today,
      totalDays: lastDayOfMonth,
      remainingDays: remaining,
      pacePct: pace,
    };
  }, []);

  const { data: budgets = [], isLoading, refetch } = useQuery<PersonalBudgetDto[]>({
    queryKey: ['personal-finance-budgets'],
    queryFn: () => personalFinanceService.getBudgets(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['personal-finance-categories'],
    queryFn: personalFinanceService.getCategories,
  });

  const createMutation = useMutation({
    mutationFn: personalFinanceService.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-budgets'] });
      setShowModal(false);
      setForm({ categoryId: '', limit: '', alert: '80' });
      Alert.alert('✅ Budget Created', 'Your budget has been set for this month.');
    },
    onError: () => Alert.alert('Error', 'Could not create budget.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleCreate = () => {
    if (!form.categoryId) return Alert.alert('Required', 'Select a category.');
    if (!form.limit || parseFloat(form.limit) <= 0) return Alert.alert('Required', 'Enter a valid limit.');
    const dto: CreateBudgetDto = {
      categoryId: form.categoryId,
      period: 'MONTHLY',
      limitAmount: parseFloat(form.limit),
      alertThreshold: parseInt(form.alert) || 80,
      month: new Date().toISOString().slice(0, 7),
    };
    createMutation.mutate(dto);
  };

  const overSpentCount = budgets.filter(b => b.isOverspent).length;
  const alertCount = budgets.filter(b => !b.isOverspent && b.percentUsed >= b.alertThreshold).length;
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  if (isLoading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Status Header ── */}
      <View style={styles.statusRow}>
        <View style={[styles.statusCard, { borderTopColor: '#EF4444' }]}>
          <Text style={styles.statusVal}>{overSpentCount}</Text>
          <Text style={styles.statusLabel}>Over Budget</Text>
        </View>
        <View style={[styles.statusCard, { borderTopColor: '#F59E0B' }]}>
          <Text style={styles.statusVal}>{alertCount}</Text>
          <Text style={styles.statusLabel}>Near Limit</Text>
        </View>
        <View style={[styles.statusCard, { borderTopColor: '#10B981' }]}>
          <Text style={styles.statusVal}>{budgets.length - overSpentCount - alertCount}</Text>
          <Text style={styles.statusLabel}>On Track</Text>
        </View>
      </View>

      {/* ── Add Budget Button ── */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.addBtnText}>Set New Budget</Text>
      </TouchableOpacity>

      {/* ── Budget Cards with Pace Intelligence ── */}
      <View style={{ gap: SPACING.md }}>
        {budgets.map(b => <BudgetCard key={b.id} budget={b} dayInfo={dayInfo} />)}
      </View>

      {/* ── Create Budget Modal ── */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Monthly Budget</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {expenseCategories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catChip, form.categoryId === c.id && { backgroundColor: c.color + '22', borderColor: c.color }]}
                  onPress={() => setForm(f => ({ ...f, categoryId: c.id }))}
                >
                  <Ionicons name={c.icon as any} size={14} color={form.categoryId === c.id ? c.color : COLORS.textMuted} />
                  <Text style={[styles.catChipText, form.categoryId === c.id && { color: c.color }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Monthly Limit (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={form.limit}
              onChangeText={v => setForm(f => ({ ...f, limit: v }))}
            />

            <Text style={styles.fieldLabel}>Alert at (% of limit)</Text>
            <TextInput
              style={styles.input}
              placeholder="80"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={form.alert}
              onChangeText={v => setForm(f => ({ ...f, alert: v }))}
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
                  : <Text style={styles.confirmBtnText}>Set Budget</Text>
                }
              </TouchableOpacity>
            </View>
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

  statusRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statusCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  statusVal: { fontSize: 22, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  statusLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2, textTransform: 'uppercase' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, paddingVertical: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', marginBottom: SPACING.md,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  budgetCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  budgetCardOverspent: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  budgetCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  budgetCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  budgetIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  budgetCatName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  budgetPeriodLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  overspentBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.sm },
  overspentText: { fontSize: 9, fontWeight: '800', color: '#EF4444', fontFamily: 'Outfit-Bold' },

  progressTrackWrap: { position: 'relative', height: 12, justifyContent: 'center', marginBottom: SPACING.md },
  progressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  paceMarker: { position: 'absolute', top: 0, bottom: 0, width: 2.5, backgroundColor: '#64748B', borderRadius: 1.5, zIndex: 2 },

  budgetAmtRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetAmtLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', textTransform: 'uppercase' },
  budgetAmt: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 2 },
  paceAdviceRow: { marginTop: SPACING.sm, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  budgetRemainingText: { fontSize: 11, color: '#10B981', fontWeight: '700', fontFamily: 'DMSans-Medium', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, fontFamily: 'DMSans-Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 14, color: COLORS.text, marginBottom: SPACING.md, fontFamily: 'DMSans-Regular' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.xs, backgroundColor: '#F8FAFC' },
  catChipText: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
