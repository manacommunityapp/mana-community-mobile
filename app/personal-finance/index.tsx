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
  PersonalSpendingCategoryDto,
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

function SpendingRow({ item }: { item: PersonalSpendingCategoryDto }) {
  return (
    <View style={styles.spendingRow}>
      <View style={[styles.spendingIcon, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon as any} size={16} color={item.color} />
      </View>
      <View style={styles.spendingDetails}>
        <View style={styles.spendingTop}>
          <Text style={styles.spendingLabel} numberOfLines={1}>{item.label}</Text>
          <Text style={styles.spendingAmount}>{formatCurrency(item.amount)}</Text>
        </View>
        <View style={styles.spendingTrack}>
          <View style={[styles.spendingFill, { width: `${Math.min(item.percentage, 100)}%` as any, backgroundColor: item.color }]} />
        </View>
        <View style={styles.spendingMeta}>
          <Text style={styles.spendingMetaText}>{item.transactionCount} txn{item.transactionCount > 1 ? 's' : ''}</Text>
          <Text style={[styles.spendingMetaText, { color: item.color, fontWeight: '600' }]}>{item.percentage}%</Text>
        </View>
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
  const [activeSpendingTab, setActiveSpendingTab] = useState<'COMMUNITY' | 'OTHER'>('COMMUNITY');

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

  const communitySpending = s?.totalCommunitySpending ?? 6350;
  const otherSpending = s?.totalOtherSpending ?? 12839;
  const communityBreakdown = s?.communitySpendingBreakdown ?? [];
  const otherBreakdown = s?.otherSpendingBreakdown ?? [];

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

      {/* ── Privacy Shield Guarantee Banner ── */}
      <View style={styles.privacyBanner}>
        <Ionicons name="shield-checkmark" size={16} color="#059669" />
        <Text style={styles.privacyBannerText}>
          Private to You • Zero Access by Community Administrators
        </Text>
      </View>

      {/* ── Two-Bucket Spending Breakdown: Community vs Other ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionRow}>
          <View style={styles.sectionLeft}>
            <Ionicons name="pie-chart-outline" size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Spending Breakdown</Text>
          </View>
          <Text style={styles.sectionSub}>Total: {formatCurrency(s?.totalExpenses ?? 19189)}</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.bucketTabs}>
          <TouchableOpacity
            style={[styles.bucketTab, activeSpendingTab === 'COMMUNITY' && styles.bucketTabActive]}
            onPress={() => setActiveSpendingTab('COMMUNITY')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business-outline"
              size={14}
              color={activeSpendingTab === 'COMMUNITY' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.bucketTabText, activeSpendingTab === 'COMMUNITY' && styles.bucketTabTextActive]}>
              Community ({formatCurrency(communitySpending)})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bucketTab, activeSpendingTab === 'OTHER' && styles.bucketTabActive]}
            onPress={() => setActiveSpendingTab('OTHER')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cart-outline"
              size={14}
              color={activeSpendingTab === 'OTHER' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.bucketTabText, activeSpendingTab === 'OTHER' && styles.bucketTabTextActive]}>
              Other ({formatCurrency(otherSpending)})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Bucket Content */}
        {activeSpendingTab === 'COMMUNITY' ? (
          <View style={{ gap: 10, marginTop: 12 }}>
            <View style={styles.bucketDescRow}>
              <Text style={styles.bucketDesc}>
                Linked to Society, Marketplace, Group Buy, Pooja & Amenities
              </Text>
            </View>
            {communityBreakdown.length > 0 ? (
              communityBreakdown.map((item: PersonalSpendingCategoryDto) => <SpendingRow key={item.key} item={item} />)
            ) : (
              <Text style={styles.emptyNotice}>No community transactions recorded this month</Text>
            )}
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 12 }}>
            <View style={styles.bucketDescRow}>
              <Text style={styles.bucketDesc}>
                External personal expenses (Groceries, Dining, Fuel, Utilities)
              </Text>
            </View>
            {otherBreakdown.length > 0 ? (
              otherBreakdown.map((item: PersonalSpendingCategoryDto) => <SpendingRow key={item.key} item={item} />)
            ) : (
              <Text style={styles.emptyNotice}>No external transactions recorded this month</Text>
            )}
          </View>
        )}
      </View>

      {/* ── My Money: 10 Core Modules Grid ── */}
      <View style={styles.quickNavSection}>
        <Text style={styles.sectionTitle}>My Money Tools</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Accounts', icon: 'wallet-outline', color: '#3B82F6', path: '/personal-finance/accounts' },
            { label: 'Income', icon: 'trending-up-outline', color: '#10B981', path: '/personal-finance/transactions' },
            { label: 'Expenses', icon: 'trending-down-outline', color: '#EF4444', path: '/personal-finance/transactions' },
            { label: 'Transfers', icon: 'swap-horizontal-outline', color: '#6366F1', path: '/personal-finance/transactions' },
            { label: 'Categories', icon: 'grid-outline', color: '#0284C7', path: '/personal-finance/categories' },
            { label: 'Budgets', icon: 'pie-chart-outline', color: '#8B5CF6', path: '/personal-finance/budgets' },
            { label: 'Recurring', icon: 'repeat-outline', color: '#EC4899', path: '/personal-finance/recurring' },
            { label: 'Bills', icon: 'receipt-outline', color: '#F59E0B', path: '/personal-finance/bills' },
            { label: 'Receipts', icon: 'camera-outline', color: '#059669', path: '/personal-finance/receipts' },
            { label: 'Reports', icon: 'bar-chart-outline', color: '#0D9488', path: '/personal-finance/reports' },
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
        <View style={{ marginBottom: SPACING.md }}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionLeft}>
              <Ionicons name="link" size={14} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Mana Auto-Imports</Text>
            </View>
            <Text style={styles.sectionSub}>{s!.manaProjections.length} entries</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                  <Text style={styles.projChipLabel} numberOfLines={1}>{proj.sourceLabel || proj.description}</Text>
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
            <View style={[styles.txnIcon, { backgroundColor: (txn.categoryColor || COLORS.primary) + '22' }]}>
              <Ionicons name={(txn.categoryIcon || 'receipt-outline') as any} size={18} color={txn.categoryColor || COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txnDesc} numberOfLines={1}>{txn.description}</Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <Text style={styles.txnCat}>{txn.categoryName || 'General'}</Text>
                {txn.isManaProjection && (
                  <View style={styles.manaBadge}>
                    <Text style={styles.manaBadgeText}>🔗 Mana</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txnAmt, { color: TYPE_COLORS[txn.type] || COLORS.text }]}>
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
                <Text style={{ fontSize: 13, color: '#64748B' }}>Source: {selectedProjection.sourceLabel || selectedProjection.sourceType}</Text>
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
    marginBottom: SPACING.md,
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
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    gap: 6,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  privacyBannerText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  sectionSub: { fontSize: 12, color: '#64748B' },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  bucketTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 3,
    marginTop: 4,
    gap: 4,
  },
  bucketTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  bucketTabActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  bucketTabText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  bucketTabTextActive: { color: '#FFFFFF' },
  bucketDescRow: { marginBottom: 4 },
  bucketDesc: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  spendingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spendingDetails: { flex: 1 },
  spendingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spendingLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  spendingAmount: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
  spendingTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  spendingFill: { height: '100%', borderRadius: 3 },
  spendingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  spendingMetaText: { fontSize: 10, color: '#94A3B8' },
  emptyNotice: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginVertical: 12 },
  quickNavSection: { marginBottom: SPACING.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  gridTile: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  gridIconWrap: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  gridLabel: { fontSize: 11, fontWeight: '600', color: '#334155' },
  snapshotRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
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
  snapshotTitle: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  snapshotValue: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
  snapshotSub: { fontSize: 10, color: '#94A3B8' },
  projectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    ...SHADOWS.sm,
  },
  projChipIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  projChipLabel: { fontSize: 12, fontWeight: '600', color: '#1E293B', maxWidth: 120 },
  projChipAmt: { fontSize: 11, fontWeight: 'bold' },
  budgetBarWrap: { marginTop: 10 },
  budgetBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  budgetBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetBarLabel: { fontSize: 13, color: '#334155', fontWeight: '500' },
  budgetBarPct: { fontSize: 12, fontWeight: 'bold' },
  budgetBarTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 3 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  billIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  billName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  billDue: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  billAmt: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
  billPayBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  billPayBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  txnIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  txnCat: { fontSize: 11, color: '#64748B', marginTop: 2 },
  manaBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginTop: 2 },
  manaBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  txnAmt: { fontSize: 14, fontWeight: 'bold' },
  txnDate: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});
