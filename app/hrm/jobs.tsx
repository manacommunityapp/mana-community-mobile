import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, ScrollView,
  RefreshControl, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import { hrmService } from '@/services/hrmService';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import type { MwJobListing, MwJobApplication, JobApplicationStatus, EmploymentType } from '@/types/hrm';

// ── Helpers ──────────────────────────────────────────────────────────

const APP_STATUS_COLOR: Record<JobApplicationStatus, { bg: string; text: string }> = {
  APPLIED:     { bg: '#FEF9C3', text: '#713F12' },
  SHORTLISTED: { bg: '#DBEAFE', text: '#1E40AF' },
  OFFERED:     { bg: '#D1FAE5', text: '#065F46' },
  REJECTED:    { bg: '#FEE2E2', text: '#991B1B' },
  WITHDRAWN:   { bg: '#F1F5F9', text: '#64748B' },
};

const EMP_TYPE_SHORT: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time',
  CONTRACT: 'Contract', INTERNSHIP: 'Intern', GIG: 'Gig',
};

function fmtSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const f = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${f(min)}–${f(max)}`;
  if (min) return `From ${f(min)}`;
  return `Up to ${f(max!)}`;
}

// ── Apply Modal ──────────────────────────────────────────────────────

function ApplyModal({ job, appliedIds, onClose }: {
  job: MwJobListing | null;
  appliedIds: Set<number>;
  onClose: () => void;
}) {
  const [coverNote, setCoverNote] = useState('');
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => hrmService.applyToJob(job!.id, coverNote || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myJobApps'] }); onClose(); setCoverNote(''); },
    onError: () => Alert.alert('Error', 'Failed to apply'),
  });

  if (!job) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Apply: {job.title}</Text>
          <Text style={styles.label}>Cover Note (optional)</Text>
          <TextInput
            value={coverNote} onChangeText={setCoverNote}
            multiline numberOfLines={4} placeholder="Tell them why you're a great fit..."
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity onPress={onClose} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => mutation.mutate()} disabled={mutation.isPending} style={styles.btnPrimary}>
              {mutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Job Card ─────────────────────────────────────────────────────────

function JobCard({ item, appliedIds, onApply }: {
  item: MwJobListing;
  appliedIds: Set<number>;
  onApply: (j: MwJobListing) => void;
}) {
  const applied = appliedIds.has(item.id);
  const salary = fmtSalary(item.salaryMin, item.salaryMax);
  return (
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <TouchableOpacity
          onPress={() => !applied && onApply(item)}
          disabled={applied}
          style={[styles.applyBtn, applied && styles.appliedBtn]}
        >
          <Text style={[styles.applyBtnText, applied && styles.appliedBtnText]}>
            {applied ? 'Applied' : 'Apply'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <View style={styles.chip}><Text style={styles.chipText}>{EMP_TYPE_SHORT[item.employmentType] || item.employmentType}</Text></View>
        {item.isRemote && <View style={[styles.chip, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.chipText, { color: '#1E40AF' }]}>Remote OK</Text></View>}
      </View>
      {(item.location || salary) && (
        <Text style={styles.meta}>
          {[item.location, salary].filter(Boolean).join(' · ')}
        </Text>
      )}
      {item.requiredSkills && (
        <Text style={styles.skills} numberOfLines={1}>{item.requiredSkills}</Text>
      )}
    </View>
  );
}

// ── Application Row ──────────────────────────────────────────────────

function AppRow({ item }: { item: MwJobApplication }) {
  const sc = APP_STATUS_COLOR[item.status as JobApplicationStatus] ?? APP_STATUS_COLOR.APPLIED;
  return (
    <View style={[styles.card, SHADOWS.sm, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>Job #{item.jobId}</Text>
        <Text style={styles.meta}>Applied {new Date(item.appliedAt).toLocaleDateString('en-IN')}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
        <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────

export default function JobsScreen() {
  const { activeOrgId } = useHrmOrg();
  const [tab, setTab] = useState<'board' | 'myapps'>('board');
  const [search, setSearch] = useState('');
  const [applyTarget, setApplyTarget] = useState<MwJobListing | null>(null);

  const jobsQ = useQuery({
    queryKey: ['communityJobs', search],
    queryFn: () => hrmService.getCommunityJobs(search || undefined),
  });

  const myAppsQ = useQuery({
    queryKey: ['myJobApps'],
    queryFn: () => hrmService.getMyJobApplications(),
    enabled: tab === 'myapps',
  });

  const appliedIds = new Set((myAppsQ.data ?? []).map((a) => a.jobId));

  const renderJob = useCallback(({ item }: { item: MwJobListing }) => (
    <JobCard item={item} appliedIds={appliedIds} onApply={setApplyTarget} />
  ), [appliedIds]);

  const renderApp = useCallback(({ item }: { item: MwJobApplication }) => (
    <AppRow item={item} />
  ), []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Job Board' }} />

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['board', 'myapps'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'board' ? 'Job Board' : 'My Applications'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'board' && (
        <>
          <View style={styles.searchRow}>
            <TextInput
              value={search} onChangeText={setSearch}
              placeholder="Search jobs..."
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          {jobsQ.isLoading ? (
            <ActivityIndicator style={styles.loader} color={COLORS.primary} />
          ) : (
            <FlatList
              data={jobsQ.data ?? []}
              keyExtractor={(i) => String(i.id)}
              renderItem={renderJob}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={jobsQ.isFetching} onRefresh={() => jobsQ.refetch()} />}
              ListEmptyComponent={<Text style={styles.empty}>No jobs found{search ? ` for "${search}"` : ''}.</Text>}
            />
          )}
        </>
      )}

      {tab === 'myapps' && (
        myAppsQ.isLoading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} />
        ) : (
          <FlatList
            data={myAppsQ.data ?? []}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderApp}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={myAppsQ.isFetching} onRefresh={() => myAppsQ.refetch()} />}
            ListEmptyComponent={<Text style={styles.empty}>No applications yet.</Text>}
          />
        )
      )}

      <ApplyModal job={applyTarget} appliedIds={appliedIds} onClose={() => setApplyTarget(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderColor: COLORS.primary },
  tabText: { ...FONTS.sm, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8, ...FONTS.sm, color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  list: { padding: 16, gap: 10 },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary, ...FONTS.sm },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, ...FONTS.sm, fontWeight: '600', color: COLORS.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { ...FONTS.xs, color: COLORS.textSecondary },
  meta: { ...FONTS.xs, color: COLORS.textSecondary },
  skills: { ...FONTS.xs, color: COLORS.primary },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { ...FONTS.xs, fontWeight: '600' },
  applyBtn: {
    borderRadius: RADIUS.sm, backgroundColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  appliedBtn: { backgroundColor: '#D1FAE5' },
  applyBtnText: { ...FONTS.xs, color: '#fff', fontWeight: '600' },
  appliedBtnText: { color: '#065F46' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 20, gap: 10,
  },
  modalTitle: { ...FONTS.base, fontWeight: '700', color: COLORS.text },
  label: { ...FONTS.xs, color: COLORS.textSecondary, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8, ...FONTS.sm, color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnPrimary: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  btnPrimaryText: { ...FONTS.sm, color: '#fff', fontWeight: '600' },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  btnSecondaryText: { ...FONTS.sm, color: COLORS.text },
});
