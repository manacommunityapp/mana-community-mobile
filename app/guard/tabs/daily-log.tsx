import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { securityOperationsService, type SecurityRecord } from '@/services/securityOperationsService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';

// ─────────────── Constants ───────────────

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface Category {
  key: string;
  label: string;
  icon: IoniconsName;
  color: string;
  bg: string;
}

const CATEGORIES: Category[] = [
  { key: 'Observation',  label: 'Observation',  icon: 'eye-outline',          color: '#2563EB', bg: '#DBEAFE' },
  { key: 'Incident',     label: 'Incident',     icon: 'warning-outline',      color: '#DC2626', bg: '#FEE2E2' },
  { key: 'Maintenance',  label: 'Maintenance',  icon: 'construct-outline',    color: '#D97706', bg: '#FEF3C7' },
  { key: 'Visitor',      label: 'Visitor',      icon: 'person-outline',       color: '#059669', bg: '#D1FAE5' },
  { key: 'Patrol',       label: 'Patrol',       icon: 'walk-outline',         color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'Other',        label: 'Other',        icon: 'ellipsis-horizontal',  color: '#6B7280', bg: '#F3F4F6' },
];

const PRIORITY_OPTS = [
  { key: 'LOW',    label: 'Low',    color: '#059669' },
  { key: 'MEDIUM', label: 'Medium', color: '#D97706' },
  { key: 'HIGH',   label: 'High',   color: '#DC2626' },
] as const;
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

const LOCATION_CHIPS = [
  'Main Gate', 'Back Gate', 'Parking', 'Lobby', 'Lift Lobby',
  'Perimeter', 'Common Area', 'Pool', 'Clubhouse', 'Terrace',
];

// ─────────────── Helpers ───────────────

