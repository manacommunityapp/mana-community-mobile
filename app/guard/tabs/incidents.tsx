import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { guardService, type GuardIncident, type IncidentStatus, type IncidentPriority } from '@/services/guardService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'open' | 'escalated' | 'resolved';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_META: Record<IncidentStatus, { label: string; color: string; bg: string }> = {
  OPEN:      { label: 'Open',      color: COLORS.error,   bg: COLORS.errorLight },
  ESCALATED: { label: 'Escalated', color: COLORS.warning, bg: COLORS.warningLight },
  RESOLVED:  { label: 'Resolved',  color: COLORS.success, bg: COLORS.successLight },
};

const PRIORITY_META: Record<IncidentPriority, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  LOW:      { label: 'Low',      color: '#6B7280', bg: '#F3F4F6', icon: 'arrow-down' },
  MEDIUM:   { label: 'Medium',   color: COLORS.warning, bg: COLORS.warningLight, icon: 'remove' },
  HIGH:     { label: 'High',     color: '#EA580C', bg: '#FFF7ED', icon: 'arrow-up' },
  CRITICAL: { label: 'Critical', color: COLORS.error, bg: COLORS.errorLight, icon: 'alert-circle' },
};

const FILTER_STATUS: Record<FilterKey, IncidentStatus> = {
  open: 'OPEN',
  escalated: 'ESCALATED',
  resolved: 'RESOLVED',
};

export default function GuardIncidentsScreen() {
  const [incidents, setIncidents] = useState<GuardIncident[]>([]);
  const [filter, setFilter] = useState<FilterKey>('open');
  const [refreshing, setRefreshing] = useState(false);

  const loadIncidents = async () => {
    const data = await guardService.getIncidents();
    setIncidents(data);
  };

  useEffect(() => { loadIncidents(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncidents();
    setRefreshing(false);
  };

  const filtered = incidents.filter(i => i.status === FILTER_STATUS[filter]);
  const counts: Record<FilterKey, number> = {
    open: incidents.filter(i => i.status === 'OPEN').length,
    escalated: incidents.filter(i => i.status === 'ESCALATED').length,
    resolved: incidents.filter(i => i.status === 'RESOLVED').length,
  };

  const renderIncident = ({ item }: { item: GuardIncident }) => {
    const statusMeta = STATUS_META[item.status];
    const priorityMeta = PRIORITY_META[item.priority];

    return (
      <View style={[s.card, item.priority === 'HIGH' || item.priority === 'CRITICAL' ? s.cardUrgent : null]}>
        <View style={s.cardTop}>
          <View style={[s.incidentIcon, { backgroundColor: statusMeta.bg }]}>
            <Ionicons
              name={item.priority === 'HIGH' || item.priority === 'CRITICAL' ? 'alert-circle' : 'warning'}
              size={20}
              color={statusMeta.color}
            />
          </View>
          <View style={s.cardBody}>
            <View style={s.titleRow}>
              <Text style={s.incidentTitle} numberOfLines={1}>{item.title}</Text>
            </View>
            <Text style={s.incidentDesc} numberOfLines={2}>{item.description}</Text>
            <View style={s.metaRow}>
              <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{item.location}</Text>
              <Text style={s.metaDot}>·</Text>
              <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{formatTimeAgo(item.reportedAt)}</Text>
            </View>
          </View>
        </View>

        <View style={s.cardFooter}>
          <View style={s.badgeRow}>
            <View style={[s.priorityBadge, { backgroundColor: priorityMeta.bg }]}>
              <Ionicons name={priorityMeta.icon} size={10} color={priorityMeta.color} />
              <Text style={[s.priorityText, { color: priorityMeta.color }]}>{priorityMeta.label}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[s.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>
          {item.assignedTo && (
            <View style={s.assignedRow}>
              <Ionicons name="person-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.assignedText}>{item.assignedTo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Incidents</Text>
          <Text style={s.headerSub}>{counts.open + counts.escalated} active</Text>
        </View>
        <TouchableOpacity style={s.headerBtn}>
          <Ionicons name="add" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
            </Text>
            {counts[f.key] > 0 && (
              <View style={[s.filterCount, filter === f.key && s.filterCountActive]}>
                <Text style={[s.filterCountText, filter === f.key && s.filterCountTextActive]}>
                  {counts[f.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderIncident}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>All clear</Text>
            <Text style={s.emptyDesc}>No {filter} incidents</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  filterCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.border, paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  filterCountTextActive: { color: '#fff' },
  list: { padding: 12, gap: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardUrgent: { borderColor: COLORS.error, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  incidentIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  incidentTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  incidentDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  metaDot: { fontSize: 11, color: COLORS.textMuted, marginHorizontal: 2 },
  cardFooter: {
    paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: 6 },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 3,
  },
  priorityText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  assignedText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
