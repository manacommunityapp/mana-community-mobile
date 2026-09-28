import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, GRADIENTS, getAvatarColor } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { guardService, type GuardDashboardStats, type GuardVisitor, type GuardIncident } from '@/services/guardService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface StatCardProps {
  value: string | number;
  label: string;
  color: string;
  icon: IoniconsName;
  iconBg: string;
  sub?: string;
  subColor?: string;
}

function StatCard({ value, label, color, icon, iconBg, sub, subColor }: StatCardProps) {
  return (
    <View style={s.statCard}>
      <View style={s.statTop}>
        <View style={[s.statIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[s.statVal, { color }]}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
      {sub && <Text style={[s.statSub, subColor ? { color: subColor } : null]}>{sub}</Text>}
    </View>
  );
}

interface ActivityItemProps {
  icon: IoniconsName;
  iconColor: string;
  iconBg: string;
  title: string;
  sub: string;
  status?: string;
  statusColor?: string;
  statusBg?: string;
}

function ActivityItem({ icon, iconColor, iconBg, title, sub, status, statusColor, statusBg }: ActivityItemProps) {
  return (
    <View style={s.actItem}>
      <View style={[s.actIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={s.actBody}>
        <Text style={s.actTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.actSub} numberOfLines={1}>{sub}</Text>
      </View>
      {status && (
        <View style={[s.actStatus, { backgroundColor: statusBg }]}>
          <Text style={[s.actStatusText, { color: statusColor }]}>{status}</Text>
        </View>
      )}
    </View>
  );
}

export default function GuardDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<GuardDashboardStats | null>(null);
  const [visitors, setVisitors] = useState<GuardVisitor[]>([]);
  const [incidents, setIncidents] = useState<GuardIncident[]>([]);

  const loadData = async () => {
    const [s, v, i] = await Promise.all([
      guardService.getDashboardStats(),
      guardService.getVisitors(),
      guardService.getIncidents(),
    ]);
    setStats(s);
    setVisitors(v);
    setIncidents(i);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const avatarColor = getAvatarColor(user?.name || 'Guard');
  const recentVisitors = visitors.filter(v => v.status === 'CHECKED_IN' || v.status === 'EXPECTED').slice(0, 3);
  const openIncidents = incidents.filter(i => i.status !== 'RESOLVED').slice(0, 3);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
      >
        {/* Welcome bar */}
        <View style={s.welcome}>
          <View style={s.welcomeLeft}>
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.avatar}
            >
              <Text style={[s.avatarText, { color: '#FFFFFF' }]}>
                {(user?.name || 'G')[0].toUpperCase()}
              </Text>
            </LinearGradient>
            <View>
              <Text style={s.dutyLabel}>On Duty</Text>
              <Text style={s.userName}>{user?.name || 'Guard'}</Text>
            </View>
          </View>
          <View style={s.welcomeRight}>
            <View style={s.gateBadge}>
              <Ionicons name="location" size={12} color={GUARD_COLORS.accent} />
              <Text style={s.gateBadgeText}>Gate A</Text>
            </View>
            <TouchableOpacity style={s.notifBtn}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
              <View style={s.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsGrid}>
          <StatCard
            value={stats?.visitorsToday ?? 0}
            label="Visitors Today"
            color={GUARD_COLORS.accent}
            icon="people"
            iconBg={GUARD_COLORS.accentLight}
            sub="+3 from yesterday"
            subColor={COLORS.success}
          />
          <StatCard
            value={stats?.pendingEntry ?? 0}
            label="Pending Entry"
            color={COLORS.warning}
            icon="time"
            iconBg={COLORS.warningLight}
            sub="Awaiting approval"
          />
          <StatCard
            value={stats?.vehiclesIn ?? 0}
            label="Vehicles In"
            color={COLORS.success}
            icon="car"
            iconBg={COLORS.successLight}
          />
          <StatCard
            value={stats?.deliveries ?? 0}
            label="Deliveries"
            color={COLORS.info}
            icon="cube"
            iconBg={COLORS.infoLight}
          />
        </View>

        {/* SOS Alert Button */}
        <TouchableOpacity
          style={s.sosBtn}
          activeOpacity={0.8}
          onPress={() => guardService.raiseAlert('Emergency alert raised by guard')}
        >
          <Ionicons name="alert-circle" size={22} color="#fff" />
          <Text style={s.sosBtnText}>RAISE ALERT</Text>
        </TouchableOpacity>

        {/* Recent Visitors */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Visitors</Text>
          <TouchableOpacity onPress={() => router.push('/guard/tabs/visitors')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentVisitors.map(v => (
          <ActivityItem
            key={v.id}
            icon={v.purpose.includes('Delivery') ? 'cube' : v.preApproved ? 'checkmark-circle' : 'person'}
            iconColor={v.status === 'CHECKED_IN' ? COLORS.success : COLORS.warning}
            iconBg={v.status === 'CHECKED_IN' ? COLORS.successLight : COLORS.warningLight}
            title={`${v.name} → ${v.flat}`}
            sub={v.preApproved ? 'Pre-approved' : v.purpose}
            status={v.status === 'CHECKED_IN' ? 'IN' : 'Waiting'}
            statusColor={v.status === 'CHECKED_IN' ? COLORS.success : COLORS.warning}
            statusBg={v.status === 'CHECKED_IN' ? COLORS.successLight : COLORS.warningLight}
          />
        ))}

        {/* Open Incidents */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Open Incidents</Text>
          <TouchableOpacity onPress={() => router.push('/guard/tabs/incidents')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {openIncidents.map(i => (
          <ActivityItem
            key={i.id}
            icon={i.priority === 'HIGH' || i.priority === 'CRITICAL' ? 'alert-circle' : 'warning'}
            iconColor={i.status === 'ESCALATED' ? COLORS.warning : COLORS.error}
            iconBg={i.status === 'ESCALATED' ? COLORS.warningLight : COLORS.errorLight}
            title={i.title}
            sub={`${i.location} · ${formatTimeAgo(i.reportedAt)}`}
            status={i.status === 'ESCALATED' ? 'Escalated' : 'Open'}
            statusColor={i.status === 'ESCALATED' ? COLORS.warning : COLORS.error}
            statusBg={i.status === 'ESCALATED' ? COLORS.warningLight : COLORS.errorLight}
          />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
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
  welcome: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  welcomeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: 'DMSans-Bold', fontWeight: '700' },
  dutyLabel: { fontSize: 12, color: GUARD_COLORS.accent, fontWeight: '600' },
  userName: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  welcomeRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GUARD_COLORS.accentLight,
    borderWidth: 1, borderColor: GUARD_COLORS.accent,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  gateBadgeText: { fontSize: 11, fontWeight: '700', color: GUARD_COLORS.accent },
  notifBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.error, borderWidth: 1.5, borderColor: COLORS.surface,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, padding: 12,
  },
  statCard: {
    width: '48.5%', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  statVal: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  statLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  statSub: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginTop: 4 },
  sosBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.error, marginHorizontal: 12, marginBottom: 8,
    borderRadius: RADIUS.lg, paddingVertical: 16,
    ...SHADOWS.md,
  },
  sosBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600', color: GUARD_COLORS.accent },
  actItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  actIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  actBody: { flex: 1, gap: 2 },
  actTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actSub: { fontSize: 12, color: COLORS.textMuted },
  actStatus: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  actStatusText: { fontSize: 11, fontWeight: '700' },
});
