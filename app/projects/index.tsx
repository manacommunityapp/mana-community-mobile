import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getProjects, getProjectMetrics,
  type CommunityProjectDto, type ProjectMetricsDto,
} from '@/services/projectsService';

const STAGE_ORDER = ['PROPOSAL','VOTING','APPROVED','PLANNING','PROCUREMENT','IN_PROGRESS','QUALITY_CHECK','COMPLETED'] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PROPOSAL:     { label: 'Proposal',     color: '#78909c', bg: '#eceff1' },
  VOTING:       { label: 'Voting',        color: '#7b1fa2', bg: '#f3e5f5' },
  APPROVED:     { label: 'Approved',      color: '#1976d2', bg: '#e3f2fd' },
  PLANNING:     { label: 'Planning',      color: '#f57c00', bg: '#fff3e0' },
  PROCUREMENT:  { label: 'Procurement',   color: '#e64a19', bg: '#fbe9e7' },
  IN_PROGRESS:  { label: 'In Progress',   color: '#388e3c', bg: '#e8f5e9' },
  QUALITY_CHECK:{ label: 'QC Check',      color: '#0097a7', bg: '#e0f7fa' },
  COMPLETED:    { label: 'Completed',     color: '#2e7d32', bg: '#c8e6c9' },
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#78909c', MEDIUM: '#f57c00', HIGH: '#e53935', CRITICAL: '#b71c1c',
};

function fmt(n: number) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  return '₹' + n.toLocaleString('en-IN');
}

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<CommunityProjectDto[]>([]);
  const [metrics, setMetrics] = useState<ProjectMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([getProjects(), getProjectMetrics()])
      .then(([p, m]) => { setProjects(p); setMetrics(m); })
      .finally(() => setLoading(false));
  }, []);

  const displayed = projects.filter(p => {
    const matchFilter = filter === 'ALL' || p.status === filter;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return <ActivityIndicator style={{ flex:1 }} size='large' color='#1565c0' />;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Community Projects</Text>
          <Text style={s.headerSub}>Governance → Finance → Completion</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/projects/create')}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Strip */}
      {metrics && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.metricsRow}>
          {[
            { label: 'Total Projects', value: metrics.totalProjects.toString(), color: '#1565c0' },
            { label: 'Active', value: metrics.activeProjects.toString(), color: '#2e7d32' },
            { label: 'Completed', value: metrics.completedProjects.toString(), color: '#00695c' },
            { label: 'Total Budget', value: fmt(metrics.totalApprovedBudget), color: '#6a1b9a' },
            { label: 'Total Spent', value: fmt(metrics.totalSpent), color: '#e53935' },
            { label: 'Avg Progress', value: metrics.avgCompletionPercent + '%', color: '#f57c00' },
          ].map((m, i) => (
            <View key={i} style={s.metricCard}>
              <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Search */}
      <TextInput
        style={s.search}
        placeholder='Search projects...'
        value={search}
        onChangeText={setSearch}
        placeholderTextColor='#90a4ae'
      />

      {/* Stage Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        {['ALL', ...STAGE_ORDER].map(stage => (
          <TouchableOpacity
            key={stage}
            style={[s.filterChip, filter === stage && s.filterChipActive]}
            onPress={() => setFilter(stage)}
          >
            <Text style={[s.filterChipText, filter === stage && s.filterChipTextActive]}>
              {stage === 'ALL' ? 'All' : (STATUS_META[stage]?.label ?? stage)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Project Cards */}
      <View style={s.projectList}>
        {displayed.map(p => {
          const meta = STATUS_META[p.status];
          return (
            <TouchableOpacity key={p.id} style={s.card} onPress={() => router.push({ pathname: '/projects/detail', params: { id: p.id } })}>
              {/* Status + Priority Row */}
              <View style={s.cardTopRow}>
                <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <View style={[s.priorityDot, { backgroundColor: PRIORITY_COLOR[p.priority] }]} />
                <Text style={[s.priorityLabel, { color: PRIORITY_COLOR[p.priority] }]}>{p.priority}</Text>
              </View>

              {/* Title */}
              <Text style={s.cardTitle}>{p.title}</Text>
              <Text style={s.cardDesc} numberOfLines={2}>{p.description}</Text>

              {/* Budget Row */}
              <View style={s.budgetRow}>
                <Text style={s.budgetLabel}>Budget: <Text style={s.budgetValue}>{fmt(p.budget.approvedBudget)}</Text></Text>
                <Text style={s.budgetLabel}>Spent: <Text style={[s.budgetValue, { color: '#e53935' }]}>{fmt(p.budget.spent)}</Text></Text>
              </View>

              {/* Progress Bar */}
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${p.completionPercent}%` as any, backgroundColor: meta.color }]} />
              </View>
              <View style={s.progressRow}>
                <Text style={s.progressText}>{p.completionPercent}% complete</Text>
                <Text style={s.milestoneText}>
                  {p.milestones.filter(m => m.status === 'COMPLETED').length}/{p.milestones.length} milestones
                </Text>
              </View>

              {/* Vendor */}
              {p.vendor && (
                <Text style={s.vendorText}>🏭 {p.vendor.vendorName}</Text>
              )}

              {/* Tags */}
              {p.tags && p.tags.length > 0 && (
                <View style={s.tagsRow}>
                  {p.tags.map(t => <View key={t} style={s.tag}><Text style={s.tagText}>{t}</Text></View>)}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52, backgroundColor: '#1565c0' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bbdefb', marginTop: 2 },
  addBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#1565c0', fontWeight: '700', fontSize: 14 },
  metricsRow: { paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#0d47a1' },
  metricCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, alignItems: 'center', minWidth: 100 },
  metricValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  metricLabel: { fontSize: 10, color: '#bbdefb', marginTop: 2 },
  search: { margin: 14, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1a1a1a', elevation: 2 },
  filterRow: { paddingHorizontal: 12, marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e3f2fd', marginRight: 8 },
  filterChipActive: { backgroundColor: '#1565c0' },
  filterChipText: { fontSize: 12, color: '#1565c0', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  projectList: { paddingHorizontal: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginRight: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  priorityLabel: { fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#546e7a', marginBottom: 10 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetLabel: { fontSize: 12, color: '#546e7a' },
  budgetValue: { fontWeight: '700', color: '#1a1a1a' },
  progressBg: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 11, color: '#546e7a' },
  milestoneText: { fontSize: 11, color: '#546e7a' },
  vendorText: { fontSize: 12, color: '#455a64', marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  tag: { backgroundColor: '#e8eaf6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, color: '#3949ab', fontWeight: '600' },
});