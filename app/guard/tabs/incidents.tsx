import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, TextInput, Alert, ActivityIndicator,
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

const PRIORITY_META: Record<IncidentPriority, {
  label: string; color: string; bg: string; border: string; icon: IoniconsName;
}> = {
  LOW:      { label: 'Low',      color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB', icon: 'arrow-down-outline' },
  MEDIUM:   { label: 'Medium',   color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', icon: 'remove-outline' },
  HIGH:     { label: 'High',     color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', icon: 'arrow-up-outline' },
  CRITICAL: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: 'alert-circle-outline' },
};

const STATUS_META: Record<IncidentStatus, { label: string; color: string; bg: string; next: IncidentStatus }> = {
  OPEN:      { label: 'Open',      color: '#DC2626', bg: '#FEF2F2', next: 'ESCALATED' },
  ESCALATED: { label: 'Escalated', color: '#D97706', bg: '#FFFBEB', next: 'RESOLVED' },
  RESOLVED:  { label: 'Resolved',  color: '#059669', bg: '#ECFDF5', next: 'OPEN' },
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

function fmtTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtAbsolute(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─────────────────────────── Incident Card ───────────────────────────

interface IncidentCardProps {
  item: GuardIncident;
  actionId: number | null;
  onStatusPress: (item: GuardIncident) => void;
}

function IncidentCard({ item, actionId, onStatusPress }: IncidentCardProps) {
  const pm = PRIORITY_META[item.priority];
  const sm = STATUS_META[item.status];
  const isUrgent = item.priority === 'HIGH' || item.priority === 'CRITICAL';
  const isLoading = actionId === item.id;

  return (
    <View style={[s.card, isUrgent && { borderLeftWidth: 4, borderLeftColor: pm.color }]}>
      {/* Card Top */}
      <View style={s.cardTop}>
        <View style={[s.iconBox, { backgroundColor: pm.bg }]}>
          <Ionicons name={pm.icon} size={20} color={pm.color} />
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          {!!item.description && (
            <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
            <Text style={s.metaText}>{item.location}</Text>
            <Text style={s.metaDot}>·</Text>
            <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
            <Text style={s.metaText}>{fmtTimeAgo(item.reportedAt)}</Text>
          </View>
          <Text style={s.absTime}>{fmtAbsolute(item.reportedAt)}</Text>
        </View>
      </View>

      {/* Card Footer */}
      <View style={s.cardFooter}>
        <View style={[s.priorityBadge, { backgroundColor: pm.bg, borderColor: pm.border }]}>
          <Ionicons name={pm.icon} size={10} color={pm.color} />
          <Text style={[s.priorityText, { color: pm.color }]}>{pm.label}</Text>
        </View>

        <View style={s.footerRight}>
          {item.assignedTo ? (
            <View style={s.assignedRow}>
              <Ionicons name="person-circle-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.assignedText}>{item.assignedTo}</Text>
            </View>
          ) : (
            <Text style={s.reportedBy}>by {item.reportedBy}</Text>
          )}

          <TouchableOpacity
            style={[s.statusChip, { backgroundColor: sm.bg }]}
            onPress={() => onStatusPress(item)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={sm.color} />
            ) : (
              <Text style={[s.statusText, { color: sm.color }]}>{sm.label} ▾</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────── Main Screen ───────────────────────────

export default function GuardIncidentsScreen() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<GuardIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<number | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<IncidentPriority>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  // Status update with resolve note
  const [statusModal, setStatusModal] = useState<{ incident: GuardIncident; next: IncidentStatus } | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadIncidents = useCallback(async () => {
    const result = await Promise.allSettled([guardService.getIncidents()]);
    if (result[0].status === 'fulfilled') {
      setIncidents(result[0].value);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadIncidents(); }, [loadIncidents]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncidents();
    setRefreshing(false);
  };

  const counts: Record<FilterKey, number> = {
    ALL:       incidents.length,
    OPEN:      incidents.filter(i => i.status === 'OPEN').length,
    ESCALATED: incidents.filter(i => i.status === 'ESCALATED').length,
    RESOLVED:  incidents.filter(i => i.status === 'RESOLVED').length,
  };

  const filtered = incidents.filter(i => {
    const matchFilter = filter === 'ALL' || i.status === filter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      i.title.toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const handleStatusPress = (item: GuardIncident) => {
    const next = STATUS_META[item.status].next;
    setResolveNote('');
    setStatusModal({ incident: item, next });
  };

  const confirmStatusUpdate = async () => {
    if (!statusModal) return;
    setStatusUpdating(true);
    try {
      await guardService.updateIncidentStatus(statusModal.incident.id, statusModal.next);
      setIncidents(prev =>
        prev.map(i => i.id === statusModal.incident.id ? { ...i, status: statusModal.next } : i)
      );
      setStatusModal(null);
    } catch {
      Alert.alert('Error', 'Could not update incident status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Required', 'Please enter an incident title.');
      return;
    }
    if (!formLocation.trim()) {
      Alert.alert('Required', 'Please select or enter a location.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await guardService.createIncident({
        title: formTitle.trim(),
        description: formDesc.trim() || '',
        location: formLocation.trim(),
        priority: formPriority,
        reportedBy: user?.fullName ?? user?.name ?? 'Gate Guard',
      });
      setIncidents(prev => [created, ...prev]);
      setModalVisible(false);
      setFormTitle('');
      setFormLocation('');
      setFormDesc('');
      setFormPriority('MEDIUM');
    } catch {
      Alert.alert('Error', 'Unable to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Incidents</Text>
          <Text style={s.headerSub}>
            {counts.OPEN + counts.ESCALATED} active · {counts.RESOLVED} resolved
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search incidents..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={s.searchClear}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>{f.label}</Text>
              {counts[f.key] > 0 && (
                <View style={[s.filterBadge, active && s.filterBadgeActive]}>
                  <Text style={[s.filterBadgeText, active && s.filterBadgeTextActive]}>
                    {counts[f.key]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
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
              actionId={actionId}
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
                size={52}
                color={COLORS.textMuted}
              />
              <Text style={s.emptyTitle}>
                {search ? 'No results' : 'All clear'}
              </Text>
              <Text style={s.emptyDesc}>
                {search ? `No incidents matching "${search}"` : `No ${filter === 'ALL' ? '' : filter.toLowerCase() + ' '}incidents`}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Status Update Modal ── */}
      <Modal visible={!!statusModal} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setStatusModal(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity activeOpacity={1}>
              <View style={s.sheetCard}>
                <Text style={s.sheetTitle}>Update Status</Text>
                {statusModal && (
                  <>
                    <Text style={s.sheetSub}>
                      Move "{statusModal.incident.title}" to{' '}
                      <Text style={{ fontWeight: '700', color: STATUS_META[statusModal.next].color }}>
                        {STATUS_META[statusModal.next].label}
                      </Text>?
                    </Text>

                    {statusModal.next === 'RESOLVED' && (
                      <>
                        <Text style={s.fieldLabel}>Resolution Note (optional)</Text>
                        <TextInput
                          style={[s.textInput, { height: 72, textAlignVertical: 'top' }]}
                          placeholder="Describe how the incident was resolved..."
                          placeholderTextColor={COLORS.textMuted}
                          multiline
                          value={resolveNote}
                          onChangeText={setResolveNote}
                          autoFocus
                        />
                      </>
                    )}

                    <View style={s.sheetBtns}>
                      <TouchableOpacity style={s.cancelBtn} onPress={() => setStatusModal(null)}>
                        <Text style={s.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.confirmBtn, { backgroundColor: STATUS_META[statusModal.next].color }]}
                        onPress={confirmStatusUpdate}
                        disabled={statusUpdating}
                      >
                        {statusUpdating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={s.confirmBtnText}>Confirm</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* ── Create Incident Bottom Sheet ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={s.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeaderRow}>
              <Text style={s.sheetTitle}>Report Incident</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={s.fieldLabel}>Incident Title *</Text>
              <TextInput
                style={s.textInput}
                placeholder="e.g. Blocked Emergency Exit, Noise Complaint"
                placeholderTextColor={COLORS.textMuted}
                value={formTitle}
                onChangeText={setFormTitle}
                returnKeyType="next"
              />

              {/* Location quick chips */}
              <Text style={s.fieldLabel}>Location *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.locationChips}
              >
                {LOCATION_CHIPS.map(loc => (
                  <TouchableOpacity
                    key={loc}
                    style={[s.locChip, formLocation === loc && s.locChipActive]}
                    onPress={() => setFormLocation(formLocation === loc ? '' : loc)}
                  >
                    <Text style={[s.locChipText, formLocation === loc && s.locChipTextActive]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {!LOCATION_CHIPS.includes(formLocation) && formLocation.length > 0 && (
                <Text style={s.customLocLabel}>Custom: {formLocation}</Text>
              )}
              <TextInput
                style={[s.textInput, { marginTop: 6 }]}
                placeholder="Or type a custom location"
                placeholderTextColor={COLORS.textMuted}
                value={LOCATION_CHIPS.includes(formLocation) ? '' : formLocation}
                onChangeText={setFormLocation}
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

              {/* Description */}
              <Text style={s.fieldLabel}>Details</Text>
              <TextInput
                style={[s.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe the incident, immediate actions taken..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={formDesc}
                onChangeText={setFormDesc}
              />

              {/* Actions */}
              <View style={s.sheetBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
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
                    <Text style={s.confirmBtnText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: GUARD_COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchIcon: { marginLeft: 2 },
  searchInput: {
    flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 6,
  },
  searchClear: { padding: 2 },

  // Filters
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
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
  filterBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.border, paddingHorizontal: 4,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  filterBadgeTextActive: { color: '#fff' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // List
  list: { padding: 12, gap: 10, paddingBottom: 32 },

  // Card
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
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
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  priorityText: { fontSize: 10, fontWeight: '700' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  assignedText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  reportedBy: { fontSize: 11, color: COLORS.textMuted },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.sm, minWidth: 60, alignItems: 'center',
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 19 },

  // Status modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: 24,
  },
  sheetCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  sheetSub: { fontSize: 14, color: COLORS.textMuted, marginBottom: 12, lineHeight: 20 },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '700', color: COLORS.text },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center',
  },
  confirmBtnText: { fontWeight: '700', color: '#fff' },

  // Create bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 20, paddingBottom: 32, maxHeight: '90%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },

  // Form
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 5 },
  textInput: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  locationChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  locChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  locChipActive: { backgroundColor: GUARD_COLORS.accentLight, borderColor: GUARD_COLORS.accent },
  locChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  locChipTextActive: { color: GUARD_COLORS.accentDark },
  customLocLabel: { fontSize: 11, color: GUARD_COLORS.accent, marginTop: 4, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: 6 },
  priorityChip: {
    flex: 1, paddingVertical: 7, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  priorityChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
});
