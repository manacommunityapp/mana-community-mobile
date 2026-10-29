import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, SPACING, getAvatarColor, getInitials } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { safetyService, type GuardShift } from '@/services/safetyService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ── helpers ───────────────────────────────────────────────────────────────────

function isoDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function fmtTime(t?: string) {
  if (!t) return '--';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
}

function shiftDurationMins(s: GuardShift): number {
  if (!s.startTime || !s.endTime) return 0;
  const [sh, sm] = s.startTime.split(':').map(Number);
  const [eh, em] = s.endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function useLiveElapsed(fromIso?: string | null) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!fromIso) { setSecs(0); return; }
    const tick = () => setSecs(Math.floor((Date.now() - new Date(fromIso).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fromIso]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function MenuItem({
  icon, label, sublabel, onPress, danger, iconColor, iconBg,
}: {
  icon: IoniconsName;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[s.menuIconWrap, { backgroundColor: iconBg || COLORS.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.error : (iconColor || GUARD_COLORS.accent)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.menuLabel, danger && s.dangerText]}>{label}</Text>
        {sublabel ? <Text style={s.menuSub}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
    </TouchableOpacity>
  );
}

function QuickAction({
  icon, label, onPress, color, bg,
}: {
  icon: IoniconsName; label: string; onPress: () => void; color: string; bg: string;
}) {
  return (
    <TouchableOpacity style={s.quickAction} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.quickActionIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function GuardProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const displayName = user?.fullName || user?.name || (user?.email ? user.email.split('@')[0] : 'Guard');
  const avatarColor = getAvatarColor(displayName).bg;

  const [todayShift, setTodayShift] = useState<GuardShift | null>(null);
  const [weekShifts, setWeekShifts] = useState<GuardShift[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const elapsed = useLiveElapsed(todayShift?.status === 'IN_PROGRESS' ? todayShift.checkInTime : null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const dates = [0, 1, 2, 3, 4, 5, 6].map(n => isoDate(n));
      const results = await Promise.allSettled(dates.map(d => safetyService.getGuardShifts(d)));
      const all: GuardShift[] = [];
      results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });
      setWeekShifts(all);

      const todayRows = results[0].status === 'fulfilled' ? results[0].value : [];
      const mine = todayRows.find(s => s.guardId === user?.id) || todayRows[0] || null;
      setTodayShift(mine);
    } catch {
      setTodayShift(null);
      setWeekShifts([]);
    } finally {
      setStatsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  // Duty status
  const dutyStatus: 'ON DUTY' | 'OFF DUTY' | 'SCHEDULED' =
    todayShift?.status === 'IN_PROGRESS' ? 'ON DUTY'
    : todayShift?.status === 'SCHEDULED' ? 'SCHEDULED'
    : 'OFF DUTY';

  // Weekly stats
  const completedShifts = weekShifts.filter(s => s.status === 'COMPLETED' || s.status === 'IN_PROGRESS');
  const totalMinsWorked = completedShifts.reduce((acc, s) => acc + shiftDurationMins(s), 0);

  const handleLogout = () => { setConfirmLogout(true); };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          {/* decorative blobs */}
          <View style={s.heroDot1} />
          <View style={s.heroDot2} />
          <View style={s.heroDot3} />

          <View style={[s.heroAvatar, { backgroundColor: avatarColor }]}>
            <Text style={s.heroAvatarText}>{getInitials(displayName)}</Text>
          </View>
          <Text style={s.heroName}>{displayName}</Text>
          {user?.email ? <Text style={s.heroEmail}>{user.email}</Text> : null}

          <View style={s.heroTagRow}>
            <View style={s.heroTag}>
              <Ionicons name="shield" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={s.heroTagText}>Security Guard</Text>
            </View>
            {todayShift?.gate && (
              <View style={s.heroTag}>
                <Ionicons name="location" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={s.heroTagText}>{todayShift.gate}</Text>
              </View>
            )}
            <View style={[
              s.heroStatusBadge,
              dutyStatus === 'ON DUTY' && s.badgeOnDuty,
              dutyStatus === 'SCHEDULED' && s.badgeScheduled,
              dutyStatus === 'OFF DUTY' && s.badgeOffDuty,
            ]}>
              {dutyStatus === 'ON DUTY' && <View style={s.statusPulse} />}
              <Text style={s.heroStatusText}>{dutyStatus}</Text>
            </View>
          </View>
        </View>

        {/* ── Today's Shift card ── */}
        <View style={s.shiftCard}>
          <View style={s.shiftCardHeader}>
            <View style={s.shiftCardTitleRow}>
              <View style={[s.shiftCardIcon, { backgroundColor: GUARD_COLORS.accentLight }]}>
                <Ionicons name="time" size={16} color={GUARD_COLORS.accent} />
              </View>
              <Text style={s.shiftCardTitle}>Today's Shift</Text>
            </View>
            {todayShift && (
              <View style={[
                s.shiftStatusPill,
                todayShift.status === 'IN_PROGRESS' && { backgroundColor: '#DCFCE7' },
                todayShift.status === 'COMPLETED' && { backgroundColor: '#F0FDF4' },
                todayShift.status === 'SCHEDULED' && { backgroundColor: GUARD_COLORS.accentLight },
                todayShift.status === 'ABSENT' && { backgroundColor: '#FEE2E2' },
              ]}>
                <Text style={[
                  s.shiftStatusText,
                  todayShift.status === 'IN_PROGRESS' && { color: '#16A34A' },
                  todayShift.status === 'COMPLETED' && { color: '#15803D' },
                  todayShift.status === 'SCHEDULED' && { color: GUARD_COLORS.accent },
                  todayShift.status === 'ABSENT' && { color: '#DC2626' },
                ]}>
                  {todayShift.status?.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>

          {statsLoading ? (
            <ActivityIndicator color={GUARD_COLORS.accent} style={{ paddingVertical: 16 }} />
          ) : todayShift ? (
            <>
              <View style={s.shiftTimeRow}>
                <View style={s.shiftTimeBlock}>
                  <Text style={s.shiftTimeLabel}>Start</Text>
                  <Text style={s.shiftTimeValue}>{fmtTime(todayShift.startTime)}</Text>
                </View>
                <View style={s.shiftTimeDivider}>
                  <View style={s.shiftTimeLine} />
                  <View style={s.shiftTimeDot} />
                  <View style={s.shiftTimeLine} />
                </View>
                <View style={s.shiftTimeBlock}>
                  <Text style={s.shiftTimeLabel}>Duration</Text>
                  <Text style={s.shiftTimeValue}>{fmtMins(shiftDurationMins(todayShift))}</Text>
                </View>
                <View style={s.shiftTimeDivider}>
                  <View style={s.shiftTimeLine} />
                  <View style={s.shiftTimeDot} />
                  <View style={s.shiftTimeLine} />
                </View>
                <View style={s.shiftTimeBlock}>
                  <Text style={s.shiftTimeLabel}>End</Text>
                  <Text style={s.shiftTimeValue}>{fmtTime(todayShift.endTime)}</Text>
                </View>
              </View>

              {todayShift.status === 'IN_PROGRESS' && (
                <View style={s.liveTimerRow}>
                  <Ionicons name="radio-outline" size={14} color="#16A34A" />
                  <Text style={s.liveTimerText}>Elapsed</Text>
                  <Text style={s.liveTimerValue}>{elapsed}</Text>
                </View>
              )}

              {todayShift.checkInTime && (
                <View style={s.checkInRow}>
                  <Ionicons name="enter-outline" size={13} color={COLORS.textMuted} />
                  <Text style={s.checkInText}>
                    Checked in at {new Date(todayShift.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {todayShift.checkOutTime && (
                    <>
                      <Text style={s.checkInSep}>·</Text>
                      <Ionicons name="exit-outline" size={13} color={COLORS.textMuted} />
                      <Text style={s.checkInText}>
                        Out {new Date(todayShift.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={s.noShiftRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textMuted} />
              <Text style={s.noShiftText}>No shift scheduled for today</Text>
            </View>
          )}
        </View>

        {/* ── Weekly stats strip ── */}
        <View style={s.statsStrip}>
          <View style={s.statCell}>
            {statsLoading
              ? <ActivityIndicator size="small" color={GUARD_COLORS.accent} />
              : <Text style={s.statValue}>{completedShifts.length}</Text>}
            <Text style={s.statLabel}>Shifts{'\n'}(7 days)</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            {statsLoading
              ? <ActivityIndicator size="small" color={GUARD_COLORS.accent} />
              : <Text style={s.statValue}>{fmtMins(totalMinsWorked)}</Text>}
            <Text style={s.statLabel}>Hours{'\n'}Worked</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <Text style={s.statValue}>{user?.status === 'ACTIVE' ? 'Active' : user?.status ?? '—'}</Text>
            <Text style={s.statLabel}>Account{'\n'}Status</Text>
          </View>
        </View>

        {/* ── Quick actions ── */}
        <Text style={s.sectionHeader}>Quick Actions</Text>
        <View style={s.quickRow}>
          <QuickAction icon="scan-outline"     label="Scan Pass"   onPress={() => router.push('/guard/tabs/scan')}       color="#2563EB" bg="#DBEAFE" />
          <QuickAction icon="journal-outline"  label="Daily Log"   onPress={() => router.push('/guard/tabs/daily-log')}  color="#059669" bg="#D1FAE5" />
          <QuickAction icon="finger-print"     label="Attendance"  onPress={() => router.push('/guard/tabs/attendance')} color={GUARD_COLORS.accent} bg={GUARD_COLORS.accentLight} />
          <QuickAction icon="swap-horizontal"  label="Handover"    onPress={() => router.push('/guard/tabs/handover')}   color="#D97706" bg="#FEF3C7" />
        </View>

        {/* ── Shift section ── */}
        <Text style={s.sectionHeader}>Shift &amp; Gate</Text>
        <View style={s.menuSection}>
          <MenuItem
            icon="time-outline" label="Shift Schedule"
            sublabel={todayShift ? `${fmtTime(todayShift.startTime)} – ${fmtTime(todayShift.endTime)}` : 'View schedule'}
            onPress={() => router.push('/guard/tabs/attendance')}
            iconColor={GUARD_COLORS.accent} iconBg={GUARD_COLORS.accentLight}
          />
          <MenuItem
            icon="location-outline" label="Gate Assignment"
            sublabel={todayShift?.gate ?? 'No gate assigned today'}
            onPress={() => router.push('/guard/tabs/attendance')}
            iconColor="#4F46E5" iconBg="#EEF2FF"
          />
          <MenuItem
            icon="people-outline" label="Visitor Log"
            onPress={() => router.push('/guard/tabs/visitors')}
            iconColor="#0D9488" iconBg="#CCFBF1"
          />
          <MenuItem
            icon="walk-outline" label="Patrol Log"
            onPress={() => router.push('/guard/tabs/patrol')}
            iconColor="#7C3AED" iconBg="#EDE9FE"
          />
        </View>

        {/* ── Incidents & safety ── */}
        <Text style={s.sectionHeader}>Incidents &amp; Safety</Text>
        <View style={s.menuSection}>
          <MenuItem
            icon="warning-outline" label="Incidents"
            onPress={() => router.push('/guard/tabs/incidents')}
            iconColor="#DC2626" iconBg="#FEE2E2"
          />
          <MenuItem
            icon="alert-circle-outline" label="Emergency SOS"
            onPress={() => router.push('/guard/tabs/sos')}
            iconColor="#F97316" iconBg="#FFEDD5"
          />
          <MenuItem
            icon="videocam-outline" label="CCTV"
            onPress={() => router.push('/guard/cctv')}
            iconColor="#6B7280" iconBg="#F3F4F6"
          />
        </View>

        {/* ── Account ── */}
        <Text style={s.sectionHeader}>Account</Text>
        <View style={s.menuSection}>
          <MenuItem icon="person-outline"        label="My Profile"        sublabel={user?.email} onPress={() => {}} iconColor={GUARD_COLORS.accent} iconBg={GUARD_COLORS.accentLight} />
          <MenuItem icon="notifications-outline" label="Notifications"     onPress={() => router.push('/notifications')} />
          <MenuItem icon="lock-closed-outline"   label="Change Password"   onPress={() => {}} />
          <MenuItem icon="settings-outline"      label="App Settings"      onPress={() => {}} />
        </View>

        {/* ── Sign out ── */}
        <View style={[s.menuSection, { marginTop: 8 }]}>
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger iconBg={COLORS.errorLight} />
        </View>

        <Text style={s.version}>Mana Community · Guard v1.0</Text>
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={confirmLogout}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmLogout(false)}
      >
        <TouchableOpacity style={s.modalOverlay} onPress={() => setConfirmLogout(false)} activeOpacity={1} />
        <View style={s.confirmSheet}>
          <View style={s.sheetHandle} />
          <Text style={s.confirmTitle}>Sign Out</Text>
          <Text style={s.confirmMsg}>Are you sure you want to sign out?</Text>
          <TouchableOpacity
            style={s.confirmDangerBtn}
            onPress={async () => { setConfirmLogout(false); await logout(); }}
          >
            <Text style={s.confirmDangerBtnText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmLogout(false)}>
            <Text style={s.confirmCancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },

  // Hero
  hero: {
    backgroundColor: GUARD_COLORS.heroBg,
    alignItems: 'center',
    paddingTop: 32, paddingBottom: 32, paddingHorizontal: 20,
    overflow: 'hidden',
  },
  heroDot1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -70, right: -60,
  },
  heroDot2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -50, left: -50,
  },
  heroDot3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)', top: 20, left: 40,
  },
  heroAvatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14, ...SHADOWS.md,
  },
  heroAvatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, textAlign: 'center' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3, textAlign: 'center' },
  heroTagRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  heroTagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  heroStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badgeOnDuty: { backgroundColor: 'rgba(16,185,129,0.3)' },
  badgeScheduled: { backgroundColor: 'rgba(8,145,178,0.35)' },
  badgeOffDuty: { backgroundColor: 'rgba(255,255,255,0.12)' },
  statusPulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  heroStatusText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  // Today's shift card
  shiftCard: {
    marginHorizontal: SPACING.md, marginTop: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, ...SHADOWS.sm,
  },
  shiftCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  shiftCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shiftCardIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  shiftCardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  shiftStatusPill: {
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: GUARD_COLORS.accentLight,
  },
  shiftStatusText: { fontSize: 11, fontWeight: '800', color: GUARD_COLORS.accent, letterSpacing: 0.3 },

  shiftTimeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  shiftTimeBlock: { flex: 1, alignItems: 'center', gap: 4 },
  shiftTimeLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  shiftTimeValue: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  shiftTimeDivider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  shiftTimeLine: { height: 1, width: 14, backgroundColor: COLORS.border },
  shiftTimeDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: GUARD_COLORS.accent, marginHorizontal: 2,
  },

  liveTimerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.md, padding: 10,
  },
  liveTimerText: { fontSize: 12, fontWeight: '600', color: '#15803D', flex: 1 },
  liveTimerValue: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: '#16A34A' },

  checkInRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10,
  },
  checkInText: { fontSize: 12, color: COLORS.textMuted },
  checkInSep: { fontSize: 12, color: COLORS.border, marginHorizontal: 2 },

  noShiftRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, justifyContent: 'center',
  },
  noShiftText: { fontSize: 14, color: COLORS.textMuted },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', marginHorizontal: SPACING.md, marginTop: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: SPACING.md, ...SHADOWS.sm,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '900', color: GUARD_COLORS.accent },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 15 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  // Quick actions
  quickRow: {
    flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.md,
    marginTop: 4, justifyContent: 'space-between',
  },
  quickAction: { flex: 1, alignItems: 'center', gap: 7 },
  quickActionIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...SHADOWS.sm,
  },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },

  // Section header
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: SPACING.lg, marginBottom: 8, marginLeft: SPACING.md + 4,
  },

  // Menu
  menuSection: {
    backgroundColor: COLORS.surface, marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  dangerText: { color: COLORS.error },

  version: {
    textAlign: 'center', color: COLORS.textMuted,
    fontSize: 12, paddingTop: 24,
  },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  confirmSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: 32, gap: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 8,
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  confirmMsg: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  confirmDangerBtn: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.lg, paddingVertical: 14,
    alignItems: 'center',
  },
  confirmDangerBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  confirmCancelBtn: {
    borderRadius: RADIUS.lg, paddingVertical: 14,
    alignItems: 'center', backgroundColor: '#F1F5F9',
  },
  confirmCancelBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
});