function catMeta(key?: string): Category {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function fmtDateLabel(s: string) {
  const today = isoDate();
  const yesterday = isoDate(daysAgo(1));
  if (s === today) return 'Today';
  if (s === yesterday) return 'Yesterday';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notesPlaceholder(cat: string) {
  switch (cat) {
    case 'Incident':    return 'What happened, who was involved, action taken…';
    case 'Maintenance': return 'What needs repair? Location and issue description…';
    case 'Visitor':     return 'Visitor name, flat, purpose, entry/exit time…';
    case 'Patrol':      return 'Route covered, anything notable observed…';
    default:            return 'Describe what you observed during this shift…';
  }
}

// ─────────────── Main Screen ───────────────

export default function GuardDailyLogScreen() {
  const user = useAuth(s => s.user);
  const guardName = user?.name ?? user?.fullName ?? 'Guard';

  const [allLogs, setAllLogs] = useState<SecurityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(isoDate());
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Form state
  const [formCat, setFormCat] = useState(CATEGORIES[0].key);
  const [formLoc, setFormLoc] = useState('');
  const [formCustomLoc, setFormCustomLoc] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('LOW');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [result] = await Promise.allSettled([securityOperationsService.getGuardLogs()]);
    if (result.status === 'fulfilled') setAllLogs(result.value);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadLogs(); }, [loadLogs]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLogs(true);
  }, [loadLogs]);

  // Date strip: today + 6 days back
  const dateDays = [0, 1, 2, 3, 4, 5, 6].map(n => isoDate(daysAgo(n)));
  const countForDate = (d: string) => allLogs.filter(l => l.createdAt?.startsWith(d)).length;

  // Filtered entries for selected date
  const logsForDate = allLogs
    .filter(l => l.createdAt?.startsWith(selectedDate))
    .filter(l => !catFilter || l.purpose === catFilter)
    .filter(l => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.notes?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q) ||
        l.purpose?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Today stats
  const todayLogs = allLogs.filter(l => l.createdAt?.startsWith(isoDate()));
  const todayCounts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.key] = todayLogs.filter(l => l.purpose === c.key).length;
    return acc;
  }, {});

  const openSheet = () => {
    setFormCat(CATEGORIES[0].key);
    setFormLoc('');
    setFormCustomLoc('');
    setFormNotes('');
    setFormPriority('LOW');
    setFormError('');
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!formNotes.trim()) {
      setFormError('Please describe what you observed or encountered.');
      return;
    }
    setFormError('');
    const loc = formLoc === '__custom__' ? formCustomLoc.trim() : formLoc;
    setSaving(true);
    const optimistic: SecurityRecord = {
      id: Date.now(),
      recordType: 'GUARD_DAILY_LOG',
      purpose: formCat,
      location: loc || undefined,
      notes: formNotes.trim(),
      status: formPriority,
      createdAt: new Date().toISOString(),
      name: guardName,
    };
    setAllLogs(prev => [optimistic, ...prev]);
    setSelectedDate(isoDate());
    setSheetOpen(false);
    try {
      await securityOperationsService.createGuardLog({
        purpose: formCat,
        location: loc || undefined,
        notes: formNotes.trim(),
        status: formPriority,
        name: guardName,
      });
    } catch {
      setAllLogs(prev => prev.filter(l => l.id !== optimistic.id));
      setFormError('Entry could not be saved. Please try again.');
      setSheetOpen(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Daily Log</Text>
          <Text style={s.headerSub}>Patrol notes, incidents &amp; observations</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openSheet}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
      >
        {/* Today stats row */}
        {todayLogs.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
            <View style={s.statChipTotal}>
              <Text style={s.statChipNum}>{todayLogs.length}</Text>
              <Text style={s.statChipLabel}>Today</Text>
            </View>
            {CATEGORIES.filter(c => todayCounts[c.key] > 0).map(c => (
              <TouchableOpacity
                key={c.key}
                style={[s.statChip, catFilter === c.key && { borderColor: c.color, backgroundColor: c.bg }]}
                onPress={() => setCatFilter(catFilter === c.key ? null : c.key)}
              >
                <Ionicons name={c.icon} size={12} color={c.color} />
                <Text style={[s.statChipNum, { color: c.color }]}>{todayCounts[c.key]}</Text>
                <Text style={[s.statChipLabel, catFilter === c.key && { color: c.color }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Date strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dateStrip}
        >
          {dateDays.map(d => {
            const count = countForDate(d);
            const active = d === selectedDate;
            return (
              <TouchableOpacity
                key={d}
                style={[s.dateChip, active && s.dateChipActive]}
                onPress={() => setSelectedDate(d)}
              >
                <Text style={[s.dateChipLabel, active && s.dateChipLabelActive]}>
                  {fmtDateLabel(d)}
                </Text>
                {count > 0 && (
                  <View style={[s.dateBadge, active && s.dateBadgeActive]}>
                    <Text style={[s.dateBadgeText, active && s.dateBadgeTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search + category filter */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search entries…"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={15} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          <TouchableOpacity
            style={[s.filterChip, catFilter === null && s.filterChipActive]}
            onPress={() => setCatFilter(null)}
          >
            <Text style={[s.filterChipText, catFilter === null && s.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[s.filterChip, catFilter === c.key && { borderColor: c.color, backgroundColor: c.bg }]}
              onPress={() => setCatFilter(catFilter === c.key ? null : c.key)}
            >
              <Ionicons name={c.icon} size={12} color={catFilter === c.key ? c.color : COLORS.textMuted} />
              <Text style={[s.filterChipText, catFilter === c.key && { color: c.color, fontWeight: '700' }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Log list */}
        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator color={GUARD_COLORS.accent} size="large" />
          </View>
        ) : logsForDate.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>
              {search || catFilter ? 'No matching entries' : `No entries for ${fmtDateLabel(selectedDate)}`}
            </Text>
            <Text style={s.emptySub}>
              {search || catFilter
                ? 'Try a different search or clear the filter.'
                : 'Tap the + button to log an observation, incident or patrol note.'}
            </Text>
            {!search && !catFilter && (
              <TouchableOpacity style={s.emptyBtn} onPress={openSheet}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.emptyBtnText}>Add Entry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s.entriesList}>
            <Text style={s.entriesCount}>
              {logsForDate.length} {logsForDate.length === 1 ? 'entry' : 'entries'}
              {catFilter ? ` · ${catFilter}` : ''}
            </Text>
            {logsForDate.map((entry, idx) => {
              const meta = catMeta(entry.purpose);
              const isLast = idx === logsForDate.length - 1;
              const pri = PRIORITY_OPTS.find(p => p.key === entry.status);
              return (
                <View key={entry.id} style={s.entryRow}>
                  {/* Timeline column */}
                  <View style={s.timelineCol}>
                    <View style={[s.timelineDot, { backgroundColor: meta.color }]} />
                    {!isLast && <View style={s.timelineLine} />}
                  </View>
                  {/* Card */}
                  <View style={[s.entryCard, { borderLeftColor: meta.color }]}>
                    <View style={s.entryCardTop}>
                      <View style={s.entryCardTopLeft}>
                        <View style={[s.catIconWrap, { backgroundColor: meta.bg }]}>
                          <Ionicons name={meta.icon} size={14} color={meta.color} />
                        </View>
                        <Text style={[s.catLabel, { color: meta.color }]}>{meta.label}</Text>
                        {pri && pri.key !== 'LOW' && (
                          <View style={[s.priBadge, { borderColor: pri.color, backgroundColor: pri.color + '18' }]}>
                            <Text style={[s.priBadgeText, { color: pri.color }]}>{pri.label}</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.entryCardTopRight}>
                        <Text style={s.entryTime}>{fmtTime(entry.createdAt)}</Text>
                        <Text style={s.entryRelTime}>{relTime(entry.createdAt)}</Text>
                      </View>
                    </View>
                    {entry.location && (
                      <View style={s.locationRow}>
                        <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                        <Text style={s.locationText}>{entry.location}</Text>
                      </View>
                    )}
                    <Text style={s.entryNotes}>{entry.notes}</Text>
                    {entry.name && entry.name !== guardName && (
                      <Text style={s.entryBy}>Logged by {entry.name}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* New entry bottom sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={s.backdropTouch} onPress={() => setSheetOpen(false)} />
          <View style={s.sheet}>
            {/* Sheet handle */}
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>New Log Entry</Text>
              <TouchableOpacity onPress={() => setSheetOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Category */}
              <Text style={s.formLabel}>Category</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map(c => {
                  const sel = formCat === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[s.catChip, sel && { borderColor: c.color, backgroundColor: c.bg }]}
                      onPress={() => setFormCat(c.key)}
                    >
                      <Ionicons name={c.icon} size={14} color={sel ? c.color : COLORS.textMuted} />
                      <Text style={[s.catChipText, sel && { color: c.color, fontWeight: '700' }]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Priority */}
              <Text style={[s.formLabel, { marginTop: SPACING.md }]}>Priority</Text>
              <View style={s.priorityRow}>
                {PRIORITY_OPTS.map(p => {
                  const sel = formPriority === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[s.priChip, sel && { borderColor: p.color, backgroundColor: p.color + '18' }]}
                      onPress={() => setFormPriority(p.key)}
                    >
                      <View style={[s.priDot, { backgroundColor: sel ? p.color : COLORS.border }]} />
                      <Text style={[s.priChipText, sel && { color: p.color, fontWeight: '700' }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Location */}
              <Text style={[s.formLabel, { marginTop: SPACING.md }]}>Location</Text>
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.locChipRow}
              >
                {LOCATION_CHIPS.map(loc => {
                  const sel = formLoc === loc;
                  return (
                    <TouchableOpacity
                      key={loc}
                      style={[s.locChip, sel && s.locChipActive]}
                      onPress={() => setFormLoc(sel ? '' : loc)}
                    >
                      <Text style={[s.locChipText, sel && s.locChipTextActive]}>{loc}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[s.locChip, formLoc === '__custom__' && s.locChipActive]}
                  onPress={() => setFormLoc(formLoc === '__custom__' ? '' : '__custom__')}
                >
                  <Ionicons name="pencil-outline" size={11} color={formLoc === '__custom__' ? '#fff' : COLORS.textMuted} />
                  <Text style={[s.locChipText, formLoc === '__custom__' && s.locChipTextActive]}>Other</Text>
                </TouchableOpacity>
              </ScrollView>
              {formLoc === '__custom__' && (
                <TextInput
                  style={s.customLocInput}
                  placeholder="Enter location…"
                  placeholderTextColor={COLORS.textMuted}
                  value={formCustomLoc}
                  onChangeText={setFormCustomLoc}
                />
              )}

              {/* Notes */}
              <Text style={[s.formLabel, { marginTop: SPACING.md }]}>
                Notes <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <TextInput
                style={s.notesInput}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                placeholder={notesPlaceholder(formCat)}
                placeholderTextColor={COLORS.textMuted}
                value={formNotes}
                onChangeText={setFormNotes}
              />
              <Text style={s.charCount}>{formNotes.length} chars</Text>

              {/* Timestamp note */}
              <View style={s.tsNote}>
                <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                <Text style={s.tsNoteText}>
                  Timestamped at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
              </View>

              {/* Inline error */}
              {formError ? (
                <View style={s.formErrorBanner}>
                  <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
                  <Text style={s.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              {/* Actions */}
              <View style={s.formActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setSheetOpen(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, (!formNotes.trim() || saving) && { opacity: 0.55 }]}
                  onPress={handleSave}
                  disabled={!formNotes.trim() || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={s.saveBtnText}>Save Entry</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────── Styles ───────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GUARD_COLORS.accent, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },

  scroll: { padding: SPACING.md, gap: 12 },
  loader: { alignItems: 'center', paddingTop: 80 },

  // Stats row
  statsRow: { gap: 8, paddingBottom: 4 },
  statChipTotal: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.full,
  },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statChipNum: { fontSize: 13, fontWeight: '800', color: '#fff' },
  statChipLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

  // Date strip
  dateStrip: { gap: 8, paddingBottom: 4 },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dateChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  dateChipLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dateChipLabelActive: { color: '#fff', fontWeight: '700' },
  dateBadge: {
    backgroundColor: GUARD_COLORS.accentLight, borderRadius: 8,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  dateBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  dateBadgeText: { fontSize: 10, fontWeight: '900', color: GUARD_COLORS.accent },
  dateBadgeTextActive: { color: '#fff' },

  // Search
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, padding: 0 },

  // Category filter chips
  filterRow: { gap: 8, paddingBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterChipTextActive: { color: '#fff' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: 10, paddingHorizontal: 20, ...SHADOWS.sm,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Entries list
  entriesList: { gap: 0 },
  entriesCount: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  entryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  timelineCol: { alignItems: 'center', width: 14, paddingTop: 6 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.border, marginTop: 4, minHeight: 12 },
  entryCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 3, gap: 5, ...SHADOWS.sm,
  },
  entryCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entryCardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  entryCardTopRight: { alignItems: 'flex-end', gap: 1 },
  catIconWrap: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 12, fontWeight: '800' },
  priBadge: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  priBadgeText: { fontSize: 10, fontWeight: '700' },
  entryTime: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  entryRelTime: { fontSize: 10, color: COLORS.textMuted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 11, color: COLORS.textMuted },
  entryNotes: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  entryBy: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Bottom sheet
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', ...SHADOWS.floating,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sheetScroll: { padding: SPACING.lg },

  formLabel: {
    fontSize: 11, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  catChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  priorityRow: { flexDirection: 'row', gap: 8 },
  priChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt,
  },
  priDot: { width: 8, height: 8, borderRadius: 4 },
  priChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  locChipRow: { gap: 8, paddingBottom: 6 },
  locChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  locChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  locChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  locChipTextActive: { color: '#fff' },
  customLocInput: {
    marginTop: 8, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontSize: 13, color: COLORS.text, backgroundColor: COLORS.surfaceAlt,
  },

  notesInput: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontSize: 14, color: COLORS.text, lineHeight: 22, minHeight: 120,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },

  tsNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: COLORS.border, marginTop: 12,
  },
  tsNoteText: { fontSize: 12, color: COLORS.textMuted },

  formActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 14, borderRadius: RADIUS.lg,
    backgroundColor: GUARD_COLORS.accent, ...SHADOWS.sm,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  formErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.errorLight, borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: COLORS.error + '40',
    marginBottom: 4,
  },
  formErrorText: { flex: 1, fontSize: 13, color: COLORS.error, lineHeight: 18 },
});
