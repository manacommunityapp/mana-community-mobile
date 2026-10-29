import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { useAuth } from '@/hooks/useAuth';
import {
  guardService,
  type GuardIncident,
  type IncidentStatus,
  type IncidentPriority,
} from '@/services/guardService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'ALL' | 'OPEN' | 'ESCALATED' | 'RESOLVED';

// ─────────────── Constants ───────────────

const PRIORITY_META: Record<IncidentPriority, {
  label: string; color: string; bg: string; border: string; icon: IoniconsName;
}> = {
  LOW:      { label: 'Low',      color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB', icon: 'arrow-down-outline' },
  MEDIUM:   { label: 'Medium',   color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', icon: 'remove-outline' },
  HIGH:     { label: 'High',     color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', icon: 'arrow-up-outline' },
  CRITICAL: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: 'alert-circle-outline' },
};

const STATUS_META: Record<IncidentStatus, {
  label: string; color: string; bg: string; next: IncidentStatus; nextLabel: string;
}> = {
  OPEN:      { label: 'Open',      color: '#DC2626', bg: '#FEF2F2', next: 'ESCALATED', nextLabel: 'Escalate' },
  ESCALATED: { label: 'Escalated', color: '#D97706', bg: '#FFFBEB', next: 'RESOLVED',  nextLabel: 'Resolve' },
  RESOLVED:  { label: 'Resolved',  color: '#059669', bg: '#ECFDF5', next: 'OPEN',      nextLabel: 'Re-open' },
};

const LOCATION_CHIPS = [
  'Main Gate', 'Back Gate', 'Parking', 'Lobby', 'Clubhouse',
  'Pool Area', 'Gym', 'Tower A', 'Tower B', 'Basement',
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL',       label: 'All' },
  { key: 'OPEN',      label: 'Open' },
  { key: 'ESCALATED', label: 'Escalated' },
  { key: 'RESOLVED',  label: 'Resolved' },
];

// ─────────────── Helpers ───────────────

function fmtTimeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtAbsolute(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ─────────────── Incident Card ───────────────

interface IncidentCardProps {
  item: GuardIncident;
  loadingId: number | null;
  onStatusPress: (item: GuardIncident) => void;
}

function IncidentCard({ item, loadingId, onStatusPress }: IncidentCardProps) {
  const pm = PRIORITY_META[item.priority];
  const sm = STATUS_META[item.status];
  const isUrgent = item.priority === 'HIGH' || item.priority === 'CRITICAL';
  const isLoading = loadingId === item.id;

  return (
    <View style={[c.card, isUrgent && { borderLeftWidth: 4, borderLeftColor: pm.color }]}>
      <View style={c.cardTop}>
        <View style={[c.iconBox, { backgroundColor: pm.bg }]}>
          <Ionicons name={pm.icon} size={20} color={pm.color} />
        </View>
        <View style={c.cardBody}>
          <Text style={c.cardTitle} numberOfLines={2}>{item.title}</Text>
          {!!item.description && (
            <Text style={c.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={c.metaRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
            <Text style={c.metaText}>{item.location}</Text>
            <Text style={c.metaDot}>·</Text>
            <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
            <Text style={c.metaText}>{fmtTimeAgo(item.reportedAt)}</Text>
          </View>
          <Text style={c.absTime}>{fmtAbsolute(item.reportedAt)}</Text>
        </View>
      </View>

      <View style={c.cardFooter}>
        <View style={[c.priorityBadge, { backgroundColor: pm.bg, borderColor: pm.border }]}>
          <Ionicons name={pm.icon} size={10} color={pm.color} />
          <Text style={[c.priorityText, { color: pm.color }]}>{pm.label}</Text>
        </View>

        <View style={c.footerRight}>
          {item.assignedTo ? (
            <View style={c.assignedRow}>
              <Ionicons name="person-circle-outline" size={13} color={COLORS.textMuted} />
              <Text style={c.assignedText}>{item.assignedTo}</Text>
            </View>
          ) : (
            <Text style={c.reportedBy}>by {item.reportedBy}</Text>
          )}

          <TouchableOpacity
            style={[c.statusChip, { backgroundColor: sm.bg }]}
            onPress={() => onStatusPress(item)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={sm.color} style={{ marginHorizontal: 8 }} />
            ) : (
              <Text style={[c.statusText, { color: sm.color }]}>{sm.label} ▾</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────── Main Screen ───────────────

export default function GuardIncidentsScreen() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<GuardIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  // Per-card loading: id of the incident whose status is being updated
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Create incident modal
  const [createVisible, setCreateVisible] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<IncidentPriority>('MEDIUM');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status update bottom sheet
  const [statusSheet, setStatusSheet] = useState<{ incident: GuardIncident; next: IncidentStatus } | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadIncidents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [result] = await Promise.allSettled([guardService.getIncidents()]);
    if (result.status === 'fulfilled') setIncidents(result.value);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadIncidents(); }, [loadIncidents]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadIncidents(true);
  }, [loadIncidents]);

  const counts = useMemo<Record<FilterKey, number>>(() => ({
    ALL:       incidents.length,
    OPEN:      incidents.filter(i => i.status === 'OPEN').length,
    ESCALATED: incidents.filter(i => i.status === 'ESCALATED').length,
    RESOLVED:  incidents.filter(i => i.status === 'RESOLVED').length,
  }), [incidents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incidents.filter(i => {
      const matchFilter = filter === 'ALL' || i.status === filter;
      const matchSearch = !q ||
        i.title.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [incidents, filter, search]);

  const handleStatusPress = (item: GuardIncident) => {
    setResolveNote('');
    setStatusSheet({ incident: item, next: STATUS_META[item.status].next });
  };

  const confirmStatusUpdate = async () => {
    if (!statusSheet) return;
    const { incident, next } = statusSheet;
    setStatusSheet(null);
    setLoadingId(incident.id);
    // Optimistic update
    setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, status: next } : i));
    try {
      await guardService.updateIncidentStatus(incident.id, next);
      loadIncidents(true);
    } catch {
      // Rollback on error
      setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, status: incident.status } : i));
    } finally {
      setLoadingId(null);
    }
  };

  const openCreate = () => {
    setFormTitle(''); setFormLocation(''); setFormDesc('');
    setFormPriority('MEDIUM'); setFormError('');
    setCreateVisible(true);
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) { setFormError('Please enter an incident title.'); return; }
    if (!formLocation.trim()) { setFormError('Please select or enter a location.'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const created = await guardService.createIncident({
        title: formTitle.trim(),
        description: formDesc.trim(),
        location: formLocation.trim(),
        priority: formPriority,
        reportedBy: user?.fullName ?? user?.name ?? 'Gate Guard',
      });
      setIncidents(prev => [created, ...prev]);
      setCreateVisible(false);
    } catch {
      setFormError('Unable to submit incident report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Incidents</Text>
          <Text style={s.headerSub}>
            {loading ? 'Loading…' : `${counts.OPEN + counts.ESCALATED} active · ${counts.RESOLVED} resolved`}
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      {!loading && incidents.length > 0 && (
        <View style={s.statsStrip}>
          {[
            { key: 'OPEN' as FilterKey,      val: counts.OPEN,      label: 'Open',      color: '#DC2626' },
            { key: 'ESCALATED' as FilterKey, val: counts.ESCALATED, label: 'Escalated', color: '#D97706' },
            { key: 'RESOLVED' as FilterKey,  val: counts.RESOLVED,  label: 'Resolved',  color: '#059669' },
          ].map((cell, i) => (
            <TouchableOpacity
              key={cell.key}
              style={[s.statsCell, filter === cell.key && s.statsCellActive, i > 0 && s.statsBorder]}
              onPress={() => setFilter(filter === cell.key ? 'ALL' : cell.key)}
            >
              <Text style={[s.statsVal, { color: cell.color }]}>{cell.val}</Text>
              <Text style={s.statsLabel}>{cell.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search incidents…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
            {counts[f.key] > 0 && (
              <View style={[s.filterBadge, filter === f.key && s.filterBadgeActive]}>
                <Text style={[s.filterBadgeText, filter === f.key && s.filterBadgeTextActive]}>
                  {counts[f.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={GUARD_COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <IncidentCard
              item={item}
              loadingId={loadingId}
              onStatusPress={handleStatusPress}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons
                name={search ? 'search-outline' : 'checkmark-circle-outline'}
                size={52} color={COLORS.textMuted}
              />
              <Text style={s.emptyTitle}>{search ? 'No results' : 'All clear'}</Text>
              <Text style={s.emptyDesc}>
                {search
                  ? `No incidents matching "${search}"`
                  : `No ${filter === 'ALL' ? '' : filter.toLowerCase() + ' '}incidents`}
              </Text>
              {filter === 'ALL' && !search && (
                <TouchableOpacity style={s.emptyBtn} onPress={openCreate}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={s.emptyBtnText}>Report Incident</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Status Update Bottom Sheet ── */}
      <Modal visible={!!statusSheet} transparent animationType="slide" onRequestClose={() => setStatusSheet(null)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={s.backdropTouch} onPress={() => setStatusSheet(null)} />
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Update Status</Text>
                {statusSheet && (
                  <Text style={s.sheetSub} numberOfLines={2}>
                    Move to{' '}
                    <Text style={{ fontWeight: '800', color: STATUS_META[statusSheet.next].color }}>
                      {STATUS_META[statusSheet.next].label}
                    </Text>
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setStatusSheet(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.sheetBody}>
              {statusSheet?.incident.title ? (
                <View style={s.incidentPreview}>
                  <Ionicons
                    name={PRIORITY_META[statusSheet.incident.priority].icon}
                    size={14}
                    color={PRIORITY_META[statusSheet.incident.priority].color}
                  />
                  <Text style={s.incidentPreviewText} numberOfLines={1}>
                    {statusSheet.incident.title}
                  </Text>
                </View>
              ) : null}

              {statusSheet?.next === 'RESOLVED' && (
                <>
                  <Text style={s.fieldLabel}>Resolution Note (optional)</Text>
                  <TextInput
                    style={[s.textInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Describe how the incident was resolved…"
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    value={resolveNote}
                    onChangeText={setResolveNote}
                    autoFocus
                  />
                </>
              )}

              <View style={s.sheetBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setStatusSheet(null)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.confirmBtn,
                    { backgroundColor: statusSheet ? STATUS_META[statusSheet.next].color : GUARD_COLORS.accent },
                    statusUpdating && { opacity: 0.7 },
                  ]}
                  onPress={confirmStatusUpdate}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.confirmBtnText}>
                      {statusSheet ? STATUS_META[statusSheet.next].nextLabel : 'Confirm'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Create Incident Bottom Sheet ── */}
      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={s.backdropTouch} onPress={() => setCreateVisible(false)} />
          <View style={[s.bottomSheet, { maxHeight: '92%' }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeaderRow}>
              <Text style={s.sheetTitle}>Report Incident</Text>
              <TouchableOpacity onPress={() => setCreateVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.sheetBody}>
                {/* Title */}
                <Text style={s.fieldLabel}>Incident Title *</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Blocked Emergency Exit, Noise Complaint"
                  placeholderTextColor={COLORS.textMuted}
                  value={formTitle}
                  onChangeText={t => { setFormTitle(t); setFormError(''); }}
                  returnKeyType="next"
                />

                {/* Location */}
                <Text style={s.fieldLabel}>Location *</Text>
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipRow}
                >
                  {LOCATION_CHIPS.map(loc => (
                    <TouchableOpacity
                      key={loc}
                      style={[s.locChip, formLocation === loc && s.locChipActive]}
                      onPress={() => { setFormLocation(formLocation === loc ? '' : loc); setFormError(''); }}
                    >
                      <Text style={[s.locChipText, formLocation === loc && s.locChipTextActive]}>
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={[s.textInput, { marginTop: 8 }]}
                  placeholder="Or type a custom location"
                  placeholderTextColor={COLORS.textMuted}
                  value={LOCATION_CHIPS.includes(formLocation) ? '' : formLocation}
                  onChangeText={v => { setFormLocation(v); setFormError(''); }}
                />

                {/* Priority */}
                <Text style={s.fieldLabel}>Priority</Text>
                <View style={s.priorityRow}>
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as IncidentPriority[]).map(p => {
                    const pm = PRIORITY_META[p];
                    const sel = formPriority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[s.priorityChip, sel && { backgroundColor: pm.bg, borderColor: pm.color }]}
                        onPress={() => setFormPriority(p)}
                      >
                        <Ionicons name={pm.icon} size={12} color={sel ? pm.color : COLORS.textMuted} />
                        <Text style={[s.priorityChipText, sel && { color: pm.color, fontWeight: '700' }]}>
                          {pm.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Details */}
                <Text style={s.fieldLabel}>Details</Text>
                <TextInput
                  style={[s.textInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Describe the incident, immediate actions taken…"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={formDesc}
                  onChangeText={setFormDesc}
                />

                {/* Inline error */}
                {formError ? (
                  <View style={s.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
                    <Text style={s.errorText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={[s.sheetBtns, { marginBottom: 8 }]}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setCreateVisible(false)}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.confirmBtn, { backgroundColor: GUARD_COLORS.accent }, submitting && { opacity: 0.7 }]}
                    onPress={handleCreate}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send-outline" size={15} color="#fff" />
                        <Text style={s.confirmBtnText}>Submit Report</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────── Card styles ───────────────

const c = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  cardDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  metaDot: { fontSize: 11, color: COLORS.textMuted, marginHorizontal: 1 },
  absTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1,
  },
  priorityText: { fontSize: 10, fontWeight: '700' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  assignedText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  reportedBy: { fontSize: 11, color: COLORS.textMuted },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.sm, minWidth: 68, alignItems: 'center',
  },
  statusText: { fontSize: 11, fontWeight: '700' },
});

// ─────────────── Screen styles ───────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: GUARD_COLORS.accent, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },

  statsStrip: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 10,
  },
  statsCell: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 },
  statsCellActive: { backgroundColor: COLORS.surfaceAlt },
  statsBorder: { borderLeftWidth: 1, borderLeftColor: COLORS.border },
  statsVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statsLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 6 },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  filterBadge: {
    minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.border, paddingHorizontal: 4,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  filterBadgeTextActive: { color: '#fff' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.sm + 4, gap: SPACING.sm, paddingBottom: 32 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: 10, paddingHorizontal: 20, ...SHADOWS.sm,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Shared sheet layout
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...SHADOWS.floating,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeaderRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sheetSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  sheetBody: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 4 },

  incidentPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 4,
  },
  incidentPreviewText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },

  sheetBtns: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontWeight: '700', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: RADIUS.md, ...SHADOWS.sm,
  },
  confirmBtnText: { fontWeight: '800', fontSize: 14, color: '#fff' },

  // Form
  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  locChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  locChipActive: { backgroundColor: GUARD_COLORS.accentLight, borderColor: GUARD_COLORS.accent },
  locChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  locChipTextActive: { color: GUARD_COLORS.accentDark, fontWeight: '700' },
  priorityRow: { flexDirection: 'row', gap: 6 },
  priorityChip: {
    flex: 1, paddingVertical: 8, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  priorityChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: COLORS.errorLight, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  errorText: { flex: 1, fontSize: 12, color: COLORS.error, fontWeight: '600' },
});
