import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, SPACING, getAvatarColor, getInitials } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { guardService, type GuardVisitor, type GuardIncident } from '@/services/guardService';
import { safetyService, type GuardShift } from '@/services/safetyService';
import { visitorService } from '@/services/visitorService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ── helpers ───────────────────────────────────────────────────────────────────

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(t?: string) {
  if (!t) return '--';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
}

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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

function StatCard({ value, label, color, icon, iconBg, badge }: {
  value: number | string; label: string; color: string;
  icon: IoniconsName; iconBg: string; badge?: number;
}) {
  return (
    <View style={s.statCard}>
      <View style={s.statTopRow}>
        <View style={[s.statIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color={color} />
        </View>
        {badge != null && badge > 0 && (
          <View style={s.statBadge}><Text style={s.statBadgeText}>{badge > 99 ? '99+' : badge}</Text></View>
        )}
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function QuickBtn({ icon, label, onPress, color, bg, badge }: {
  icon: IoniconsName; label: string; onPress: () => void;
  color: string; bg: string; badge?: number;
}) {
  return (
    <TouchableOpacity style={s.qBtn} onPress={onPress} activeOpacity={0.72}>
      <View style={{ position: 'relative' }}>
        <View style={[s.qBtnIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {badge != null && badge > 0 && (
          <View style={s.qBtnBadge}><Text style={s.qBtnBadgeText}>{badge > 9 ? '9+' : badge}</Text></View>
        )}
      </View>
      <Text style={s.qBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const PRIORITY_META = {
  CRITICAL: { color: '#DC2626', bg: '#FEE2E2', label: 'CRITICAL' },
  HIGH:     { color: '#EA580C', bg: '#FFEDD5', label: 'HIGH' },
  MEDIUM:   { color: '#D97706', bg: '#FEF3C7', label: 'MEDIUM' },
  LOW:      { color: '#059669', bg: '#D1FAE5', label: 'LOW' },
} as const;

const VISITOR_STATUS_META = {
  CHECKED_IN:  { color: '#059669', bg: '#D1FAE5', label: 'IN' },
  EXPECTED:    { color: GUARD_COLORS.accent, bg: GUARD_COLORS.accentLight, label: 'Waiting' },
  CHECKED_OUT: { color: '#6B7280', bg: '#F3F4F6', label: 'OUT' },
  DENIED:      { color: '#DC2626', bg: '#FEE2E2', label: 'Denied' },
} as const;

// ── SOS hold-to-confirm button ────────────────────────────────────────────────

function SosButton({ onConfirm }: { onConfirm: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<ReturnType<typeof Animated.timing> | null>(null);

  const start = () => {
    anim.current = Animated.timing(progress, { toValue: 1, duration: 2000, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished) { progress.setValue(0); onConfirm(); }
    });
  };
  const cancel = () => {
    anim.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <TouchableOpacity
      style={s.sosBtn}
      onPressIn={start}
      onPressOut={cancel}
      activeOpacity={0.9}
    >
      <Animated.View style={[s.sosProgress, { width }]} />
      <View style={s.sosContent}>
        <Ionicons name="alert-circle" size={20} color="#fff" />
        <Text style={s.sosBtnText}>HOLD TO RAISE ALERT</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function GuardDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const displayName = user?.fullName || user?.name || (user?.email ? user.email.split('@')[0] : 'Guard');
  const avatarBg = getAvatarColor(displayName).bg;

  const [refreshing, setRefreshing] = useState(false);
  const [todayShift, setTodayShift] = useState<GuardShift | null>(null);
  const [stats, setStats] = useState<{ visitorsToday: number; pendingEntry: number; vehiclesIn: number; openIncidents: number; pendingApprovals: number } | null>(null);
  const [recentVisitors, setRecentVisitors] = useState<GuardVisitor[]>([]);
  const [openIncidents, setOpenIncidents] = useState<GuardIncident[]>([]);

  const elapsed = useLiveElapsed(todayShift?.status === 'IN_PROGRESS' ? todayShift.checkInTime : null);

  const loadData = async () => {
    const [shiftRes, statsRes, visitorsRes, incidentsRes, pendingRes] = await Promise.allSettled([
      safetyService.getGuardShifts(isoToday()),
      guardService.getDashboardStats(),
      guardService.getVisitors(),
      guardService.getIncidents(),
      visitorService.getPendingApprovals(),
    ]);

    if (shiftRes.status === 'fulfilled') {
      const mine = shiftRes.value.find(s => s.guardId === user?.id) || shiftRes.value[0] || null;
      setTodayShift(mine);
    }

    const rawStats = statsRes.status === 'fulfilled' ? statsRes.value : null;
    const pending = pendingRes.status === 'fulfilled' ? pendingRes.value.length : 0;
    setStats({
      visitorsToday: rawStats?.visitorsToday ?? 0,
      pendingEntry: rawStats?.pendingEntry ?? 0,
      vehiclesIn: rawStats?.vehiclesIn ?? 0,
      openIncidents: rawStats?.openIncidents ?? 0,
      pendingApprovals: pending,
    });

    if (visitorsRes.status === 'fulfilled') {
      setRecentVisitors(
        visitorsRes.value
          .filter(v => v.status === 'CHECKED_IN' || v.status === 'EXPECTED')
          .slice(0, 4),
      );
    }

    if (incidentsRes.status === 'fulfilled') {
      setOpenIncidents(
        (incidentsRes.value as unknown as GuardIncident[])
          .filter(i => i.status !== 'RESOLVED')
          .slice(0, 3),
      );
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSosConfirm = () => {
    Alert.alert(
      'Alert Raised',
      'Emergency alert has been sent to the control room and community admin.',
      [{ text: 'OK' }],
    );
    guardService.raiseAlert('Emergency alert raised by guard via dashboard');
  };

  const dutyStatus = todayShift?.status === 'IN_PROGRESS'
    ? 'ON DUTY' : todayShift?.status === 'SCHEDULED' ? 'SCHEDULED' : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
        contentContainerStyle={s.scroll}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={[s.avatar, { backgroundColor: avatarBg }]}>
              <Text style={s.avatarText}>{getInitials(displayName)}</Text>
            </View>
            <View>
              <Text style={s.greeting}>{greeting}</Text>
              <Text style={s.userName}>{displayName}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            {dutyStatus && (
              <View style={[s.dutyBadge, dutyStatus === 'ON DUTY' && s.dutyBadgeActive]}>
                {dutyStatus === 'ON DUTY' && <View style={s.dutyDot} />}
                <Text style={[s.dutyBadgeText, dutyStatus === 'ON DUTY' && s.dutyBadgeTextActive]}>
                  {dutyStatus}
                </Text>
              </View>
            )}
            <TouchableOpacity style={s.notifBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
              {(stats?.pendingApprovals ?? 0) > 0 && <View style={s.notifDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Shift banner ── */}
        {todayShift && (
          <TouchableOpacity
            style={[s.shiftBanner, todayShift.status === 'IN_PROGRESS' && s.shiftBannerActive]}
            onPress={() => router.push('/guard/tabs/attendance')}
            activeOpacity={0.85}
          >
            <View style={s.shiftBannerLeft}>
              <Text style={s.shiftBannerLabel}>Today's Shift</Text>
              <Text style={s.shiftBannerWindow}>
                {fmtTime(todayShift.startTime)} – {fmtTime(todayShift.endTime)}
                {todayShift.gate ? `  ·  ${todayShift.gate}` : ''}
              </Text>
              {todayShift.status === 'IN_PROGRESS' && (
                <View style={s.shiftTimerRow}>
                  <Ionicons name="radio-outline" size={12} color="#16A34A" />
                  <Text style={s.shiftTimerText}>{elapsed}</Text>
                </View>
              )}
            </View>
            <View style={[
              s.shiftBannerBadge,
              todayShift.status === 'IN_PROGRESS' && { backgroundColor: '#DCFCE7' },
              todayShift.status === 'SCHEDULED' && { backgroundColor: GUARD_COLORS.accentLight },
              todayShift.status === 'COMPLETED' && { backgroundColor: '#F0FDF4' },
            ]}>
              <Text style={[
                s.shiftBannerBadgeText,
                todayShift.status === 'IN_PROGRESS' && { color: '#16A34A' },
                todayShift.status === 'SCHEDULED' && { color: GUARD_COLORS.accent },
                todayShift.status === 'COMPLETED' && { color: '#15803D' },
              ]}>
                {todayShift.status?.replace('_', ' ')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Pending approvals alert ── */}
        {(stats?.pendingApprovals ?? 0) > 0 && (
          <TouchableOpacity
            style={s.approvalAlert}
            onPress={() => router.push('/visitors/pending-approvals')}
            activeOpacity={0.85}
          >
            <View style={s.approvalAlertIcon}>
              <Ionicons name="person-add" size={18} color="#D97706" />
            </View>
            <View style={s.approvalAlertBody}>
              <Text style={s.approvalAlertTitle}>
                {stats!.pendingApprovals} visitor{stats!.pendingApprovals > 1 ? 's' : ''} awaiting approval
              </Text>
              <Text style={s.approvalAlertSub}>Tap to review &amp; approve</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* ── Stats grid ── */}
        <View style={s.statsGrid}>
          <StatCard
            value={stats?.visitorsToday ?? '—'}
            label="Visitors Today"
            color={GUARD_COLORS.accent}
            icon="people"
            iconBg={GUARD_COLORS.accentLight}
          />
          <StatCard
            value={stats?.pendingApprovals ?? '—'}
            label="Pending Approval"
            color={COLORS.warning}
            icon="time"
            iconBg={COLORS.warningLight}
            badge={stats?.pendingApprovals}
          />
          <StatCard
            value={stats?.vehiclesIn ?? '—'}
            label="Vehicles In"
            color={COLORS.success}
            icon="car"
            iconBg={COLORS.successLight}
          />
          <StatCard
            value={stats?.openIncidents ?? '—'}
            label="Open Incidents"
            color={COLORS.error}
            icon="warning"
            iconBg={COLORS.errorLight}
            badge={stats?.openIncidents}
          />
        </View>

        {/* ── Quick actions ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
          <QuickBtn icon="scan-outline"     label="Scan QR"      onPress={() => router.push('/guard/tabs/scan')}       color="#2563EB" bg="#DBEAFE" />
          <QuickBtn icon="person-add-outline" label="Walk-In"    onPress={() => router.push('/guard/walk-in')}         color="#7C3AED" bg="#EDE9FE" />
          <QuickBtn
            icon="checkmark-circle-outline" label="Approvals"
            onPress={() => router.push('/visitors/pending-approvals')}
            color="#D97706" bg="#FEF3C7"
            badge={stats?.pendingApprovals}
          />
          <QuickBtn icon="journal-outline"  label="Daily Log"    onPress={() => router.push('/guard/tabs/daily-log')}  color="#059669" bg="#D1FAE5" />
          <QuickBtn icon="walk-outline"     label="Patrol"       onPress={() => router.push('/guard/tabs/patrol')}     color="#4F46E5" bg="#EEF2FF" />
          <QuickBtn icon="swap-horizontal"  label="Handover"     onPress={() => router.push('/guard/tabs/handover')}   color="#0D9488" bg="#CCFBF1" />
          <QuickBtn icon="videocam-outline" label="CCTV"         onPress={() => router.push('/guard/cctv')}            color="#6B7280" bg="#F3F4F6" />
        </ScrollView>

        {/* ── Recent visitors ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Recent Visitors</Text>
          <TouchableOpacity onPress={() => router.push('/guard/tabs/visitors')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={s.listCard}>
          {recentVisitors.length === 0 ? (
            <View style={s.emptyRow}>
              <Ionicons name="person-outline" size={22} color={COLORS.textMuted} />
              <Text style={s.emptyText}>No active visitors right now</Text>
            </View>
          ) : recentVisitors.map((v, idx) => {
            const meta = VISITOR_STATUS_META[v.status as keyof typeof VISITOR_STATUS_META] ?? VISITOR_STATUS_META['EXPECTED'];
            return (
              <View key={v.id} style={[s.listRow, idx === recentVisitors.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.listIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons
                    name={v.purpose.toLowerCase().includes('deliver') ? 'cube-outline' : v.preApproved ? 'checkmark-circle-outline' : 'person-outline'}
                    size={16} color={meta.color}
                  />
                </View>
                <View style={s.listBody}>
                  <Text style={s.listPrimary} numberOfLines={1}>{v.name}</Text>
                  <Text style={s.listSub} numberOfLines={1}>
                    {v.flat}  ·  {v.purpose}
                  </Text>
                </View>
                <View>
                  <View style={[s.pill, { backgroundColor: meta.bg }]}>
                    <Text style={[s.pillText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={s.listTime}>{timeAgo(v.checkedInAt ?? v.expectedAt)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Open incidents ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Open Incidents</Text>
          <TouchableOpacity onPress={() => router.push('/guard/tabs/incidents')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={s.listCard}>
          {openIncidents.length === 0 ? (
            <View style={s.emptyRow}>
              <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.success} />
              <Text style={s.emptyText}>No open incidents — all clear</Text>
            </View>
          ) : openIncidents.map((inc, idx) => {
            const pm = PRIORITY_META[inc.priority as keyof typeof PRIORITY_META] ?? PRIORITY_META['MEDIUM'];
            return (
              <View key={inc.id} style={[s.listRow, idx === openIncidents.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.listIcon, { backgroundColor: pm.bg }]}>
                  <Ionicons
                    name={inc.priority === 'CRITICAL' || inc.priority === 'HIGH' ? 'alert-circle-outline' : 'warning-outline'}
                    size={16} color={pm.color}
                  />
                </View>
                <View style={s.listBody}>
                  <Text style={s.listPrimary} numberOfLines={1}>{inc.title}</Text>
                  <Text style={s.listSub} numberOfLines={1}>
                    {inc.location}  ·  {timeAgo(inc.reportedAt)}
                  </Text>
                </View>
                <View style={[s.pill, { backgroundColor: pm.bg }]}>
                  <Text style={[s.pillText, { color: pm.color }]}>{pm.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── SOS hold button ── */}
        <SosButton onConfirm={handleSosConfirm} />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 16 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  avatarText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  greeting: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  userName: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dutyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  dutyBadgeActive: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  dutyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  dutyBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  dutyBadgeTextActive: { color: '#15803D' },
  notifBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.error, borderWidth: 1.5, borderColor: COLORS.surface,
  },

  // Shift banner
  shiftBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: SPACING.md, marginTop: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  shiftBannerActive: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  shiftBannerLeft: { gap: 3 },
  shiftBannerLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  shiftBannerWindow: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  shiftTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  shiftTimerText: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: '#16A34A' },
  shiftBannerBadge: {
    borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: GUARD_COLORS.accentLight,
  },
  shiftBannerBadgeText: { fontSize: 11, fontWeight: '800', color: GUARD_COLORS.accent, letterSpacing: 0.3 },

  // Pending approval alert
  approvalAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.lg,
    padding: 12, borderWidth: 1, borderColor: '#FDE68A', ...SHADOWS.sm,
  },
  approvalAlertIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
  },
  approvalAlertBody: { flex: 1 },
  approvalAlertTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  approvalAlertSub: { fontSize: 12, color: '#B45309', marginTop: 1 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md,
  },
  statCard: {
    width: '47.5%', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, gap: 4,
  },
  statTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  statIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statBadge: {
    backgroundColor: COLORS.error, borderRadius: 8, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  statBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },

  // Quick actions
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600', color: GUARD_COLORS.accent },
  quickRow: { gap: 6, paddingHorizontal: SPACING.md, paddingBottom: 4 },
  qBtn: { alignItems: 'center', gap: 7, width: 68 },
  qBtnIcon: {
    width: 54, height: 54, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...SHADOWS.sm,
  },
  qBtnBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.error, borderRadius: 8, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    borderWidth: 2, borderColor: COLORS.background,
  },
  qBtnBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  qBtnLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },

  // Shared list card
  listCard: {
    marginHorizontal: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  listIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  listBody: { flex: 1, gap: 2 },
  listPrimary: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  listSub: { fontSize: 12, color: COLORS.textMuted },
  listTime: { fontSize: 10, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  pill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end' },
  pillText: { fontSize: 10, fontWeight: '800' },

  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 20, justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: COLORS.textMuted },

  // SOS
  sosBtn: {
    overflow: 'hidden',
    marginHorizontal: SPACING.md, marginTop: SPACING.lg,
    backgroundColor: COLORS.error, borderRadius: RADIUS.lg,
    paddingVertical: 18, ...SHADOWS.md,
  },
  sosProgress: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sosContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  sosBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
