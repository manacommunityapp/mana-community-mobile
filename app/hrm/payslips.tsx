import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { Payslip } from '@/types/hrm';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: number) { return `₹${Math.round(n).toLocaleString('en-IN')}`; }

function PayslipCard({ item }: { item: Payslip }) {
  const run = item.payrollRun;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.period}>{MONTHS[(run.payrollMonth ?? 1) - 1]} {run.payrollYear}</Text>
        <Text style={styles.net}>{fmt(item.netSalary)}</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.col}><Text style={styles.colVal}>{fmt(item.grossSalary)}</Text><Text style={styles.colLabel}>Gross</Text></View>
        <View style={styles.col}><Text style={[styles.colVal, { color: COLORS.error }]}>{fmt(item.totalDeductions)}</Text><Text style={styles.colLabel}>Deductions</Text></View>
        <View style={styles.col}><Text style={styles.colVal}>{item.paidDays}/{item.workingDays}</Text><Text style={styles.colLabel}>Days</Text></View>
      </View>
      <View style={styles.breakdown}>
        {[
          ['Basic', item.basicSalary],
          ['HRA', item.hra],
          ['Special Allow.', item.specialAllowance],
          ['PF (Emp)', item.pfEmployee],
          ['ESI (Emp)', item.esiEmployee],
          ['Prof. Tax', item.professionalTax],
          ['TDS', item.tds],
        ].map(([label, val]) => (
          <View key={label as string} style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{label as string}</Text>
            <Text style={styles.breakdownVal}>{fmt(val as number)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PayslipsScreen() {
  const { data: orgs } = useQuery({ queryKey: ['hrm-my-orgs'], queryFn: hrmService.getMyOrganizations });
  const orgId = orgs?.[0]?.id;

  const { data: payslips, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-my-payslips', orgId],
    queryFn: () => hrmService.getMyPayslips(orgId!),
    enabled: !!orgId,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title="My Payslips" showBack />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={payslips ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <PayslipCard item={item} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No payslips available yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 16, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  period: { ...FONTS.semibold, fontSize: 16, color: COLORS.text },
  net: { ...FONTS.bold, fontSize: 18, color: COLORS.success },
  row: { flexDirection: 'row', marginBottom: 12 },
  col: { flex: 1, alignItems: 'center' },
  colVal: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  colLabel: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  breakdown: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, gap: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  breakdownVal: { ...FONTS.regular, fontSize: 12, color: COLORS.text },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, ...FONTS.regular },
});
