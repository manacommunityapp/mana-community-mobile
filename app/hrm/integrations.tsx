import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  TextInput, ActivityIndicator, Alert, StyleSheet, FlatList,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import { hrmService } from '@/services/hrmService';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import type { MwIntegrationConfig, MwFreshAssignment } from '@/types/hrm';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    ASSIGNED:    { bg: '#FEF9C3', text: '#713F12' },
    IN_PROGRESS: { bg: '#DBEAFE', text: '#1E40AF' },
    COMPLETED:   { bg: '#D1FAE5', text: '#065F46' },
  };
  const s = map[status] ?? { bg: '#F1F5F9', text: '#64748B' };
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: s.text }}>{status}</Text>
    </View>
  );
}

export default function IntegrationsScreen() {
  const { activeOrgId } = useHrmOrg();
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['integration-config', activeOrgId],
    queryFn: () => hrmService.getIntegrationConfig(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: deliveries } = useQuery({
    queryKey: ['fresh-deliveries', activeOrgId],
    queryFn: () => hrmService.getOrgFreshDeliveries(activeOrgId!),
    enabled: !!activeOrgId && !!config?.freshEnabled,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<MwIntegrationConfig>) => hrmService.updateIntegrationConfig(activeOrgId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integration-config', activeOrgId] }); Alert.alert('Saved', 'Settings updated'); },
    onError: () => Alert.alert('Error', 'Failed to save settings'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, actualKm, onTime, score }: { id: number; actualKm: number; onTime: boolean; score: number }) =>
      hrmService.completeFreshDelivery(activeOrgId!, id, actualKm, onTime, score),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fresh-deliveries', activeOrgId] }),
  });

  const [form, setForm] = useState<Partial<MwIntegrationConfig>>({});
  const [payForm, setPayForm] = useState({ baseDeliveryPay: '', perKmRate: '', onTimeBonus: '' });

  React.useEffect(() => {
    if (config) {
      setForm(config);
      setPayForm({
        baseDeliveryPay: config.baseDeliveryPay.toString(),
        perKmRate: config.perKmRate.toString(),
        onTimeBonus: config.onTimeBonus.toString(),
      });
    }
  }, [config]);

  function saveToggles() {
    updateMutation.mutate({
      freshEnabled: form.freshEnabled,
      homesEnabled: form.homesEnabled,
      sportsEnabled: form.sportsEnabled,
    });
  }

  function savePay() {
    updateMutation.mutate({
      baseDeliveryPay: Number(payForm.baseDeliveryPay),
      perKmRate: Number(payForm.perKmRate),
      onTimeBonus: Number(payForm.onTimeBonus),
    });
  }

  function promptComplete(item: MwFreshAssignment) {
    Alert.prompt('Actual Distance (km)', `Estimated: ${item.estimatedKm ?? 'N/A'} km`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete', onPress: (km) => {
          if (!km || isNaN(Number(km))) return;
          completeMutation.mutate({ id: item.id, actualKm: Number(km), onTime: true, score: 5 });
        }
      }
    ], 'plain-text', item.estimatedKm?.toString() ?? '');
  }

  if (!activeOrgId) return <View style={s.center}><Text style={s.empty}>Select an organisation first.</Text></View>;
  if (isLoading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} /></View>;

  const modules: { key: keyof MwIntegrationConfig; label: string; desc: string }[] = [
    { key: 'freshEnabled',  label: 'Mana Fresh',  desc: 'Link food delivery orders to assignments' },
    { key: 'homesEnabled',  label: 'Mana Homes',  desc: 'Connect home-services bookings to tasks' },
    { key: 'sportsEnabled', label: 'Mana Sports', desc: 'Tie sports-event staffing to shifts' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Integration Settings', headerBackTitle: 'HRM' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Module Toggles */}
        <Text style={s.sectionTitle}>Module Integrations</Text>
        <View style={[s.card, { marginBottom: 16 }]}>
          {modules.map(({ key, label, desc }) => (
            <View key={key} style={s.toggleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.toggleLabel}>{label}</Text>
                <Text style={s.toggleDesc}>{desc}</Text>
              </View>
              <Switch
                value={!!(form as Record<string, unknown>)[key]}
                onValueChange={v => setForm(f => ({ ...f, [key]: v }))}
                trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          ))}
          <TouchableOpacity style={s.saveBtn} onPress={saveToggles} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> :
              <Text style={s.saveBtnText}>Save Module Settings</Text>}
          </TouchableOpacity>
        </View>

        {/* Pay Config */}
        {form.freshEnabled && (
          <>
            <Text style={s.sectionTitle}>Mana Fresh — Pay Rates</Text>
            <View style={[s.card, { marginBottom: 16 }]}>
              {[
                { field: 'baseDeliveryPay' as const, label: 'Base Pay (₹)' },
                { field: 'perKmRate'       as const, label: 'Per Km Rate (₹)' },
                { field: 'onTimeBonus'     as const, label: 'On-Time Bonus (₹)' },
              ].map(({ field, label }) => (
                <View key={field} style={s.inputRow}>
                  <Text style={s.inputLabel}>{label}</Text>
                  <TextInput
                    style={s.input} keyboardType="decimal-pad"
                    value={payForm[field]}
                    onChangeText={v => setPayForm(f => ({ ...f, [field]: v }))}
                    placeholder="0"
                  />
                </View>
              ))}
              <TouchableOpacity style={s.saveBtn} onPress={savePay} disabled={updateMutation.isPending}>
                <Text style={s.saveBtnText}>Save Pay Rates</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Deliveries */}
        {form.freshEnabled && (
          <>
            <Text style={s.sectionTitle}>Recent Deliveries</Text>
            {!deliveries || deliveries.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.empty}>No delivery assignments yet.</Text>
              </View>
            ) : (
              deliveries.map(d => (
                <View key={d.id} style={[s.card, { marginBottom: 10 }]}>
                  <View style={s.row}>
                    <Text style={s.orderId}>#{d.freshOrderId}</Text>
                    <StatusBadge status={d.operationalAssignment.status} />
                  </View>
                  {(d.pickupLocation || d.dropLocation) && (
                    <Text style={s.route} numberOfLines={1}>
                      {d.pickupLocation ?? '—'} → {d.dropLocation ?? '—'}
                    </Text>
                  )}
                  <View style={[s.row, { marginTop: 6 }]}>
                    <Text style={s.meta}>
                      {d.actualKm != null ? `${d.actualKm} km` : d.estimatedKm != null ? `~${d.estimatedKm} km` : '—'}
                    </Text>
                    <Text style={s.incentive}>₹{d.totalIncentive.toFixed(2)}</Text>
                  </View>
                  {d.operationalAssignment.status === 'IN_PROGRESS' && (
                    <TouchableOpacity style={s.completeBtn} onPress={() => promptComplete(d)}>
                      <Text style={s.completeBtnText}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC' },
  content:      { padding: 16, paddingBottom: 40 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:         { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, ...SHADOWS.sm },
  emptyCard:    { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 24, alignItems: 'center', ...SHADOWS.sm, marginBottom: 16 },
  empty:        { fontSize: 14, color: '#94A3B8' },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toggleLabel:  { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  toggleDesc:   { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  saveBtn:      { marginTop: 12, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center' },
  saveBtnText:  { fontSize: 14, fontWeight: '600', color: '#fff' },
  inputRow:     { marginBottom: 10 },
  inputLabel:   { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  input:        { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderId:      { fontSize: 13, fontWeight: '700', color: '#1E293B', fontFamily: 'monospace' },
  route:        { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  meta:         { fontSize: 12, color: '#64748B' },
  incentive:    { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  completeBtn:  { marginTop: 8, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 7, alignItems: 'center' },
  completeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});
