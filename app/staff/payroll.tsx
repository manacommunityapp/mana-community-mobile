import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { staffService, StaffAttendanceSummary } from '@/services/staffService';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


const ROLE_COLORS: Record<string, string> = {
  MAID: '#7C3AED', COOK: '#D97706', DRIVER: '#2563EB',
  NANNY: '#DB2777', GARDENER: '#059669', SECURITY: '#DC2626', OTHER: '#6B7280',
};

function calcPayroll(summary: StaffAttendanceSummary, dailyWage: number) {
  const effective = summary.presentDays + summary.halfDays * 0.5;
  return Math.round(effective * dailyWage);
}

export default function PayrollScreen() {
  const router = useRouter();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear]  = useState(now.getFullYear());

  const { data: rawSummaries, isLoading } = useQuery<StaffAttendanceSummary[]>({
    queryKey: ['staff', 'payroll-summary', selectedMonth + 1, selectedYear],
    queryFn: () => staffService.getMonthlyPayrollSummaries(selectedMonth + 1, selectedYear),
    staleTime: 60_000,
  });
  const summaries = rawSummaries ?? [];

  const DAILY_WAGE = 400;
  const totalPayroll = summaries.reduce((acc, s) => acc + calcPayroll(s, DAILY_WAGE), 0);
  const avgAttendance = summaries.length
    ? Math.round(summaries.reduce((a, s) => a + s.attendancePercent, 0) / summaries.length)
    : 0;

  const renderSummaryCard = ({ item }: { item: StaffAttendanceSummary }) => {
    const pct = item.attendancePercent;
    const payAmt = calcPayroll(item, DAILY_WAGE);
    const roleColor = ROLE_COLORS[item.role] ?? COLORS.primary;

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={[s.avatar, { backgroundColor: roleColor + '20' }]}>
            <Text style={[s.avatarText, { color: roleColor }]}>{item.staffName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.staffName}>{item.staffName}</Text>
            <View style={[s.roleBadge, { backgroundColor: roleColor + '20' }]}>
              <Text style={[s.roleText, { color: roleColor }]}>{item.role}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.payAmount}>₹{payAmt.toLocaleString('en-IN')}</Text>
            <Text style={s.payLabel}>Est. Pay</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: pct >= 80 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626' }]} />
          </View>
          <Text style={s.pctText}>{pct.toFixed(0)}%</Text>
        </View>

        <View style={s.statsRow}>
          {[
            { label: 'Present', value: item.presentDays, color: '#059669' },
            { label: 'Absent',  value: item.absentDays,  color: '#DC2626' },
            { label: 'Leave',   value: item.leaveDays,   color: '#D97706' },
            { label: 'Half Day',value: item.halfDays,     color: '#6B7280' },
          ].map(stat => (
            <View key={stat.label} style={s.statCell}>
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Payroll Report</Text>
          <Text style={s.headerSub}>Attendance · Salary estimate</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Month selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.monthScroll}
        style={s.monthScrollContainer}
      >
        {MONTHS.map((m, i) => (
          <TouchableOpacity
            key={m}
            style={[s.monthChip, selectedMonth === i && s.monthChipActive]}
            onPress={() => setSelectedMonth(i)}
          >
            <Text style={[s.monthChipText, selectedMonth === i && s.monthChipTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary header */}
      <View style={s.summaryBar}>
        <View style={s.summaryCell}>
          <Text style={s.summaryValue}>{summaries.length}</Text>
          <Text style={s.summaryLabel}>Staff</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryCell}>
          <Text style={s.summaryValue}>{avgAttendance}%</Text>
          <Text style={s.summaryLabel}>Avg Attendance</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryCell}>
          <Text style={[s.summaryValue, { color: '#059669' }]}>₹{totalPayroll.toLocaleString('en-IN')}</Text>
          <Text style={s.summaryLabel}>Est. Total</Text>
        </View>
      </View>

      <View style={s.disclaimerRow}>
        <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
        <Text style={s.disclaimerText}>Estimate based on ₹{DAILY_WAGE}/day. Actual wages may vary.</Text>
      </View>

      {isLoading ? (
        <View style={s.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={item => String(item.staffId)}
          renderItem={renderSummaryCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No records for {MONTHS[selectedMonth]}</Text>
              <Text style={s.emptySub}>Attendance records will appear once staff are logged in for this month.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },

  monthScrollContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.08)' },
  monthScroll: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  monthChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  monthChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthChipText: { fontSize: 13, fontFamily: 'DMSans-Medium', fontWeight: '600', color: COLORS.textSecondary },
  monthChipTextActive: { color: '#fff', fontFamily: 'Outfit-Bold', fontWeight: '700' },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md, marginHorizontal: SPACING.md, marginTop: SPACING.md,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.sm,
  },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(99,102,241,0.15)' },
  summaryValue: { fontSize: 20, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold', letterSpacing: -0.5 },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },

  disclaimerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  disclaimerText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  staffName: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginTop: 3 },
  roleText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  payAmount: { fontSize: 17, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold', letterSpacing: -0.3 },
  payLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  pctText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold', width: 36, textAlign: 'right' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCell: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: '800', fontFamily: 'Outfit-Bold', letterSpacing: -0.3 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, fontFamily: 'DMSans-Regular', lineHeight: 18 },
});
