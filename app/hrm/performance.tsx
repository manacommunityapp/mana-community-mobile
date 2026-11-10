import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrmService } from '@/services/hrmService';
import type { Goal, Okr, OkrKeyResult } from '@/types/hrm';

type Tab = 'goals' | 'okrs' | 'appraisal';

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, value)}%` as any }]} />
    </View>
  );
}

function GoalsSection({ employeeId, orgId }: { employeeId: number; orgId: number }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [weightage, setWeightage] = useState('10');

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['hrm-goals', employeeId],
    queryFn: () => hrmService.getGoals(employeeId),
  });

  const createGoal = useMutation({
    mutationFn: (data: Partial<Goal>) => hrmService.createGoal(orgId, employeeId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hrm-goals', employeeId] }); setShowForm(false); setTitle(''); },
  });

  const updateProgress = useMutation({
    mutationFn: ({ goalId, pct }: { goalId: number; pct: number }) => hrmService.updateGoalProgress(goalId, pct),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hrm-goals', employeeId] }),
  });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 32 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(v => !v)}>
        <Text style={styles.addBtnText}>+ Add Goal</Text>
      </TouchableOpacity>
      {showForm && (
        <View style={styles.form}>
          <Text style={styles.label}>Goal Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Improve CSAT to 95%" />
          <Text style={styles.label}>Weightage (%)</Text>
          <TextInput style={styles.input} value={weightage} onChangeText={setWeightage} keyboardType="numeric" />
          <TouchableOpacity style={styles.submitBtn} onPress={() => createGoal.mutate({ title, weightage: Number(weightage) })} disabled={!title || createGoal.isPending}>
            <Text style={styles.submitBtnText}>{createGoal.isPending ? 'Saving…' : 'Create Goal'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {goals.map(g => (
        <View key={g.id} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>{g.title}</Text>
            {g.isKra && <View style={styles.kraBadge}><Text style={styles.kraBadgeText}>KRA</Text></View>}
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardMeta}>Progress: {g.achievementPercent}%</Text>
            <Text style={styles.cardMeta}>Weight: {g.weightage}%</Text>
          </View>
          <ProgressBar value={g.achievementPercent} />
          <View style={styles.pctRow}>
            {[25, 50, 75, 100].map(pct => (
              <TouchableOpacity key={pct} style={styles.pctBtn}
                onPress={() => updateProgress.mutate({ goalId: g.id, pct })}>
                <Text style={styles.pctBtnText}>{pct}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      {goals.length === 0 && !showForm && (
        <Text style={styles.empty}>No goals set yet. Tap "+ Add Goal" to start.</Text>
      )}
    </View>
  );
}

function OkrSection({ employeeId, orgId }: { employeeId: number; orgId: number }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [objective, setObjective] = useState('');
  const [quarter, setQuarter] = useState('Q1');

  const { data: okrs = [], isLoading } = useQuery({
    queryKey: ['hrm-okrs', employeeId],
    queryFn: () => hrmService.getOkrs(employeeId),
  });

  const updateKr = useMutation({
    mutationFn: ({ krId, pct }: { krId: number; pct: number }) => hrmService.updateKeyResult(krId, pct),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hrm-okrs', employeeId] }),
  });

  const createOkr = useMutation({
    mutationFn: () => hrmService.createOkr(orgId, { objective, quarter, year: new Date().getFullYear(), keyResults: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hrm-okrs', employeeId] }); setShowForm(false); setObjective(''); },
  });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 32 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(v => !v)}>
        <Text style={styles.addBtnText}>+ Add OKR</Text>
      </TouchableOpacity>
      {showForm && (
        <View style={styles.form}>
          <Text style={styles.label}>Objective</Text>
          <TextInput style={styles.input} value={objective} onChangeText={setObjective} placeholder="e.g. Improve team productivity" />
          <TouchableOpacity style={styles.submitBtn} onPress={() => createOkr.mutate()} disabled={!objective || createOkr.isPending}>
            <Text style={styles.submitBtnText}>{createOkr.isPending ? 'Saving…' : 'Create OKR'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {okrs.map(okr => (
        <View key={okr.id} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>{okr.objective}</Text>
            <Text style={styles.cardMeta}>{okr.overallProgress}%</Text>
          </View>
          {okr.quarter && <Text style={styles.cardMeta}>{okr.quarter} {okr.year}</Text>}
          <ProgressBar value={okr.overallProgress} />
          {(okr.keyResults ?? []).map((kr: OkrKeyResult) => (
            <View key={kr.id} style={styles.krRow}>
              <View style={styles.cardRow}>
                <Text style={styles.krTitle}>{kr.title}</Text>
                <Text style={styles.cardMeta}>{kr.progressPercent}%</Text>
              </View>
              <ProgressBar value={kr.progressPercent} />
              <View style={styles.pctRow}>
                {[25, 50, 75, 100].map(pct => (
                  <TouchableOpacity key={pct} style={styles.pctBtnSm}
                    onPress={() => updateKr.mutate({ krId: kr.id, pct })}>
                    <Text style={styles.pctBtnText}>{pct}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}
      {okrs.length === 0 && !showForm && (
        <Text style={styles.empty}>No OKRs set yet.</Text>
      )}
    </View>
  );
}

function AppraisalSection({ employeeId, orgId }: { employeeId: number; orgId: number }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(3);
  const [comments, setComments] = useState('');
  const [activeCycleId, setActiveCycleId] = useState<number | null>(null);

  const { data: cycles = [] } = useQuery({
    queryKey: ['hrm-cycles', orgId],
    queryFn: () => hrmService.getAppraisalCycles(orgId),
  });

  const activeCycles = cycles.filter(c => c.status === 'ACTIVE');

  const submitSelf = useMutation({
    mutationFn: () => hrmService.submitSelfAppraisal(employeeId, activeCycleId!, rating, comments),
    onSuccess: () => { Alert.alert('Submitted', 'Self appraisal submitted successfully.'); setComments(''); },
  });

  if (activeCycles.length === 0) {
    return <Text style={styles.empty}>No active appraisal cycles at this time.</Text>;
  }

  return (
    <View>
      {activeCycles.map(cycle => (
        <View key={cycle.id} style={styles.card}>
          <Text style={styles.cardTitle}>{cycle.name}</Text>
          <Text style={styles.cardMeta}>{cycle.periodStart} → {cycle.periodEnd}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>Self Rating</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(r => (
              <TouchableOpacity key={r}
                style={[styles.ratingBtn, rating === r && styles.ratingBtnActive]}
                onPress={() => { setRating(r); setActiveCycleId(cycle.id); }}>
                <Text style={[styles.ratingBtnText, rating === r && styles.ratingBtnActiveText]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Comments</Text>
          <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            value={comments} onChangeText={setComments} multiline placeholder="Describe your achievements…" />
          <TouchableOpacity style={styles.submitBtn}
            onPress={() => { setActiveCycleId(cycle.id); submitSelf.mutate(); }}
            disabled={submitSelf.isPending}>
            <Text style={styles.submitBtnText}>{submitSelf.isPending ? 'Submitting…' : 'Submit Self Appraisal'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export default function PerformanceScreen() {
  const [tab, setTab] = useState<Tab>('goals');

  const { data: orgs } = useQuery({ queryKey: ['hrm-my-orgs'], queryFn: hrmService.getMyOrganizations });
  const orgId = orgs?.[0]?.id;
  const { data: profile } = useQuery({ queryKey: ['hrm-profile', orgId], queryFn: () => hrmService.getMyProfile(orgId!), enabled: !!orgId });
  const employeeId = profile?.id;

  if (!orgId || !employeeId) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['goals', 'okrs', 'appraisal'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'goals' ? 'Goals & KRAs' : t === 'okrs' ? 'OKRs' : 'Appraisal'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'goals' && <GoalsSection orgId={orgId} employeeId={employeeId} />}
        {tab === 'okrs' && <OkrSection orgId={orgId} employeeId={employeeId} />}
        {tab === 'appraisal' && <AppraisalSection orgId={orgId} employeeId={employeeId} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: '#6366f1' },
  tabText: { fontSize: 13, color: '#6b7280' },
  tabTextActive: { color: '#6366f1', fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  cardMeta: { fontSize: 12, color: '#6b7280' },
  kraBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  kraBadgeText: { fontSize: 11, color: '#7c3aed', fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginVertical: 8, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#6366f1', borderRadius: 3 },
  pctRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pctBtn: { backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  pctBtnSm: { backgroundColor: '#f3f4f6', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  pctBtnText: { fontSize: 12, color: '#374151' },
  krRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#f3f4f6' },
  krTitle: { fontSize: 13, color: '#374151', flex: 1 },
  addBtn: { backgroundColor: '#ede9fe', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  addBtnText: { color: '#6366f1', fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827', marginBottom: 12 },
  submitBtn: { backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  ratingBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  ratingBtnActive: { borderColor: '#6366f1', backgroundColor: '#6366f1' },
  ratingBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  ratingBtnActiveText: { color: '#fff' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 14 },
});
