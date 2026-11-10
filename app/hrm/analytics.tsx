import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '@/constants/config';

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={[s.statCard, SHADOWS.sm]}>
      <View style={[s.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function HrmAnalyticsScreen() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id;

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['hrm-analytics-dashboard', orgId],
    queryFn: () => hrmService.getHrDashboard(orgId!),
    enabled: !!orgId,
  });

  const { data: deptBreakdown } = useQuery({
    queryKey: ['hrm-dept-breakdown', orgId],
    queryFn: () => hrmService.getDepartmentBreakdown(orgId!),
    enabled: !!orgId,
  });

  const { data: workforceMetrics } = useQuery({
    queryKey: ['hrm-workforce-metrics', orgId],
    queryFn: () => hrmService.getWorkforceMetrics(orgId!),
    enabled: !!orgId,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <Header title="HR Analytics" />
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Header title="HR Analytics" />
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Headcount Stats */}
        <Text style={s.sectionTitle}>Headcount Overview</Text>
        <View style={s.statRow}>
          <StatCard label="Total" value={dashboard?.totalEmployees ?? 0} icon="people-outline" color={COLORS.primary} />
          <StatCard label="Active" value={dashboard?.activeEmployees ?? 0} icon="checkmark-circle-outline" color={COLORS.success} />
          <StatCard label="Inactive" value={dashboard?.inactiveEmployees ?? 0} icon="close-circle-outline" color={COLORS.error} />
        </View>

        <View style={[s.card, SHADOWS.sm]}>
          <View style={s.cardRow}>
            <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
            <Text style={s.cardLabel}>Avg Tenure</Text>
            <Text style={s.cardValue}>{dashboard?.avgTenureMonths ?? 0} months</Text>
          </View>
        </View>

        {/* Department Breakdown */}
        {deptBreakdown && deptBreakdown.length > 0 && (
          <>
            <Text style={s.sectionTitle}>By Department</Text>
            <View style={[s.card, SHADOWS.sm]}>
              {deptBreakdown.map((dept: any) => (
                <View key={dept.departmentId} style={s.deptRow}>
                  <Text style={s.deptName}>{dept.departmentName}</Text>
                  <View style={s.deptBar}>
                    <View
                      style={[
                        s.deptBarFill,
                        {
                          width: `${Math.min(100, (dept.employeeCount / (dashboard?.totalEmployees || 1)) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.deptCount}>{dept.employeeCount}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Tenure Distribution */}
        {workforceMetrics?.tenureBands && (
          <>
            <Text style={s.sectionTitle}>Tenure Distribution</Text>
            <View style={[s.card, SHADOWS.sm]}>
              {Object.entries(workforceMetrics.tenureBands).map(([band, count]) => (
                <View key={band} style={s.tenureRow}>
                  <Text style={s.tenureLabel}>{band.replace(/_/g, ' ')}</Text>
                  <Text style={s.tenureCount}>{count as number}</Text>
                </View>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.md, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.md },
  statRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 4 },
  statIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  statLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardLabel: { flex: 1, fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
  cardValue: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text },
  deptRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  deptName: { width: 100, fontSize: 12, fontFamily: FONTS.medium, color: COLORS.text },
  deptBar: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  deptBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  deptCount: { width: 28, fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.text, textAlign: 'right' },
  tenureRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tenureLabel: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.text, textTransform: 'capitalize' },
  tenureCount: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.primary },
});
