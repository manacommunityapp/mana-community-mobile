import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { safetyService, type GuardShift } from '@/services/safetyService';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';

// ── helpers ──────────────────────────────────────────────────────────────────

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function shiftDurationMins(shift: GuardShift): number {
  if (!shift.checkInTime || !shift.checkOutTime) return 0;
  return Math.round((new Date(shift.checkOutTime).getTime() - new Date(shift.checkInTime).getTime()) / 60000);
}

function fmtHM(mins: number) {
  if (mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = isoDate();
  const yesterday = isoDate(daysAgo(1));
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  SCHEDULED:   { label: 'Scheduled',   color: '#6B7280', bg: '#F3F4F6', icon: 'calendar-outline' },
  IN_PROGRESS: { label: 'On Duty',     color: '#059669', bg: '#D1FAE5', icon: 'radio-button-on' },
  COMPLETED:   { label: 'Completed',   color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle' },
  ABSENT:      { label: 'Absent',      color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
  LATE:        { label: 'Late',        color: '#D97706', bg: '#FEF3C7', icon: 'alert-circle' },
  EARLY_OUT:   { label: 'Early Out',   color: '#D97706', bg: '#FEF3C7', icon: 'exit-outline' },
};

function statusMeta(s: string) {
  return STATUS_META[s] ?? { label: s, color: COLORS.textMuted, bg: '#F3F4F6', icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap };
}

// ── live clock ────────────────────────────────────────────────────────────────

function useLiveElapsed(fromIso?: string) {
  const [secs, setSecs] = useState(() =>
    fromIso ? Math.floor((Date.now() - new Date(fromIso).getTime()) / 1000) : 0
  );
  useEffect(() => {
    if (!fromIso) return;
    const id = setInterval(() => {
      setSecs(Math.floor((Date.now() - new Date(fromIso).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [fromIso]);
  return secs;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function GuardAttendanceScreen() {
  const user = useAuth(s => s.user);

  const [todayShift, setTodayShift] = useState<GuardShift | null>(null);
  const [history, setHistory] = useState<GuardShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionWorking, setActionWorking] = useState(false);

  const elapsed = useLiveElapsed(
    todayShift?.status === 'IN_PROGRESS' ? todayShift.checkInTime : undefined
  );

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const today = isoDate();
      const results = await Promise.allSettled([
        safetyService.getGuardShifts(today),
        ...([1, 2, 3, 4, 5, 6].map(n => safetyService.getGuardShifts(isoDate(daysAgo(n))))),
      ]);

      const allShifts: GuardShift[] = [];
      results.forEach(r => {
        if (r.status === 'fulfilled') allShifts.push(...r.value);
      });

      // Match to this guard by id or take first
      const mine = (shifts: GuardShift[]) =>
        shifts.find(s => s.guardId === user?.id) ?? shifts[0] ?? null;

      const todayShifts = results[0].status === 'fulfilled' ? results[0].value : [];
      setTodayShift(mine(todayShifts));

      // History = past days that had a shift
      const past: GuardShift[] = [];
      for (let i = 1; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled') {
          const s = mine(r.value);
          if (s) past.push(s);
        }
      }
      setHistory(past);
    } catch (e: any) {
      Alert.alert('Could not load shifts', e?.message || 'Try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleCheckIn = async () => {
    if (!todayShift) return;
    Alert.alert('Check In', 'Start your shift now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check In', onPress: async () => {
          setActionWorking(true);
          try {
            setTodayShift(await safetyService.checkInShift(todayShift.id));
          } catch (e: any) {
            Alert.alert('Check-in failed', e?.message || 'Try again.');
          } finally {
            setActionWorking(false);
          }
        },
      },
    ]);
  };

  const handleCheckOut = async () => {
    if (!todayShift) return;
    Alert.alert('Check Out', 'End your shift now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out', style: 'destructive', onPress: async () => {
          setActionWorking(true);
          try {
            setTodayShift(await safetyService.checkOutShift(todayShift.id));
          } catch (e: any) {
            Alert.alert('Check-out failed', e?.message || 'Try again.');
          } finally {
            setActionWorking(false);
          }
        },
      },
    ]);
  };

  // Weekly summary from history + today
  const allShifts = todayShift ? [todayShift, ...history] : history;
  const workedShifts = allShifts.filter(s => s.status === 'COMPLETED' || s.status === 'IN_PROGRESS');
  const totalMins = workedShifts.reduce((acc, s) => acc + shiftDurationMins(s), 0);
  const daysWorked = new Set(workedShifts.map(s => s.shiftDate)).size;

  const today = isoDate();
  const todayMeta = todayShift ? statusMeta(todayShift.status) : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Attendance</Text>
          <Text style={s.headerSub}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={s.guardBadge}>
          <Ionicons name="shield-checkmark" size={14} color={GUARD_COLORS.accent} />
          <Text style={s.guardBadgeName} numberOfLines={1}>{user?.name ?? 'Guard'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color={GUARD_COLORS.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
        >
          {/* ── Today's shift hero card ── */}
          {todayShift ? (
            <View style={s.heroCard}>
              {/* Status row */}
              <View style={s.heroTop}>
                <View style={[s.statusPill, { backgroundColor: todayMeta!.bg }]}>
                  <Ionicons name={todayMeta!.icon} size={13} color={todayMeta!.color} />
                  <Text style={[s.statusPillText, { color: todayMeta!.color }]}>{todayMeta!.label}</Text>
                </View>
                {todayShift.gate && (
                  <View style={s.gatePill}>
                    <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                    <Text style={s.gatePillText}>{todayShift.gate}</Text>
                  </View>
                )}
              </View>

              {/* Shift window */}
              <Text style={s.shiftWindow}>
                {todayShift.startTime} – {todayShift.endTime}
              </Text>
              <Text style={s.shiftDate}>Today's Shift</Text>

              {/* Live timer or timestamps */}
              {todayShift.status === 'IN_PROGRESS' && (
                <View style={s.timerBlock}>
                  <View style={s.timerDot} />
                  <Text style={s.timerLabel}>On duty for</Text>
                  <Text style={s.timerValue}>{fmtDuration(elapsed)}</Text>
                </View>
              )}

              {/* Check-in/out timestamps */}
              <View style={s.timestampRow}>
                <TimestampCell
                  icon="enter-outline"
                  label="Checked In"
                  value={fmtTime(todayShift.checkInTime)}
                  active={!!todayShift.checkInTime}
                />
                <View style={s.timestampDivider} />
                <TimestampCell
                  icon="exit-outline"
                  label="Checked Out"
                  value={fmtTime(todayShift.checkOutTime)}
                  active={!!todayShift.checkOutTime}
                />
                {todayShift.checkInTime && todayShift.checkOutTime && (
                  <>
                    <View style={s.timestampDivider} />
                    <TimestampCell
                      icon="time-outline"
                      label="Duration"
                      value={fmtHM(shiftDurationMins(todayShift))}
                      active
                    />
                  </>
                )}
              </View>

              {/* CTA */}
              {todayShift.status === 'SCHEDULED' && (
                <TouchableOpacity
                  style={[s.ctaBtn, s.ctaBtnCheckIn, actionWorking && { opacity: 0.7 }]}
                  onPress={handleCheckIn}
                  disabled={actionWorking}
                  activeOpacity={0.85}
                >
                  {actionWorking
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="enter" size={20} color="#fff" />
                        <Text style={s.ctaBtnText}>Check In for Shift</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
              {todayShift.status === 'IN_PROGRESS' && (
                <TouchableOpacity
                  style={[s.ctaBtn, s.ctaBtnCheckOut, actionWorking && { opacity: 0.7 }]}
                  onPress={handleCheckOut}
                  disabled={actionWorking}
                  activeOpacity={0.85}
                >
                  {actionWorking
                    ? <ActivityIndicator size="small" color={GUARD_COLORS.accent} />
                    : <>
                        <Ionicons name="exit-outline" size={20} color={GUARD_COLORS.accent} />
                        <Text style={[s.ctaBtnText, { color: GUARD_COLORS.accent }]}>Check Out</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
              {todayShift.status === 'COMPLETED' && (
                <View style={s.completedNote}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={s.completedNoteText}>Shift complete — good work!</Text>
                </View>
              )}

              {todayShift.notes && (
                <View style={s.notesRow}>
                  <Ionicons name="document-text-outline" size={13} color={COLORS.textMuted} />
                  <Text style={s.notesText}>{todayShift.notes}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={s.noShiftCard}>
              <Ionicons name="calendar-outline" size={44} color={COLORS.textMuted} />
              <Text style={s.noShiftTitle}>No shift scheduled today</Text>
              <Text style={s.noShiftSub}>Contact your supervisor if this is incorrect.</Text>
            </View>
          )}

          {/* ── Weekly summary ── */}
          <View style={s.summaryRow}>
            <SummaryCell icon="calendar" label="Days Worked" value={String(daysWorked)} color={GUARD_COLORS.accent} />
            <SummaryCell icon="time-outline" label="Total Hours" value={fmtHM(totalMins)} color="#059669" />
            <SummaryCell icon="checkmark-circle-outline" label="Shifts Done" value={String(workedShifts.length)} color="#2563EB" />
          </View>

          {/* ── History ── */}
          {history.length > 0 && (
            <View style={s.historyBlock}>
              <Text style={s.sectionTitle}>Recent Shifts</Text>
              {history.map(shift => {
                const meta = statusMeta(shift.status);
                const dur = shiftDurationMins(shift);
                return (
                  <View key={shift.id} style={s.historyRow}>
                    <View style={[s.historyDot, { backgroundColor: meta.color }]}>
                      <Ionicons name={meta.icon} size={14} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.historyDate}>{fmtDateLabel(shift.shiftDate)}</Text>
                      <Text style={s.historyWindow}>{shift.startTime} – {shift.endTime}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <View style={[s.historyStatusPill, { backgroundColor: meta.bg }]}>
                        <Text style={[s.historyStatusText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      {dur > 0 && <Text style={s.historyDur}>{fmtHM(dur)}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function TimestampCell({ icon, label, value, active }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; active: boolean;
}) {
  return (
    <View style={s.tsCell}>
      <Ionicons name={icon} size={14} color={active ? GUARD_COLORS.accent : COLORS.textMuted} />
      <Text style={[s.tsValue, !active && s.tsValueMuted]}>{value}</Text>
      <Text style={s.tsLabel}>{label}</Text>
    </View>
  );
}

function SummaryCell({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string;
}) {
  return (
    <View style={s.summaryCell}>
      <View style={[s.summaryIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
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
  guardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: GUARD_COLORS.accentLight, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5, maxWidth: 140,
  },
  guardBadgeName: { fontSize: 12, fontWeight: '700', color: GUARD_COLORS.accent },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.md, gap: SPACING.md },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, gap: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: '800' },
  gatePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  gatePillText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },

  shiftWindow: { fontSize: 30, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  shiftDate: { fontSize: 12, color: COLORS.textMuted, marginTop: -8 },

  // Live timer
  timerBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#D1FAE5', borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  timerDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669',
  },
  timerLabel: { fontSize: 13, fontWeight: '600', color: '#059669', flex: 1 },
  timerValue: { fontSize: 20, fontWeight: '900', color: '#059669', fontFamily: 'monospace' },

  // Timestamps
  timestampRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg,
    paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  timestampDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  tsCell: { flex: 1, alignItems: 'center', gap: 2 },
  tsValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  tsValueMuted: { color: COLORS.textMuted },
  tsLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // CTA
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: RADIUS.lg, paddingVertical: 14, ...SHADOWS.sm,
  },
  ctaBtnCheckIn: { backgroundColor: GUARD_COLORS.accent },
  ctaBtnCheckOut: {
    backgroundColor: GUARD_COLORS.accentLight,
    borderWidth: 1.5, borderColor: GUARD_COLORS.accent,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  completedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#D1FAE5', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  completedNoteText: { fontSize: 13, fontWeight: '700', color: '#059669' },

  notesRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  notesText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // No shift
  noShiftCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    alignItems: 'center', paddingVertical: 48, gap: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  noShiftTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  noShiftSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // Summary row
  summaryRow: { flexDirection: 'row', gap: SPACING.sm },
  summaryCell: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    alignItems: 'center', paddingVertical: 14, gap: 5,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  summaryIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  // History
  historyBlock: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, gap: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  historyDate: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  historyWindow: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  historyStatusPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  historyStatusText: { fontSize: 10, fontWeight: '700' },
  historyDur: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
});
