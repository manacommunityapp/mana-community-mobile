import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { StatCard } from '@/components/admin/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';

interface QuickAction {
  emoji:  string;
  label:  string;
  sub:    string;
  route:  string;
  badge?: number;
  color:  string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  adminService.getStats,
    refetchInterval: 60_000,
  });

  const quickActions: QuickAction[] = [
    {
      emoji: '👥', label: 'Members',       sub: 'Approve & manage',
      route: '/admin/members',
      badge: stats?.pendingApprovals,      color: COLORS.primary,
    },
    {
      emoji: '🚨', label: 'Moderation',    sub: 'Review reports',
      route: '/admin/moderation',
      badge: stats?.pendingReports,        color: COLORS.error,
    },
    {
      emoji: '📢', label: 'Announcements', sub: 'Broadcast to all',
      route: '/admin/announcements',       color: COLORS.warning,
    },
    {
      emoji: '⚙️', label: 'Community',     sub: 'Settings & invite',
      route: '/admin/community-settings',  color: COLORS.success,
    },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>Admin Panel</Text>
          <Text style={s.headerSub}>{user?.communityName ?? 'Community'}</Text>
        </View>
        <View style={s.roleBadge}>
          <Text style={s.roleText}>{user?.role}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats grid ── */}
        <Text style={s.sectionTitle}>Overview</Text>

        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={s.statsGrid}>
              <StatCard
                emoji="👥" label="Total Members"
                value={stats?.totalMembers ?? 0}
                sub={`+${stats?.newMembersThisMonth ?? 0} this month`}
                accent={COLORS.primary}
                onPress={() => router.push('/admin/members')}
              />
              <StatCard
                emoji="⏳" label="Pending Approval"
                value={stats?.pendingApprovals ?? 0}
                sub="Tap to review"
                accent={stats?.pendingApprovals ? COLORS.warning : COLORS.success}
                onPress={() => router.push('/admin/members')}
              />
            </View>

            <View style={s.statsGrid}>
              <StatCard
                emoji="📝" label="Posts Today"
                value={stats?.postsToday ?? 0}
                sub={`${stats?.totalPosts ?? 0} total`}
              />
              <StatCard
                emoji="📅" label="Events This Week"
                value={stats?.eventsThisWeek ?? 0}
              />
            </View>

            <View style={s.statsGrid}>
              <StatCard
                emoji="🚨" label="Open Reports"
                value={stats?.pendingReports ?? 0}
                sub={stats?.pendingReports ? 'Needs attention' : 'All clear'}
                accent={stats?.pendingReports ? COLORS.error : COLORS.success}
                onPress={() => router.push('/admin/moderation')}
              />
              <StatCard
                emoji="✅" label="Active Members"
                value={stats?.activeMembers ?? 0}
                sub={`${stats?.suspendedMembers ?? 0} suspended`}
              />
            </View>
          </>
        )}

        {/* ── Quick Actions ── */}
        <Text style={[s.sectionTitle, { marginTop: 8 }]}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={s.actionCard}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              {/* Badge */}
              {!!a.badge && (
                <View style={[s.actionBadge, { backgroundColor: a.color }]}>
                  <Text style={s.actionBadgeText}>{a.badge}</Text>
                </View>
              )}
              <Text style={s.actionEmoji}>{a.emoji}</Text>
              <Text style={s.actionLabel}>{a.label}</Text>
              <Text style={s.actionSub}>{a.sub}</Text>
              <View style={[s.actionBar, { backgroundColor: a.color }]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Role info ── */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>🔐 Admin Access</Text>
          <Text style={s.infoText}>
            You are logged in as <Text style={s.infoRole}>{user?.role}</Text>.
            Actions taken here affect all community members.
            Changes are logged and attributed to your account.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  backText:        { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  headerMid:       { flex: 1 },
  headerTitle:     { fontSize: 18, fontWeight: '800', color: COLORS.text },
  headerSub:       { fontSize: 12, color: COLORS.textMuted },
  roleBadge:       { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  roleText:        { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  scroll:          { padding: 16, gap: 12 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid:       { flexDirection: 'row', gap: 12 },
  actionsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard:      { width: '47%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, gap: 4, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', position: 'relative' },
  actionBadge:     { position: 'absolute', top: 10, right: 10, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  actionBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  actionEmoji:     { fontSize: 28, marginBottom: 4 },
  actionLabel:     { fontSize: 15, fontWeight: '700', color: COLORS.text },
  actionSub:       { fontSize: 12, color: COLORS.textMuted },
  actionBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 0 },
  infoCard:        { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, gap: 6, borderWidth: 1, borderColor: '#FCD34D', marginTop: 4 },
  infoTitle:       { fontSize: 14, fontWeight: '700', color: '#92400E' },
  infoText:        { fontSize: 13, color: '#78350F', lineHeight: 19 },
  infoRole:        { fontWeight: '700' },
});
