import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { securityOperationsService, type SecurityRecord } from '@/services/securityOperationsService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { key: 'Observation',  label: 'Observation',  icon: 'eye-outline',        color: '#2563EB', bg: '#DBEAFE' },
  { key: 'Incident',     label: 'Incident',     icon: 'warning-outline',    color: '#DC2626', bg: '#FEE2E2' },
  { key: 'Maintenance',  label: 'Maintenance',  icon: 'construct-outline',  color: '#D97706', bg: '#FEF3C7' },
  { key: 'Visitor',      label: 'Visitor',      icon: 'person-outline',     color: '#059669', bg: '#D1FAE5' },
  { key: 'Patrol',       label: 'Patrol',       icon: 'walk-outline',       color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'Other',        label: 'Other',        icon: 'ellipsis-horizontal',color: '#6B7280', bg: '#F3F4F6' },
];

const LOCATIONS = [
  'Main Gate', 'Back Gate', 'Parking', 'Lobby', 'Lift Lobby',
  'Perimeter', 'Common Area', 'Pool', 'Clubhouse', 'Terrace',
];

function catMeta(purpose?: string) {
  return CATEGORIES.find(c => c.key === purpose) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ── date helpers ──────────────────────────────────────────────────────────────

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function fmtDateLabel(dateStr: string) {
  const today = isoDate();
  const yesterday = isoDate(daysAgo(1));
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── component ─────────────────────────────────────────────────────────────────

type Tab = 'log' | 'new';

export default function GuardDailyLogScreen() {
  const user = useAuth(s => s.user);
  const guardName = user?.name ?? 'Guard';

  const [tab, setTab] = useState<Tab>('log');
  const [allLogs, setAllLogs] = useState<SecurityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(isoDate());

  // New entry form state
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [notes, setNotes] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await securityOperationsService.getGuardLogs();
      setAllLogs(data);
    } catch {
      setAllLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Filter by selected date
  const logsForDate = allLogs
    .filter(l => l.createdAt?.startsWith(selectedDate))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Date strip: today + 4 days back
  const dateDays = [0, 1, 2, 3, 4].map(n => isoDate(daysAgo(n)));

  const countForDate = (d: string) => allLogs.filter(l => l.createdAt?.startsWith(d)).length;

  const handleSave = async () => {
    if (!notes.trim()) {
      Alert.alert('Notes required', 'Please describe what you observed or encountered.');
      return;
    }
    const loc = location === '__custom__' ? customLocation.trim() : location;
    setSaving(true);
    try {
      await securityOperationsService.createGuardLog({
        purpose: category,
        location: loc || undefined,
        notes: notes.trim(),
        status: 'OPEN',
        name: guardName,
      });
      // Optimistic: add to list and switch to log tab
      setAllLogs(prev => [{
        id: Date.now(),
        recordType: 'GUARD_DAILY_LOG',
        purpose: category,
        location: loc || undefined,
        notes: notes.trim(),
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        name: guardName,
      } as SecurityRecord, ...prev]);
      setNotes('');
      setLocation('');
      setCustomLocation('');
      setCategory(CATEGORIES[0].key);
      setSelectedDate(isoDate());
      setTab('log');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Try again.');
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
        <TouchableOpacity style={s.addBtn} onPress={() => setTab('new')}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab toggle */}
      <View style={s.toggle}>
        <TouchableOpacity
          style={[s.toggleBtn, tab === 'log' && s.toggleActive]}
          onPress={() => setTab('log')}
        >
          <Ionicons name="list" size={15} color={tab === 'log' ? '#fff' : COLORS.textMuted} />
          <Text style={[s.toggleText, tab === 'log' && s.toggleTextActive]}>Log</Text>
          {allLogs.length > 0 && tab !== 'log' && (
            <View style={s.toggleBadge}><Text style={s.toggleBadgeText}>{allLogs.length}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, tab === 'new' && s.toggleActive]}
          onPress={() => setTab('new')}
        >
          <Ionicons name="create-outline" size={15} color={tab === 'new' ? '#fff' : COLORS.textMuted} />
          <Text style={[s.toggleText, tab === 'new' && s.toggleTextActive]}>New Entry</Text>
        </TouchableOpacity>
      </View>

      {tab === 'log' ? (
        <LogView
          loading={loading}
          logsForDate={logsForDate}
          dateDays={dateDays}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          countForDate={countForDate}
          onNewEntry={() => setTab('new')}
          onRefresh={loadLogs}
        />
      ) : (
        <NewEntryView
          category={category}
          onCategory={setCategory}
          location={location}
          onLocation={setLocation}
          customLocation={customLocation}
          onCustomLocation={setCustomLocation}
          notes={notes}
          onNotes={setNotes}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setTab('log')}
        />
      )}
    </SafeAreaView>
  );
}

// ── Log list view ─────────────────────────────────────────────────────────────

function LogView({
  loading, logsForDate, dateDays, selectedDate, onSelectDate, countForDate, onNewEntry, onRefresh,
}: {
  loading: boolean;
  logsForDate: SecurityRecord[];
  dateDays: string[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  countForDate: (d: string) => number;
  onNewEntry: () => void;
  onRefresh: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
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
              onPress={() => onSelectDate(d)}
            >
              <Text style={[s.dateChipLabel, active && s.dateChipLabelActive]}>
                {fmtDateLabel(d)}
              </Text>
              {count > 0 && (
                <View style={[s.dateCountBadge, active && s.dateCountBadgeActive]}>
                  <Text style={[s.dateCountText, active && s.dateCountTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator color={GUARD_COLORS.accent} size="large" />
        </View>
      ) : logsForDate.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No entries for {fmtDateLabel(selectedDate)}</Text>
          <Text style={s.emptySub}>Tap the + button to add a log entry for this shift.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={onNewEntry}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.emptyBtnText}>Add Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.entriesList}>
          <Text style={s.entriesCount}>{logsForDate.length} {logsForDate.length === 1 ? 'entry' : 'entries'}</Text>
          {logsForDate.map(entry => {
            const meta = catMeta(entry.purpose);
            return (
              <View key={entry.id} style={s.entryCard}>
                <View style={s.entryLeft}>
                  <View style={[s.entryIconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={s.entryTimeline} />
                </View>
                <View style={s.entryBody}>
                  <View style={s.entryTopRow}>
                    <Text style={[s.entryCatLabel, { color: meta.color }]}>{meta.label}</Text>
                    <Text style={s.entryTime}>{fmtTime(entry.createdAt)}</Text>
                  </View>
                  {entry.location && (
                    <View style={s.entryLocationRow}>
                      <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                      <Text style={s.entryLocation}>{entry.location}</Text>
                    </View>
                  )}
                  <Text style={s.entryNotes}>{entry.notes}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── New entry form ────────────────────────────────────────────────────────────

function NewEntryView({
  category, onCategory, location, onLocation, customLocation, onCustomLocation,
  notes, onNotes, saving, onSave, onCancel,
}: {
  category: string;
  onCategory: (c: string) => void;
  location: string;
  onLocation: (l: string) => void;
  customLocation: string;
  onCustomLocation: (l: string) => void;
  notes: string;
  onNotes: (n: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Category */}
        <View style={s.formSection}>
          <Text style={s.formLabel}>Category</Text>
          <View style={s.catGrid}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[s.catChip, category === c.key && { backgroundColor: c.bg, borderColor: c.color }]}
                onPress={() => onCategory(c.key)}
              >
                <Ionicons name={c.icon} size={15} color={category === c.key ? c.color : COLORS.textMuted} />
                <Text style={[s.catChipText, category === c.key && { color: c.color, fontWeight: '700' }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={s.formSection}>
          <Text style={s.formLabel}>Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.locationStrip}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[s.locationChip, location === loc && s.locationChipActive]}
                onPress={() => { onLocation(location === loc ? '' : loc); }}
              >
                <Text style={[s.locationChipText, location === loc && s.locationChipTextActive]}>
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.locationChip, location === '__custom__' && s.locationChipActive]}
              onPress={() => onLocation(location === '__custom__' ? '' : '__custom__')}
            >
              <Ionicons name="pencil-outline" size={12} color={location === '__custom__' ? '#fff' : COLORS.textMuted} />
              <Text style={[s.locationChipText, location === '__custom__' && s.locationChipTextActive]}>Other</Text>
            </TouchableOpacity>
          </ScrollView>
          {location === '__custom__' && (
            <TextInput
              style={s.customLocInput}
              placeholder="Enter location…"
              placeholderTextColor={COLORS.textMuted}
              value={customLocation}
              onChangeText={onCustomLocation}
            />
          )}
        </View>

        {/* Notes */}
        <View style={s.formSection}>
          <Text style={s.formLabel}>Notes <Text style={s.required}>*</Text></Text>
          <TextInput
            style={s.notesInput}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholder={notesPlaceholder(category)}
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={onNotes}
          />
          <Text style={s.charCount}>{notes.length} characters</Text>
        </View>

        {/* Timestamp note */}
        <View style={s.timestampNote}>
          <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
          <Text style={s.timestampNoteText}>
            Entry will be timestamped at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Actions */}
        <View style={s.formActions}>
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, (!notes.trim() || saving) && { opacity: 0.55 }]}
            onPress={onSave}
            disabled={!notes.trim() || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>Save Entry</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function notesPlaceholder(category: string) {
  switch (category) {
    case 'Incident':    return 'Describe what happened, who was involved, what action was taken…';
    case 'Maintenance': return 'What needs repair or follow-up? Location, issue description…';
    case 'Visitor':     return 'Visitor name, flat number, purpose, time of entry/exit…';
    case 'Patrol':      return 'Route covered, anything notable observed during patrol…';
    default:            return 'Describe what you observed or noted during this shift…';
  }
}

// ── styles ────────────────────────────────────────────────────────────────────

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

  toggle: {
    flexDirection: 'row', margin: SPACING.md, gap: 0,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: RADIUS.md,
  },
  toggleActive: { backgroundColor: GUARD_COLORS.accent, ...SHADOWS.sm },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  toggleTextActive: { color: '#fff', fontWeight: '700' },
  toggleBadge: {
    backgroundColor: GUARD_COLORS.accent, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

  scroll: { padding: SPACING.md },
  loaderWrap: { alignItems: 'center', paddingTop: 80 },

  // Date strip
  dateStrip: { gap: 8, paddingBottom: SPACING.md, paddingHorizontal: 2 },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  dateChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  dateChipLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dateChipLabelActive: { color: '#fff', fontWeight: '700' },
  dateCountBadge: {
    backgroundColor: GUARD_COLORS.accentLight, borderRadius: 8,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  dateCountBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  dateCountText: { fontSize: 10, fontWeight: '900', color: GUARD_COLORS.accent },
  dateCountTextActive: { color: '#fff' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, backgroundColor: GUARD_COLORS.accent,
    borderRadius: RADIUS.lg, paddingVertical: 10, paddingHorizontal: 20, ...SHADOWS.sm,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Entries list
  entriesList: { gap: 0 },
  entriesCount: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  entryCard: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  entryLeft: { alignItems: 'center', width: 36 },
  entryIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  entryTimeline: {
    flex: 1, width: 2, backgroundColor: COLORS.border, marginTop: 4, minHeight: 16,
  },
  entryBody: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 5,
    marginBottom: 2, ...SHADOWS.sm,
  },
  entryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryCatLabel: { fontSize: 12, fontWeight: '800' },
  entryTime: { fontSize: 11, color: COLORS.textMuted },
  entryLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  entryLocation: { fontSize: 11, color: COLORS.textMuted },
  entryNotes: { fontSize: 13, color: COLORS.text, lineHeight: 19 },

  // Form sections
  formSection: { marginBottom: SPACING.lg },
  formLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  required: { color: '#DC2626' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md, backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  catChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  locationStrip: { gap: 8, paddingBottom: 4 },
  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  locationChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  locationChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  locationChipTextActive: { color: '#fff' },
  customLocInput: {
    marginTop: 10, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontSize: 13, color: COLORS.text, backgroundColor: COLORS.surface,
  },

  notesInput: {
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontSize: 14, color: COLORS.text, lineHeight: 22, minHeight: 140,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },

  timestampNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg,
  },
  timestampNoteText: { fontSize: 12, color: COLORS.textMuted },

  formActions: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: GUARD_COLORS.accent, ...SHADOWS.sm,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
