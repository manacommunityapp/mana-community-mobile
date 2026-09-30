import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { ADMIN_COLORS } from '@/constants/adminTheme';
import {
  adminRoleService,
  type AdminDashboardStats,
  type AdminApproval,
  type SecurityAlert,
} from '@/services/adminRoleService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface StatCardProps {
  icon: IoniconsName;
  label: string;
  value: string;
  color: string;
  bg: string;
  sub?: string;
}

function StatCard({ icon, label, value, color, bg, sub }: StatCardProps) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [approvals, setApprovals] = useState<AdminApproval[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [st, ap, al] = await Promise.all([
      adminRoleService.getDashboardStats(),
      adminRoleService.getApprovals(),
      adminRoleService.getSecurityAlerts(),
    ]);
    setStats(st);
    setApprovals(ap);
    setAlerts(al);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pendingApprovals = approvals.filter(a => a.status === 'PENDING').slice(0, 3);
  const activeAlerts = alerts.filter(a => !a.resolved).slice(0, 3);

  const netIncome = (stats?.monthlyRevenue ?? 0) - (stats?.monthlyExpenses ?? 0);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_COLORS.accent} />}
      >
        {/* Welcome */}
        <View style={s.welcome}>
          <View>
            <Text style={s.greeting}>Admin Dashboard</Text>
            <Text style={s.userName}>{user?.communityName || 'Community'}</Text>
          </View>
          <View style={s.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={ADMIN_COLORS.accent} />
            <Text style={s.roleText}>{user?.role || 'ADMIN'}</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          <StatCard icon="people" label="Residents" value={String(stats?.totalResidents ?? 0)} color="#4F46E5" bg="#EEF2FF" sub={`${stats?.totalUnits ?? 0} units`} />
          <StatCard icon="hourglass" label="Approvals" value={String(stats?.pendingApprovals ?? 0)} color={ADMIN_COLORS.accent} bg={ADMIN_COLORS.accentLight} sub="pending" />
          <StatCard icon="trending-up" label="Revenue" value={`₹${((stats?.monthlyRevenue ?? 0) / 1000).toFixed(0)}k`} color="#059669" bg="#D1FAE5" sub="this month" />
          <StatCard icon="alert-circle" label="Alerts" value={String(stats?.activeAlerts ?? 0)} color="#EA580C" bg="#FFF7ED" sub="active" />
        </View>

        {/* Finance summary card */}
        <TouchableOpacity
          style={s.financeCard}
          activeOpacity={0.7}
          onPress={() => router.push('/admin-role/tabs/finance')}
        >
          <View style={s.financeHeadRow}>
            <Text style={s.financeTitle}>Monthly Finance Summary</Text>
            <View style={s.financeLinkRow}>
              <Text style={s.seeAll}>Details</Text>
              <Ionicons name="chevron-forward" size={13} color={ADMIN_COLORS.accent} />
            </View>
          </View>
          <View style={s.financeRow}>
            <View style={s.financeItem}>
              <Ionicons name="arrow-down-circle" size={16} color="#059669" />
              <Text style={s.financeLabel}>Income</Text>
              <Text style={[s.financeValue, { color: '#059669' }]}>₹{((stats?.monthlyRevenue ?? 0) / 1000).toFixed(0)}k</Text>
            </View>
            <View style={s.financeDivider} />
            <View style={s.financeItem}>
              <Ionicons name="arrow-up-circle" size={16} color={ADMIN_COLORS.accent} />
              <Text style={s.financeLabel}>Expenses</Text>
              <Text style={[s.financeValue, { color: ADMIN_COLORS.accent }]}>₹{((stats?.monthlyExpenses ?? 0) / 1000).toFixed(0)}k</Text>
            </View>
            <View style={s.financeDivider} />
            <View style={s.financeItem}>
              <Ionicons name="wallet" size={16} color="#4F46E5" />
              <Text style={s.financeLabel}>Net</Text>
              <Text style={[s.financeValue, { color: '#4F46E5' }]}>₹{(netIncome / 1000).toFixed(0)}k</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Pending approvals */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Pending Approvals</Text>
          <TouchableOpacity onPress={() => router.push('/admin-role/tabs/approvals')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {pendingApprovals.map(a => {
          const typeIcons: Record<string, { icon: IoniconsName; color: string; bg: string }> = {
            MEMBER: { icon: 'person-add', color: '#4F46E5', bg: '#EEF2FF' },
            VENDOR: { icon: 'briefcase', color: '#D97706', bg: '#FEF3C7' },
            POST: { icon: 'chatbox-ellipses', color: '#7C3AED', bg: '#EDE9FE' },
            EVENT: { icon: 'calendar', color: '#059669', bg: '#D1FAE5' },
          };
          const meta = typeIcons[a.type] || typeIcons.MEMBER;
          return (
            <View key={a.id} style={s.activityCard}>
              <View style={[s.activityIcon, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={s.activityBody}>
                <Text style={s.activityTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={s.activityMeta}>{a.submittedBy} · {a.flat}</Text>
                <Text style={s.activityMeta}>{formatTimeAgo(a.submittedAt)}</Text>
              </View>
              <View style={[s.typeBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.typeBadgeText, { color: meta.color }]}>{a.type}</Text>
              </View>
            </View>
          );
        })}

        {/* Security alerts */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Active Alerts</Text>
          <TouchableOpacity onPress={() => router.push('/admin-role/tabs/security')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {activeAlerts.map(al => {
          const levelMeta: Record<string, { color: string; bg: string }> = {
            INFO: { color: '#2563EB', bg: '#DBEAFE' },
            WARNING: { color: '#D97706', bg: '#FEF3C7' },
            CRITICAL: { color: COLORS.error, bg: COLORS.errorLight },
          };
          const meta = levelMeta[al.level] || levelMeta.INFO;
          return (
            <View key={al.id} style={[s.activityCard, al.level === 'CRITICAL' && s.urgentBorder]}>
              <View style={[s.activityIcon, { backgroundColor: meta.bg }]}>
                <Ionicons name={al.level === 'CRITICAL' ? 'alert-circle' : 'warning'} size={18} color={meta.color} />
              </View>
              <View style={s.activityBody}>
                <Text style={s.activityTitle} numberOfLines={1}>{al.title}</Text>
                <Text style={s.activityMeta}>{al.location}</Text>
                <Text style={s.activityMeta}>{formatTimeAgo(al.reportedAt)}</Text>
              </View>
              <View style={[s.typeBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.typeBadgeText, { color: meta.color }]}>{al.level}</Text>
              </View>
            </View>
          );
        })}

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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  welcome: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ADMIN_COLORS.accentLight, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: ADMIN_COLORS.accentMid,
  },
  roleText: { fontSize: 11, fontWeight: '800', color: ADMIN_COLORS.accentDark },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 12, marginBottom: 4,
  },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },
  statSub: { fontSize: 10, color: COLORS.textMuted },

  financeCard: {
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 8,
    borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  financeHeadRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  financeLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  financeTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  financeRow: { flexDirection: 'row', alignItems: 'center' },
  financeItem: { flex: 1, alignItems: 'center', gap: 4 },
  financeLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  financeValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  financeDivider: { width: 1, height: 40, backgroundColor: COLORS.border },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2 },
  seeAll: { fontSize: 12, fontWeight: '600', color: ADMIN_COLORS.accent },

  activityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 6,
    borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  urgentBorder: { borderColor: COLORS.error, borderWidth: 1.5 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityBody: { flex: 1, gap: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  activityMeta: { fontSize: 11, color: COLORS.textMuted },
  typeBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
});
