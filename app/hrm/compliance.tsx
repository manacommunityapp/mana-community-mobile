import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import type { HrComplianceAlert } from '@/types/hrm';

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
  HIGH:     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  MEDIUM:   { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  LOW:      { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
};

function AlertCard({ item, onAcknowledge, onDismiss }: {
  item: HrComplianceAlert;
  onAcknowledge: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const sev = SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.LOW;
  return (
    <View style={[styles.card, { borderLeftColor: sev.border, backgroundColor: sev.bg }]}>
      <View style={styles.rowBetween}>
        <View style={[styles.sevBadge, { backgroundColor: sev.border }]}>
          <Text style={[styles.sevText, { color: sev.text }]}>{item.severity}</Text>
        </View>
        <Text style={styles.type}>{item.alertType.replace(/_/g, ' ')}</Text>
      </View>
      <Text style={[styles.title, { color: sev.text }]}>{item.title}</Text>
      {item.employee && <Text style={styles.employee}>{item.employee.fullName}</Text>}
      {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
      <Text style={styles.due}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
      {item.status === 'OPEN' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warning }]} onPress={() => onAcknowledge(item.id)}>
            <Text style={styles.actionBtnText}>Acknowledge</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.backgroundAlt }]} onPress={() => onDismiss(item.id)}>
            <Text style={[styles.actionBtnText, { color: COLORS.textSecondary }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status === 'ACKNOWLEDGED' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.backgroundAlt }]} onPress={() => onDismiss(item.id)}>
            <Text style={[styles.actionBtnText, { color: COLORS.textSecondary }]}>Dismiss</Text>
          </TouchableOpacity>
          <View style={[styles.sevBadge, { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.sevText, { color: COLORS.success }]}>Acknowledged</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function ComplianceAlertsScreen() {
  const qc = useQueryClient();
  const { data: orgs } = useQuery({ queryKey: ['hrm-my-orgs'], queryFn: hrmService.getMyOrganizations });
  const orgId = orgs?.[0]?.id;

  const { data: alerts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-compliance-alerts', orgId],
    queryFn: () => hrmService.getComplianceAlerts(orgId!),
    enabled: !!orgId,
  });

  const generate = useMutation({
    mutationFn: () => hrmService.generateComplianceAlerts(orgId!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['hrm-compliance-alerts', orgId] });
      Alert.alert('Done', `${res.generated} alert(s) generated.`);
    },
    onError: () => Alert.alert('Error', 'Failed to generate alerts'),
  });

  const acknowledge = useMutation({
    mutationFn: (alertId: number) => hrmService.acknowledgeAlert(orgId!, alertId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hrm-compliance-alerts', orgId] }),
  });

  const dismiss = useMutation({
    mutationFn: (alertId: number) => hrmService.dismissAlert(orgId!, alertId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hrm-compliance-alerts', orgId] }),
  });

  const openAlerts = alerts?.filter(a => a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Compliance Alerts" showBack />
      <View style={styles.headerRow}>
        <Text style={styles.count}>{openAlerts.length} open alert{openAlerts.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity
          style={[styles.generateBtn, generate.isPending && styles.disabled]}
          onPress={() => generate.mutate()}
          disabled={generate.isPending || !orgId}
        >
          <Text style={styles.generateBtnText}>{generate.isPending ? 'Generating…' : '+ Generate'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : openAlerts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>No open alerts</Text>
          <Text style={styles.emptyDesc}>Tap "Generate" to scan for upcoming compliance events.</Text>
        </View>
      ) : (
        <FlatList
          data={openAlerts}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <AlertCard
              item={item}
              onAcknowledge={(id) => acknowledge.mutate(id)}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  count: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  generateBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  generateBtnText: { color: '#fff', fontSize: 13, fontFamily: FONTS.semiBold },
  disabled: { opacity: 0.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, color: COLORS.success, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.semiBold, color: COLORS.text, marginBottom: 4 },
  emptyDesc: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    padding: 14,
    gap: 6,
    ...SHADOWS.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  sevText: { fontSize: 10, fontFamily: FONTS.semiBold },
  type: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted },
  title: { fontSize: 14, fontFamily: FONTS.semiBold },
  employee: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  desc: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },
  due: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md },
  actionBtnText: { fontSize: 12, fontFamily: FONTS.semiBold, color: '#fff' },
});
