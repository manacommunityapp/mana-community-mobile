import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { personalFinanceService, ReportPeriodDto } from '@/services/personalFinanceService';

const PERIODS = [
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'last-3-months', label: '3 Months' },
  { id: 'this-year', label: 'This Year' },
];

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function ReportsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [categoryType, setCategoryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [refreshing, setRefreshing] = useState(false);

  const { data: report, isLoading, refetch } = useQuery<ReportPeriodDto>({
    queryKey: ['personal-finance-report', selectedPeriod],
    queryFn: () => personalFinanceService.getReport(selectedPeriod),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleExport = async () => {
    if (!report) return;
    try {
      const header = 'Period Report: ' + report.label + '\n';
      const summary = 'Total Income: ₹' + report.totalIncome.toLocaleString('en-IN') + '\n'
        + 'Total Expenses: ₹' + report.totalExpenses.toLocaleString('en-IN') + '\n'
        + 'Net Savings: ₹' + report.netSavings.toLocaleString('en-IN') + '\n\n';

      const catHeader = 'Top Expense Categories:\nCategory,Amount,Percentage\n';
      const catRows = (report.topCategories || []).map(c =>
        `"${c.categoryName}",${c.amount},${c.percentage}%`
      ).join('\n');

      const fullExport = header + summary + catHeader + catRows;
      await Share.share({
        message: fullExport,
        title: 'Financial Report - ' + report.label,
      });
    } catch (e) {
      Alert.alert('Export Error', 'Could not share report.');
    }
  };

  if (isLoading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const maxMonthly = Math.max(
    ...(report?.monthlyBreakdown ?? []).map(m => Math.max(m.income, m.expenses)),
    1
  );

  const displayedCategories = categoryType === 'EXPENSE'
    ? (report?.topCategories ?? [])
    : (report?.topIncomeSources ?? [
        { categoryId: 'cat-salary', categoryName: 'Salary', categoryIcon: 'briefcase-outline', categoryColor: '#10B981', amount: report?.totalIncome ?? 0, percentage: 100 }
      ]);

  const savingsRate = report && report.totalIncome > 0
    ? Math.max(0, Math.round((report.netSavings / report.totalIncome) * 100))
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Period Selector & Export ── */}
      <View style={styles.periodRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flex: 1 }}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.periodChip, selectedPeriod === p.id && styles.periodChipActive]}
              onPress={() => setSelectedPeriod(p.id)}
            >
              <Text style={[styles.periodChipText, selectedPeriod === p.id && styles.periodChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Ionicons name="share-outline" size={16} color={COLORS.primary} />
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* ── Trend Insight Banner ── */}
      {report?.trendInsightText ? (
        <View style={styles.trendCard}>
          <View style={[styles.trendIconWrap, { backgroundColor: (report.expenseChangePercentage ?? 0) > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
            <Ionicons
              name={(report.expenseChangePercentage ?? 0) > 0 ? 'trending-up' : 'trending-down'}
              size={18}
              color={(report.expenseChangePercentage ?? 0) > 0 ? '#DC2626' : '#16A34A'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trendTitle}>Smart Spending Insight</Text>
            <Text style={styles.trendText}>{report.trendInsightText}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Summary Card ── */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryPeriod}>{report?.label}</Text>
        <View style={styles.summaryMetrics}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryVal, { color: '#10B981' }]}>
              +{formatCurrency(report?.totalIncome ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryVal, { color: '#EF4444' }]}>
              -{formatCurrency(report?.totalExpenses ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net Saved</Text>
            <Text style={[styles.summaryVal, { color: COLORS.primary }]}>
              {formatCurrency(report?.netSavings ?? 0)}
            </Text>
          </View>
        </View>

        {/* Savings Rate Bar */}
        <View style={styles.savingsRateWrap}>
          <View style={styles.savingsRateHeader}>
            <Text style={styles.savingsRateLabel}>Savings Rate</Text>
            <Text style={styles.savingsRateVal}>{savingsRate}%</Text>
          </View>
          <View style={styles.savingsRateTrack}>
            <View style={[styles.savingsRateFill, { width: `${Math.min(savingsRate, 100)}%` }]} />
          </View>
        </View>
      </View>

      {/* ── 6-Month Income vs Expenses Comparison ── */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Monthly Cash Flow</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Income</Text>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444', marginLeft: 8 }]} />
            <Text style={styles.legendText}>Expense</Text>
          </View>
        </View>

        <View style={styles.barChart}>
          {(report?.monthlyBreakdown ?? []).map((m, idx) => {
            const incH = Math.max((m.income / maxMonthly) * 90, 4);
            const expH = Math.max((m.expenses / maxMonthly) * 90, 4);
            return (
              <View key={idx} style={styles.barGroup}>
                <View style={styles.barPair}>
                  <View style={[styles.bar, { height: incH, backgroundColor: '#10B981' }]} />
                  <View style={[styles.bar, { height: expH, backgroundColor: '#EF4444' }]} />
                </View>
                <Text style={styles.barLabel}>{m.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Category Breakdown Section ── */}
      <View style={styles.topCatsCard}>
        <View style={styles.topCatsHeader}>
          <Text style={styles.topCatsTitle}>Category Breakdown</Text>
          <View style={styles.breakdownToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, categoryType === 'EXPENSE' && styles.toggleBtnActive]}
              onPress={() => setCategoryType('EXPENSE')}
            >
              <Text style={[styles.toggleBtnText, categoryType === 'EXPENSE' && styles.toggleBtnTextActive]}>Expenses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, categoryType === 'INCOME' && styles.toggleBtnActive]}
              onPress={() => setCategoryType('INCOME')}
            >
              <Text style={[styles.toggleBtnText, categoryType === 'INCOME' && styles.toggleBtnTextActive]}>Income</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ gap: SPACING.md }}>
          {displayedCategories.map((cat: any) => (
            <View key={cat.categoryId} style={styles.topCatItem}>
              <View style={styles.topCatRow}>
                <View style={[styles.topCatIcon, { backgroundColor: (cat.categoryColor || '#6B7280') + '22' }]}>
                  <Ionicons name={(cat.categoryIcon as any) || 'ellipse-outline'} size={16} color={cat.categoryColor || '#6B7280'} />
                </View>
                <Text style={styles.topCatName} numberOfLines={1}>{cat.categoryName}</Text>
                <Text style={styles.topCatAmt}>{formatCurrency(cat.amount)}</Text>
                <Text style={styles.topCatPct}>{cat.percentage}%</Text>
              </View>
              <View style={styles.topCatBarTrack}>
                <View style={[styles.topCatBarFill, { width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.categoryColor || COLORS.primary }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },

  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  periodChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: COLORS.border },
  periodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  periodChipTextActive: { color: '#FFFFFF', fontWeight: '800', fontFamily: 'Outfit-Bold' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  exportBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  summaryCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  summaryPeriod: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans-Medium', letterSpacing: 0.5, marginBottom: SPACING.sm },
  summaryMetrics: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', textTransform: 'uppercase' },
  summaryVal: { fontSize: 14, fontWeight: '800', fontFamily: 'Outfit-Bold', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: COLORS.border },

  savingsRateWrap: { marginTop: SPACING.md },
  savingsRateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  savingsRateLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  savingsRateVal: { fontSize: 12, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  savingsRateTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  savingsRateFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },

  chartCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  chartTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: COLORS.textMuted, marginLeft: 3, fontFamily: 'DMSans-Regular' },

  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110, paddingTop: 10 },
  barGroup: { flex: 1, alignItems: 'center' },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontFamily: 'DMSans-Regular' },

  topCatsCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  topCatsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  topCatsTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  breakdownToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: RADIUS.md, padding: 2 },
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  toggleBtnActive: { backgroundColor: '#FFFFFF', ...SHADOWS.sm },
  toggleBtnText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  toggleBtnTextActive: { color: COLORS.text, fontWeight: '800' },

  topCatItem: { gap: 4 },
  topCatRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  topCatIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topCatName: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium' },
  topCatAmt: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  topCatPct: { fontSize: 11, color: COLORS.textMuted, width: 30, textAlign: 'right', fontFamily: 'DMSans-Regular' },
  topCatBarTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  topCatBarFill: { height: 6, borderRadius: 3 },

  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  trendIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  trendTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  trendText: { fontSize: 12, color: '#64748B', marginTop: 1 },
});
