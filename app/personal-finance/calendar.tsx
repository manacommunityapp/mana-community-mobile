import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  personalFinanceService,
  PersonalTransactionDto,
} from '@/services/personalFinanceService';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [refreshing, setRefreshing] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const { data: transactions = [], isLoading, refetch } = useQuery<PersonalTransactionDto[]>({
    queryKey: ['personal-finance-transactions'],
    queryFn: () => personalFinanceService.getTransactions(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  // Calendar calculations
  const { daysInMonth, startDayOfWeek, daysArray, dailySummary } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const startDay = firstDay.getDay(); // 0 (Sun) to 6 (Sat)

    const map: Record<string, { income: number; expense: number; txns: PersonalTransactionDto[] }> = {};
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      map[dStr] = { income: 0, expense: 0, txns: [] };
    }

    transactions.forEach(t => {
      if (t.date && map[t.date]) {
        map[t.date].txns.push(t);
        if (t.type === 'INCOME') map[t.date].income += t.amount;
        else if (t.type === 'EXPENSE') map[t.date].expense += t.amount;
      }
    });

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null); // empty prefix padding
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }

    return {
      daysInMonth: totalDays,
      startDayOfWeek: startDay,
      daysArray: days,
      dailySummary: map,
    };
  }, [year, month, transactions]);

  const changeMonth = (offset: number) => {
    const next = new Date(year, month + offset, 1);
    setCurrentDate(next);
    setSelectedDateStr(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const selectedDayData = dailySummary[selectedDateStr] || { income: 0, expense: 0, txns: [] };
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Month Header ── */}
      <View style={styles.monthHeader}>
        <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(1)}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* ── Calendar Grid ── */}
      <View style={styles.calendarCard}>
        {/* Weekday Row */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map(w => (
            <Text key={w} style={styles.weekdayText}>{w}</Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.grid}>
          {daysArray.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDateStr;
            const data = dailySummary[dateStr];
            const hasIncome = (data?.income ?? 0) > 0;
            const hasExpense = (data?.expense ?? 0) > 0;

            return (
              <TouchableOpacity
                key={dateStr}
                style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                onPress={() => setSelectedDateStr(dateStr)}
              >
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                  {day}
                </Text>
                <View style={styles.dotRow}>
                  {hasIncome && <View style={[styles.dot, { backgroundColor: '#10B981' }]} />}
                  {hasExpense && <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Selected Day Summary ── */}
      <View style={styles.daySummaryCard}>
        <View style={styles.daySummaryHeader}>
          <Text style={styles.daySummaryTitle}>
            {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('default', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            style={styles.addDayBtn}
            onPress={() => router.push('/personal-finance/transactions' as any)}
          >
            <Ionicons name="add" size={14} color="#FFFFFF" />
            <Text style={styles.addDayBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dayTotalsRow}>
          <View style={styles.dayTotalItem}>
            <Text style={styles.dayTotalLabel}>Income</Text>
            <Text style={[styles.dayTotalVal, { color: '#10B981' }]}>
              +₹{selectedDayData.income.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.dayTotalDivider} />
          <View style={styles.dayTotalItem}>
            <Text style={styles.dayTotalLabel}>Expense</Text>
            <Text style={[styles.dayTotalVal, { color: '#EF4444' }]}>
              -₹{selectedDayData.expense.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.dayTotalDivider} />
          <View style={styles.dayTotalItem}>
            <Text style={styles.dayTotalLabel}>Net</Text>
            <Text style={[styles.dayTotalVal, { color: COLORS.primary }]}>
              ₹{(selectedDayData.income - selectedDayData.expense).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Selected Day Transactions */}
        <View style={{ marginTop: SPACING.md, gap: SPACING.xs }}>
          {selectedDayData.txns.length === 0 ? (
            <Text style={styles.noTxnText}>No transactions recorded on this date.</Text>
          ) : (
            selectedDayData.txns.map(t => (
              <View key={t.id} style={styles.dayTxnRow}>
                <View style={[styles.dayTxnIcon, { backgroundColor: (t.categoryColor || '#6B7280') + '22' }]}>
                  <Ionicons name={(t.categoryIcon as any) || 'receipt-outline'} size={16} color={t.categoryColor || '#6B7280'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTxnDesc} numberOfLines={1}>{t.description}</Text>
                  <Text style={styles.dayTxnCat}>{t.categoryName} • {t.accountName}</Text>
                </View>
                <Text style={[
                  styles.dayTxnAmt,
                  { color: t.type === 'INCOME' ? '#10B981' : t.type === 'EXPENSE' ? '#EF4444' : '#6366F1' }
                ]}>
                  {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}₹{t.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: SPACING.lg, paddingBottom: 40 },

  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  monthTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  navBtn: { padding: 6, borderRadius: RADIUS.md, backgroundColor: '#F1F5F9' },

  calendarCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  weekdayRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCellEmpty: { width: `${100 / 7}%`, height: 44 },
  dayCell: {
    width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, marginVertical: 2,
  },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayNumber: { fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium' },
  dayNumberSelected: { color: '#FFFFFF', fontWeight: '800' },
  dotRow: { flexDirection: 'row', gap: 3, marginTop: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  daySummaryCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  daySummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  daySummaryTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  addDayBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  dayTotalsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.sm },
  dayTotalItem: { flex: 1, alignItems: 'center' },
  dayTotalLabel: { fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans-Regular' },
  dayTotalVal: { fontSize: 12, fontWeight: '800', fontFamily: 'Outfit-Bold', marginTop: 1 },
  dayTotalDivider: { width: 1, backgroundColor: COLORS.border },

  noTxnText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.md, fontFamily: 'DMSans-Regular' },
  dayTxnRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dayTxnIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayTxnDesc: { fontSize: 12, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium' },
  dayTxnCat: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  dayTxnAmt: { fontSize: 13, fontWeight: '800', fontFamily: 'Outfit-Bold' },
});
