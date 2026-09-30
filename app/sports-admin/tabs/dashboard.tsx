import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { SPORTS_ADMIN_COLORS } from '@/constants/sportsAdminTheme';
import {
  sportsAdminService,
  type SportsAdminDashboardStats,
  type MatchSummary,
  type TournamentSummary,
} from '@/services/sportsAdminService';

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

export default function SportsAdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SportsAdminDashboardStats | null>(null);
  const [liveMatches, setLiveMatches] = useState<MatchSummary[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [st, lm, tr] = await Promise.all([
      sportsAdminService.getDashboardStats(),
      sportsAdminService.getLiveMatches(),
      sportsAdminService.getTournaments(),
    ]);
    setStats(st);
    setLiveMatches(lm);
    setTournaments(tr.slice(0, 5));
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusColor: Record<string, { color: string; bg: string }> = {
    ONGOING: { color: SPORTS_ADMIN_COLORS.accent, bg: SPORTS_ADMIN_COLORS.accentLight },
    REGISTRATION_OPEN: { color: '#2563EB', bg: '#DBEAFE' },
    UPCOMING: { color: '#D97706', bg: '#FEF3C7' },
    COMPLETED: { color: COLORS.textMuted, bg: COLORS.surfaceAlt },
    LIVE: { color: '#DC2626', bg: '#FEE2E2' },
    SCHEDULED: { color: '#4F46E5', bg: '#EEF2FF' },
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SPORTS_ADMIN_COLORS.accent} />}
      >
        <View style={s.welcome}>
          <View>
            <Text style={s.greeting}>Sports Dashboard</Text>
            <Text style={s.userName}>{user?.communityName || 'Community'}</Text>
          </View>
          <View style={s.roleBadge}>
            <Ionicons name="trophy" size={14} color={SPORTS_ADMIN_COLORS.accent} />
            <Text style={s.roleText}>SPORTS ADMIN</Text>
          </View>
        </View>

        <View style={s.statsGrid}>
          <StatCard icon="trophy" label="Tournaments" value={String(stats?.totalTournaments ?? 0)} color={SPORTS_ADMIN_COLORS.accent} bg={SPORTS_ADMIN_COLORS.accentLight} sub={`${stats?.activeTournaments ?? 0} active`} />
          <StatCard icon="pulse" label="Live Matches" value={String(stats?.liveMatches ?? 0)} color="#DC2626" bg="#FEE2E2" sub="in progress" />
          <StatCard icon="people" label="Teams" value={String(stats?.totalTeams ?? 0)} color="#4F46E5" bg="#EEF2FF" sub="registered" />
          <StatCard icon="fitness" label="Players" value={String(stats?.totalPlayers ?? 0)} color="#D97706" bg="#FEF3C7" sub="participating" />
        </View>

        {liveMatches.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Live Matches</Text>
              <View style={s.liveDot} />
            </View>
            {liveMatches.map(m => (
              <View key={m.id} style={[s.matchCard, { borderLeftColor: '#DC2626', borderLeftWidth: 3 }]}>
                <View style={s.matchHeader}>
                  <Text style={s.matchTournament}>{m.tournamentName}</Text>
                  <View style={[s.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[s.statusText, { color: '#DC2626' }]}>LIVE</Text>
                  </View>
                </View>
                <View style={s.matchTeams}>
                  <Text style={s.teamName}>{m.teamA}</Text>
                  <View style={s.scoreWrap}>
                    <Text style={s.score}>{m.scoreA || '-'}</Text>
                    <Text style={s.scoreDivider}>vs</Text>
                    <Text style={s.score}>{m.scoreB || '-'}</Text>
                  </View>
                  <Text style={s.teamName}>{m.teamB}</Text>
                </View>
                {m.venue && <Text style={s.matchVenue}>{m.venue}</Text>}
              </View>
            ))}
          </>
        )}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Tournaments</Text>
          <TouchableOpacity><Text style={s.seeAll}>See All</Text></TouchableOpacity>
        </View>
        {tournaments.map(t => {
          const meta = statusColor[t.status] || statusColor.UPCOMING;
          return (
            <View key={t.id} style={s.activityCard}>
              <View style={[s.activityIcon, { backgroundColor: SPORTS_ADMIN_COLORS.accentLight }]}>
                <Ionicons name="trophy" size={18} color={SPORTS_ADMIN_COLORS.accent} />
              </View>
              <View style={s.activityBody}>
                <Text style={s.activityTitle} numberOfLines={1}>{t.name}</Text>
                <Text style={s.activityMeta}>{formatSport(t.sport)} · {t.format}</Text>
                <Text style={s.activityMeta}>{t.teamsRegistered}/{t.maxTeams} teams · {t.startDate.split('T')[0]}</Text>
              </View>
              <View style={[s.typeBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.typeBadgeText, { color: meta.color }]}>{formatStatus(t.status)}</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatSport(sport: string): string {
  return sport.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatStatus(status: string): string {
  return status.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  welcome: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SPORTS_ADMIN_COLORS.accentLight, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: SPORTS_ADMIN_COLORS.accentMid,
  },
  roleText: { fontSize: 11, fontWeight: '800', color: SPORTS_ADMIN_COLORS.accentDark },

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

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2 },
  seeAll: { fontSize: 12, fontWeight: '600', color: SPORTS_ADMIN_COLORS.accent },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },

  matchCard: {
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 8,
    borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  matchTournament: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  statusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 9, fontWeight: '800' },
  matchTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  scoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  score: { fontSize: 18, fontWeight: '800', color: SPORTS_ADMIN_COLORS.accent },
  scoreDivider: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  matchVenue: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },

  activityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 6,
    borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  activityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityBody: { flex: 1, gap: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  activityMeta: { fontSize: 11, color: COLORS.textMuted },
  typeBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
});
