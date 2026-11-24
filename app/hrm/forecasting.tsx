import React, { useState } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, StyleSheet, Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { hrmService } from '@/services/hrmService';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import type { MwForecastSummary, MwForecastSnapshot } from '@/types/hrm';

type Tab = 'overview' | 'snapshots';

function ConfidenceBadge({ pct }: { pct: number }) {
  const { bg, text } =
    pct >= 70 ? { bg: '#D1FAE5', text: '#065F46' } :
    pct >= 50 ? { bg: '#FEF9C3', text: '#713F12' } :
                { bg: '#FEE2E2', text: '#991B1B' };
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: text }}>{pct}%</Text>
    </View>
  );
}

function ModuleBadge({ module }: { module: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    POOL:       { bg: '#DBEAFE', text: '#1E40AF' },
    JOBS:       { bg: '#EDE9FE', text: '#5B21B6' },
    MANA_FRESH: { bg: '#FFEDD5', text: '#9A3412' },
  };
  const s = map[module] ?? { bg: '#F1F5F9', text: '#475569' };
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: s.text }}>{module}</Text>
    </View>
  );
}

function fmtWeek(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function AddSnapshotModal({ orgId, onClose, onDone }: { orgId: number; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ weekStartDate: '', sourceModule: 'POOL', demandUnits: '', fulfilledUnits: '', avgPayRate: '', workerCount: '' });
  const mutation = useMutation({
    mutationFn: () => hrmService.addForecastSnapshot(orgId, {
      weekStartDate: form.weekStartDate,
      sourceModule: form.sourceModule,
      demandUnits: Number(form.demandUnits),
      fulfilledUnits: Number(form.fulfilledUnits),
      avgPayRate: form.avgPayRate ? Number(form.avgPayRate) : undefined,
      workerCount: Number(form.workerCount),
    }),
    onSuccess: () => { Alert.alert('Saved', 'Snapshot added'); onDone(); },
    onError: () => Alert.alert('Error', 'Failed to save snapshot'),
  });

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={ms.modal}>
        <View style={ms.header}>
          <Text style={ms.headerTitle}>Add Demand Snapshot</Text>
          <TouchableOpacity onPress={onClose}><Text style={ms.cancel}>Cancel</Text></TouchableOpacity>
        </View>
        <ScrollView style={ms.body} keyboardShouldPersistTaps="handled">
          {[
            { key: 'weekStartDate' as const, label: 'Week Start Date (YYYY-MM-DD)', placeholder: '2025-01-13', kbType: 'default' as const },
            { key: 'demandUnits'   as const, label: 'Demand Units', placeholder: '20', kbType: 'numeric' as const },
            { key: 'fulfilledUnits'as const, label: 'Fulfilled Units', placeholder: '15', kbType: 'numeric' as const },
            { key: 'avgPayRate'    as const, label: 'Avg Pay Rate (₹)', placeholder: '500', kbType: 'decimal-pad' as const },
            { key: 'workerCount'   as const, label: 'Worker Count', placeholder: '10', kbType: 'numeric' as const },
          ].map(({ key, label, placeholder, kbType }) => (
            <View key={key} style={ms.fieldRow}>
              <Text style={ms.fieldLabel}>{label}</Text>
              <TextInput
                style={ms.input} placeholder={placeholder} keyboardType={kbType}
                value={form[key]} onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
              />
            </View>
          ))}
          <View style={ms.fieldRow}>
            <Text style={ms.fieldLabel}>Module</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {['POOL','JOBS','MANA_FRESH'].map(m => (
                <TouchableOpacity key={m} onPress={() => setForm(f => ({ ...f, sourceModule: m }))}
                  style={[ms.chip, form.sourceModule === m && ms.chipActive]}>
                  <Text style={[ms.chipText, form.sourceModule === m && ms.chipActiveText]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        <TouchableOpacity style={ms.submitBtn} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <ActivityIndicator color="#fff" size="small" /> :
            <Text style={ms.submitText}>Save Snapshot</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function ForecastingScreen() {
  const { activeOrgId } = useHrmOrg();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [showAdd, setShowAdd] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['forecast-summary', activeOrgId],
    queryFn: () => hrmService.getForecastSummary(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const generateMutation = useMutation({
    mutationFn: () => hrmService.generateProjections(activeOrgId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forecast-summary', activeOrgId] }); Alert.alert('Done', 'Projections generated'); },
    onError: () => Alert.alert('Error', 'Failed to generate'),
  });

  if (!activeOrgId) return <View style={s.center}><Text style={s.empty}>Select an organisation first.</Text></View>;
  if (isLoading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} /></View>;

  const gapModules = summary ? Object.keys(summary.gapByModule) : [];

  return (
    <>
      <Stack.Screen options={{ title: 'Forecasting', headerBackTitle: 'HRM' }} />
      <View style={s.container}>
        {/* Tabs */}
        <View style={s.tabBar}>
          {(['overview','snapshots'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'overview' ? 'Overview' : 'Snapshots'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {tab === 'overview' && summary && (
          <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Gap cards */}
            <Text style={s.sectionTitle}>Demand Gap by Module</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {gapModules.length === 0 ? (
                <Text style={s.empty}>No snapshot data yet.</Text>
              ) : gapModules.map(m => {
                const gap = summary.gapByModule[m] ?? 0;
                const isGap = gap > 0;
                return (
                  <View key={m} style={[s.gapCard, { borderColor: isGap ? '#FCA5A5' : '#86EFAC', backgroundColor: isGap ? '#FEF2F2' : '#F0FDF4' }]}>
                    <Text style={[s.gapNum, { color: isGap ? '#DC2626' : '#16A34A' }]}>{gap}</Text>
                    <Text style={s.gapLabel}>unfulfilled</Text>
                    <View style={{ marginTop: 4 }}><ModuleBadge module={m} /></View>
                  </View>
                );
              })}
            </View>

            {/* Generate button */}
            <TouchableOpacity style={s.generateBtn} onPress={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> :
                <Text style={s.generateBtnText}>Generate Projections</Text>}
            </TouchableOpacity>

            {/* Projections */}
            <Text style={[s.sectionTitle, { marginTop: 20 }]}>
              Projections ({summary.config.horizonWeeks}-week horizon)
            </Text>
            {summary.projections.length === 0 ? (
              <View style={s.emptyCard}><Text style={s.empty}>No projections yet. Tap "Generate" above.</Text></View>
            ) : (
              summary.projections.map(p => (
                <View key={p.id} style={[s.projRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.projWeek}>{fmtWeek(p.projectedWeek)}</Text>
                    <View style={{ marginTop: 3 }}><ModuleBadge module={p.sourceModule} /></View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={s.projDemand}>{p.projectedDemand} units</Text>
                    <ConfidenceBadge pct={p.confidencePct} />
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Snapshots Tab */}
        {tab === 'snapshots' && summary && (
          <View style={{ flex: 1 }}>
            <View style={s.addBtnRow}>
              <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
                <Text style={s.addBtnText}>+ Add Snapshot</Text>
              </TouchableOpacity>
            </View>
            {summary.recentSnapshots.length === 0 ? (
              <View style={[s.center, { flex: 1 }]}><Text style={s.empty}>No snapshots recorded yet.</Text></View>
            ) : (
              <FlatList
                data={summary.recentSnapshots}
                keyExtractor={i => i.id.toString()}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                renderItem={({ item }) => {
                  const gap = item.demandUnits - item.fulfilledUnits;
                  return (
                    <View style={[s.snapCard]}>
                      <View style={s.snapHeader}>
                        <Text style={s.snapWeek}>{fmtWeek(item.weekStartDate)}</Text>
                        <ModuleBadge module={item.sourceModule} />
                      </View>
                      <View style={s.snapGrid}>
                        <View style={s.snapStat}><Text style={s.snapNum}>{item.demandUnits}</Text><Text style={s.snapMeta}>demand</Text></View>
                        <View style={s.snapStat}><Text style={s.snapNum}>{item.fulfilledUnits}</Text><Text style={s.snapMeta}>fulfilled</Text></View>
                        <View style={s.snapStat}>
                          <Text style={[s.snapNum, { color: gap > 0 ? '#DC2626' : '#16A34A' }]}>{gap}</Text>
                          <Text style={s.snapMeta}>gap</Text>
                        </View>
                        <View style={s.snapStat}><Text style={s.snapNum}>{item.workerCount}</Text><Text style={s.snapMeta}>workers</Text></View>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>

      {showAdd && activeOrgId && (
        <AddSnapshotModal
          orgId={activeOrgId}
          onClose={() => setShowAdd(false)}
          onDone={() => { setShowAdd(false); qc.invalidateQueries({ queryKey: ['forecast-summary', activeOrgId] }); }}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8FAFC' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:          { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  tabBar:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab:            { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText:        { fontSize: 14, fontWeight: '500', color: '#94A3B8' },
  tabTextActive:  { color: COLORS.primary, fontWeight: '700' },
  body:           { flex: 1 },
  bodyContent:    { padding: 16, paddingBottom: 40 },
  sectionTitle:   { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  gapCard:        { borderWidth: 1, borderRadius: RADIUS.lg, padding: 14, minWidth: '45%', flex: 1 },
  gapNum:         { fontSize: 28, fontWeight: '800' },
  gapLabel:       { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  generateBtn:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  generateBtnText:{ fontSize: 14, fontWeight: '600', color: '#fff' },
  projRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 12, marginBottom: 8, ...SHADOWS.sm },
  projWeek:       { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  projDemand:     { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  emptyCard:      { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 24, alignItems: 'center', ...SHADOWS.sm },
  addBtnRow:      { padding: 16, paddingBottom: 8 },
  addBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center' },
  addBtnText:     { fontSize: 14, fontWeight: '600', color: '#fff' },
  snapCard:       { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, ...SHADOWS.sm },
  snapHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  snapWeek:       { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  snapGrid:       { flexDirection: 'row', justifyContent: 'space-between' },
  snapStat:       { alignItems: 'center' },
  snapNum:        { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  snapMeta:       { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});

const ms = StyleSheet.create({
  modal:        { flex: 1, backgroundColor: '#F8FAFC' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  cancel:       { fontSize: 15, color: COLORS.primary, fontWeight: '500' },
  body:         { flex: 1, padding: 16 },
  fieldRow:     { marginBottom: 14 },
  fieldLabel:   { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 5 },
  input:        { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1E293B', backgroundColor: '#fff' },
  chip:         { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive:   { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText:     { fontSize: 13, color: '#64748B', fontWeight: '500' },
  chipActiveText:{ color: COLORS.primary, fontWeight: '700' },
  submitBtn:    { margin: 16, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  submitText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});
