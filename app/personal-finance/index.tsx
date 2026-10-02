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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  personalFinanceService,
  PersonalTransactionDto,
  PersonalBudgetDto,
  DashboardSummaryDto,
} from '@/services/personalFinanceService';

const TYPE_COLORS = {
  INCOME: '#10B981',
  EXPENSE: '#EF4444',
  TRANSFER: '#6366F1',
};

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

function BudgetBar({ budget }: { budget: PersonalBudgetDto }) {
  const capped = Math.min(budget.percentUsed, 100);
  const barColor = budget.isOverspent ? '#EF4444' : budget.percentUsed >= budget.alertThreshold ? '#F59E0B' : COLORS.primary;
  return (
    <View style={styles.budgetBarWrap}>
      <View style={styles.budgetBarHeader}>
        <View style={styles.budgetBarLeft}>
          <View style={[styles.budgetDot, { backgroundColor: budget.categoryColor }]} />
          <Text style={styles.budgetBarLabel}>{budget.categoryName}</Text>
        </View>
        <Text style={[styles.budgetBarPct, { color: barColor }]}>
          {budget.isOverspent ? 'Over!' : `${budget.percentUsed}%`}
        </Text>
      </View>
      <View style={styles.budgetBarTrack}>
        <View style={[styles.budgetBarFill, { width: `${capped}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

export default function PersonalFinanceDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProjection, setSelectedProjection] = useState<PersonalTransactionDto | null>(null);

  const {
    data: summary,
    isLoading,
    refetch,
  } = useQuery<DashboardSummaryDto>({
    queryKey: ['personal-finance-dashboard'],
    queryFn: () => personalFinanceService.getDashboardSummary(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['personal-finance-bills'],
    queryFn: personalFinanceService.getBills,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['personal-finance-goals'],
    queryFn: personalFinanceService.getGoals,
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['personal-finance-installments'],
    queryFn: personalFinanceService.getInstallments,
  });

  const markPaidMutation = useMutation({
    mutationFn: personalFinanceService.markBillPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-bills'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (isLoading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your finances...</Text>
      </View>
    );
  }

  const s = summary;
  const upcomingBills = bills.filter(b => !b.isPaid).slice(0, 3);
  const activeInstallments = installments.filter(i => i.status !== 'COMPLETED');
  const totalMonthlyEmi = activeInstallments.reduce((sum, i) => sum + i.monthlyEmi, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Greeting ── */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greetingName}>Hi, {user?.fullName?.split(' ')[0] || user?.name || 'there'} 👋</Text>
          <Text style={styles.greetingPeriod}>October 2026 overview</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/personal-finance/settings' as any)}
        >
          <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Income / Expense / Savings Cards ── */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderTopColor: '#10B981' }]}>
          <Text style={styles.summaryCardLabel}>Income</Text>
          <Text style={[styles.summaryCardAmount, { color: '#10B981' }]}>
            {formatCurrency(s?.totalIncome ?? 97000)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: '#EF4444' }]}>
          <Text style={styles.summaryCardLabel}>Expenses</Text>
          <Text style={[styles.summaryCardAmount, { color: '#EF4444' }]}>
            {formatCurrency(s?.totalExpenses ?? 19189)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: COLORS.primary }]}>
          <Text style={styles.summaryCardLabel}>Savings</Text>
          <Text style={[styles.summaryCardAmount, { color: COLORS.primary }]}>
            {formatCurrency(s?.netSavings ?? 77811)}
          </Text>
        </View>
      </View>

      {/* ── Net Worth Card ── */}
      <View style={styles.netWorthCard}>
        <View style={styles.netWorthLeft}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>{formatCurrency(s?.netWorth ?? 74150)}</Text>
          <View style={styles.netWorthSub}>
            <Text style={styles.netWorthSubText}>
              Assets {formatCurrency(s?.totalAssets ?? 92550)} • Liabilities {formatCurrency(s?.totalLiabilities ?? 18400)}
            </Text>
          </View>
        </View>
        <View style={styles.savingsRateCircle}>
          <Text style={styles.savingsRateValue}>{s?.savingsRate ?? 80}%</Text>
          <Text style={styles.savingsRateLabel}>Saved</Text>
        </View>
      </View>

      {/* ── P3: Quick Navigation 8-Grid ── */}
      <View style={styles.quickNavSection}>
        <Text style={styles.sectionTitle}>Finance Hub</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Accounts', icon: 'wallet-outline', color: '#3B82F6', path: '/personal-finance/accounts' },
            { label: 'Ledger', icon: 'receipt-outline', color: '#10B981', path: '/personal-finance/transactions' },
            { label: 'Budgets', icon: 'pie-chart-outline', color: '#8B5CF6', path: '/personal-finance/budgets' },
            { label: 'Reports', icon: 'bar-chart-outline', color: '#F59E0B', path: '/personal-finance/reports' },
            { label: 'Calendar', icon: 'calendar-outline', color: '#EC4899', path: '/personal-finance/calendar' },
            { label: 'Recurring', icon: 'repeat-outline', color: '#6366F1', path: '/personal-finance/recurring' },
            { label: 'Goals', icon: 'flag-outline', color: '#059669', path: '/personal-finance/goals' },
            { label: 'Loans & EMI', icon: 'card-outline', color: '#DC2626', path: '/personal-finance/installments' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.gridTile}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIconWrap, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Active EMI & Goals Snapshot Strip ── */}
      {(goals.length > 0 || activeInstallments.length > 0) && (
        <View style={styles.snapshotRow}>
          {goals.length > 0 && (
            <TouchableOpacity
              style={styles.snapshotCard}
              onPress={() => router.push('/personal-finance/goals' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.snapshotHeader}>
                <Ionicons name="trophy-outline" size={16} color="#059669" />
                <Text style={styles.snapshotTitle}>Savings Goals</Text>
              </View>
              <Text style={styles.snapshotValue}>{goals.length} Active Targets</Text>
              <Text style={styles.snapshotSub}>Top: {goals[0].name}</Text>
            </TouchableOpacity>
          )}

          {activeInstallments.length > 0 && (
            <TouchableOpacity
              style={styles.snapshotCard}
              onPress={() => router.push('/personal-finance/installments' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.snapshotHeader}>
                <Ionicons name="card-outline" size={16} color="#DC2626" />
                <Text style={styles.snapshotTitle}>Monthly EMI</Text>
              </View>
              <Text style={[styles.snapshotValue, { color: '#DC2626' }]}>{formatCurrency(totalMonthlyEmi)}/mo</Text>
              <Text style={styles.snapshotSub}>{activeInstallments.length} Active Loans</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Mana Projections Strip ── */}
      {(s?.manaProjections?.length ?? 0) > 0 && (
        <View>
          <View style={styles.sectionRow}>
            <View style={styles.sectionLeft}>
              <Ionicons name="link" size={14} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Mana Auto-Imports</Text>
            </View>
            <Text style={styles.sectionSub}>{s!.manaProjections.length} entries</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
            {s!.manaProjections.map(proj => (
              <TouchableOpacity
                key={proj.id}
                style={styles.projectionChip}
                onPress={() => setSelectedProjection(proj)}
                activeOpacity={0.7}
              >
                <View style={[styles.projChipIcon, { backgroundColor: proj.categoryColor + '22' }]}>
                  <Ionicons name={proj.categoryIcon as any} size={14} color={proj.categoryColor} />
                </View>
                <View>
                  <Text style={styles.projChipLabel} numberOfLines={1}>{proj.sourceLabel}</Text>
                  <Text style={[styles.projChipAmt, { color: '#EF4444' }]}>-{formatCurrency(proj.amount)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Budget Health ── */}
      {(s?.budgetAlerts?.length ?? 0) > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionLeft}>
              <Ionicons name="warning-outline" size={14} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Budget Alerts</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/personal-finance/budgets' as any)}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {s!.budgetAlerts.map(b => <BudgetBar key={b.id} budget={b} />)}
        </View>
      )}

      {/* ── Upcoming Bills ── */}
      {upcomingBills.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionLeft}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Upcoming Bills</Text>
            </View>
          </View>
          {upcomingBills.map(bill => (
            <View key={bill.id} style={styles.billRow}>
              <View style={[styles.billIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name={(bill.categoryIcon || 'calendar') as any} size={16} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.billName}>{bill.name}</Text>
                <Text style={styles.billDue}>Due {bill.dueDate}</Text>
              </View>
              <Text style={styles.billAmt}>{formatCurrency(bill.amount)}</Text>
              <TouchableOpacity
                style={styles.billPayBtn}
                onPress={() => markPaidMutation.mutate(bill.id)}
              >
                <Text style={styles.billPayBtnText}>Pay</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ── Recent Transactions ── */}
      <View style={styles.sectionRow}>
        <View style={styles.sectionLeft}>
          <Ionicons name="receipt-outline" size={14} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/personal-finance/transactions' as any)}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: SPACING.sm, marginBottom: SPACING.md }}>
        {(s?.recentTransactions ?? []).map(txn => (
          <View key={txn.id} style={styles.txnRow}>
            <View style={[styles.txnIcon, { backgroundColor: txn.categoryColor + '22' }]}>
              <Ionicons name={txn.categoryIcon as any} size={18} color={txn.categoryColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txnDesc} numberOfLines={1}>{txn.description}</Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <Text style={styles.txnCat}>{txn.categoryName}</Text>
                {txn.isManaProjection && (
                  <View style={styles.manaBadge}>
                    <Text style={styles.manaBadgeText}>🔗 Mana</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txnAmt, { color: TYPE_COLORS[txn.type] }]}>
                {txn.type === 'INCOME' ? '+' : txn.type === 'TRANSFER' ? '' : '-'}{formatCurrency(txn.amount)}
              </Text>
              <Text style={styles.txnDate}>{txn.date}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Mana Projection Modal ── */}
      <Modal visible={!!selectedProjection} transparent animationType="slide" onRequestClose={() => setSelectedProjection(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mana Auto-Imported Entry</Text>
              <TouchableOpacity onPress={() => setSelectedProjection(null)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {selectedProjection && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>{selectedProjection.description}</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#EF4444' }}>-{formatCurrency(selectedProjection.amount)}</Text>
                <Text style={{ fontSize: 13, color: '#64748B' }}>Source: {selectedProjection.sourceLabel}</Text>
                <TouchableOpacity style={styles.saveBtn} onPress={() => setSelectedProjection(null)}>
                  <Text style={styles.saveBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
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
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  greetingName: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  greetingPeriod: { fontSize: 13, color: '#64748B', marginTop: 2 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  summaryCardLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  summaryCardAmount: { fontSize: 15, fontWeight: 'bold', marginTop: 4 },
  netWorthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  netWorthLeft: { flex: 1 },
  netWorthLabel: { fontSize: 13, color: '#94A3B8' },
  netWorthValue: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', marginTop: 2 },
  netWorthSub: { marginTop: 6 },
  netWorthSubText: { fontSize: 11, color: '#CBD5E1' },
  savingsRateCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  savingsRateValue: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  savingsRateLabel: { fontSize: 10, color: '#94A3B8' },
  quickNavSection: { marginBottom: SPACING.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  gridTile: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  gridIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  gridLabel: { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center' },
  snapshotRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  snapshotCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  snapshotHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  snapshotTitle: { fontSize: 12, fontWeight: '600', color: '#475569' },
  snapshotValue: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  snapshotSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  sectionSub: { fontSize: 12, color: '#64748B' },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  projectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  projChipIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  projChipLabel: { fontSize: 12, color: '#334155', maxWidth: 140 },
  projChipAmt: { fontSize: 12, fontWeight: 'bold' },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  budgetBarWrap: { marginBottom: 12 },
  budgetBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  budgetBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetBarLabel: { fontSize: 13, color: '#334155' },
  budgetBarPct: { fontSize: 12, fontWeight: 'bold' },
  budgetBarTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 3 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  billIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  billName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  billDue: { fontSize: 11, color: '#64748B' },
  billAmt: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  billPayBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  billPayBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  txnIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  txnCat: { fontSize: 12, color: '#64748B' },
  manaBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  manaBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold' },
  txnAmt: { fontSize: 14, fontWeight: 'bold' },
  txnDate: { fontSize: 11, color: '#94A3B8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
