import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { ScoreCard } from '@/components/sports/ScoreCard';
import { SPORT_EMOJI } from '@/components/sports/TournamentCard';
import { COLORS } from '@/constants/config';
import { format } from 'date-fns';

const TABS = ['Overview', 'Teams', 'Schedule', 'Standings'] as const;
type Tab = typeof TABS[number];

const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT: 'Knockout', ROUND_ROBIN: 'Round Robin',
  LEAGUE:   'League',   SWISS:       'Swiss',
};

// ── Standings table ────────────────────────────────────────────
function StandingsTable({ tournamentId }: { tournamentId: number }) {
  const { data: standings = [], isLoading } = useQuery({
    queryKey: ['standings', tournamentId],
    queryFn:  () => sportsService.getStandings(tournamentId),
  });

  if (isLoading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />;
  if (standings.length === 0) return (
    <View style={st.empty}><Text style={st.emptyText}>Standings not available yet.</Text></View>
  );

  return (
    <View style={st.wrap}>
      {/* Header */}
      <View style={st.header}>
        <Text style={[st.col, st.pos]}>#</Text>
        <Text style={[st.col, { flex: 1 }]}>Team</Text>
        <Text style={st.col}>P</Text>
        <Text style={st.col}>W</Text>
        <Text style={st.col}>D</Text>
        <Text style={st.col}>L</Text>
        <Text style={[st.col, { fontWeight: '700', color: COLORS.primary }]}>Pts</Text>
      </View>
      {standings.map((row) => (
        <View key={row.teamId} style={[st.row, row.position <= 2 && st.rowHighlight]}>
          <Text style={[st.col, st.pos, row.position <= 2 && { color: COLORS.primary }]}>
            {row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : row.position}
          </Text>
          <View style={[st.col, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <Text style={{ fontSize: 16 }}>{row.teamEmoji}</Text>
            <Text style={st.teamName} numberOfLines={1}>{row.teamName}</Text>
          </View>
          <Text style={st.col}>{row.played}</Text>
          <Text style={st.col}>{row.won}</Text>
          <Text style={st.col}>{row.drawn}</Text>
          <Text style={st.col}>{row.lost}</Text>
          <Text style={[st.col, { fontWeight: '800', color: COLORS.primary }]}>{row.points}</Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  wrap:       { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  header:     { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
  row:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, gap: 4, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  rowHighlight: { backgroundColor: '#F5F3FF' },
  col:        { width: 28, fontSize: 12, color: COLORS.text, textAlign: 'center', fontWeight: '500' },
  pos:        { width: 28, textAlign: 'center' },
  teamName:   { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  empty:      { alignItems: 'center', padding: 32 },
  emptyText:  { color: COLORS.textMuted },
});

// ── Main screen ────────────────────────────────────────────────
export default function TournamentDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const qc       = useQueryClient();
  const [tab, setTab] = useState<Tab>('Overview');

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn:  () => sportsService.getTournament(Number(id)),
  });

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['tournament-teams', id],
    queryFn:  () => sportsService.getTeams(Number(id)),
    enabled:  tab === 'Teams',
  });

  const { data: matchesPage, isLoading: loadingMatches } = useQuery({
    queryKey: ['tournament-matches', id],
    queryFn:  () => sportsService.getMatches(Number(id)),
    enabled:  tab === 'Schedule',
  });
  const matches = matchesPage?.content ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={scr.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!tournament) return null;

  const canRegister = tournament.status === 'REGISTRATION_OPEN' && !tournament.myTeamRegistered;

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      {/* Header */}
      <View style={scr.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={scr.back}>‹</Text>
        </TouchableOpacity>
        <Text style={scr.headerTitle} numberOfLines={1}>{tournament.name}</Text>
        {tournament.myTeamRegistered && (
          <View style={scr.registeredBadge}><Text style={scr.registeredText}>Registered</Text></View>
        )}
      </View>

      {/* Hero banner */}
      <View style={scr.hero}>
        <Text style={scr.heroEmoji}>{SPORT_EMOJI[tournament.sport] ?? '🏅'}</Text>
        <View style={scr.heroInfo}>
          <Text style={scr.heroName}>{tournament.name}</Text>
          <Text style={scr.heroMeta}>
            {FORMAT_LABEL[tournament.format]} · {tournament.teamSize}v{tournament.teamSize}
          </Text>
          <Text style={scr.heroOrg}>Organised by {tournament.organizerName}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scr.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[scr.tab, tab === t && scr.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[scr.tabText, tab === t && scr.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={scr.body} showsVerticalScrollIndicator={false}>
        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <View style={scr.section}>
            {tournament.description && (
              <View style={scr.card}>
                <Text style={scr.cardTitle}>About</Text>
                <Text style={scr.desc}>{tournament.description}</Text>
              </View>
            )}
            <View style={scr.card}>
              <Text style={scr.cardTitle}>Details</Text>
              {[
                ['📅 Dates',      `${format(new Date(tournament.startDate),'dd MMM')} – ${format(new Date(tournament.endDate),'dd MMM yyyy')}`],
                ['📋 Format',     FORMAT_LABEL[tournament.format]],
                ['👥 Team size',  `${tournament.teamSize} players`],
                ['🏟️ Teams',      `${tournament.registeredTeamsCount} / ${tournament.maxTeams} registered`],
                tournament.venue ? ['📍 Venue', tournament.venue] : null,
                tournament.prizes ? ['🏆 Prizes', tournament.prizes] : null,
                tournament.registrationDeadline
                  ? ['⏰ Reg. deadline', format(new Date(tournament.registrationDeadline),'dd MMM, h:mm a')]
                  : null,
              ].filter(Boolean).map(([label, value]) => (
                <View key={label!} style={scr.detailRow}>
                  <Text style={scr.detailLabel}>{label}</Text>
                  <Text style={scr.detailValue}>{value}</Text>
                </View>
              ))}
            </View>
            {tournament.rules && (
              <View style={scr.card}>
                <Text style={scr.cardTitle}>Rules</Text>
                <Text style={scr.desc}>{tournament.rules}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── TEAMS ── */}
        {tab === 'Teams' && (
          <View style={scr.section}>
            {loadingTeams ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : teams.length === 0 ? (
              <View style={scr.empty}><Text style={scr.emptyText}>No teams registered yet.</Text></View>
            ) : (
              teams.map((team) => (
                <View key={team.id} style={[scr.teamCard, team.isMyTeam && scr.teamCardMine]}>
                  <Text style={scr.teamEmoji}>{team.logoEmoji}</Text>
                  <View style={scr.teamInfo}>
                    <View style={scr.teamNameRow}>
                      <Text style={scr.teamName}>{team.name}</Text>
                      {team.status === 'WINNER' && <Text style={scr.winnerBadge}>🏆 Winner</Text>}
                      {team.isMyTeam && <Text style={scr.myBadge}>My Team</Text>}
                    </View>
                    <Text style={scr.teamCaptain}>Captain: {team.captainName}</Text>
                    <Text style={scr.teamMembers}>{team.members.length} players</Text>
                  </View>
                  {(team.wins + team.losses + team.draws) > 0 && (
                    <Text style={scr.teamRecord}>{team.wins}W {team.draws}D {team.losses}L</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── SCHEDULE ── */}
        {tab === 'Schedule' && (
          <View style={scr.section}>
            {loadingMatches ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : matches.length === 0 ? (
              <View style={scr.empty}><Text style={scr.emptyText}>No matches scheduled yet.</Text></View>
            ) : (
              matches.map((m) => <ScoreCard key={m.id} match={m} />)
            )}
          </View>
        )}

        {/* ── STANDINGS ── */}
        {tab === 'Standings' && (
          <View style={scr.section}>
            {['KNOCKOUT'].includes(tournament.format) ? (
              <View style={scr.card}>
                <Text style={scr.cardTitle}>Bracket</Text>
                <Text style={scr.desc}>
                  Knockout bracket view is available once the tournament begins and matches are played.
                  Track progress in the Schedule tab.
                </Text>
              </View>
            ) : (
              <StandingsTable tournamentId={Number(id)} />
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Register button */}
      {canRegister && (
        <View style={scr.footer}>
          <TouchableOpacity
            style={scr.registerBtn}
            onPress={() => router.push({ pathname: '/sports/create-team', params: { tournamentId: id } })}
            activeOpacity={0.85}
          >
            <Text style={scr.registerBtnText}>Register Your Team</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:           { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  headerTitle:    { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1 },
  registeredBadge:{ backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  registeredText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  hero:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#EEF2FF', borderBottomWidth: 1, borderBottomColor: '#C7D2FE' },
  heroEmoji:      { fontSize: 40, flexShrink: 0 },
  heroInfo:       { flex: 1, gap: 2 },
  heroName:       { fontSize: 18, fontWeight: '800', color: COLORS.text },
  heroMeta:       { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  heroOrg:        { fontSize: 12, color: COLORS.textMuted },
  tabs:           { paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:            { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabActive:      { backgroundColor: COLORS.primary },
  tabText:        { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive:  { color: '#fff', fontWeight: '700' },
  body:           { padding: 16 },
  section:        { gap: 10 },
  card:           { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTitle:      { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  desc:           { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel:    { fontSize: 13, color: COLORS.textMuted },
  detailValue:    { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'right' },
  teamCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  teamCardMine:   { borderColor: COLORS.primary, backgroundColor: '#F5F3FF' },
  teamEmoji:      { fontSize: 28 },
  teamInfo:       { flex: 1, gap: 2 },
  teamNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamName:       { fontSize: 15, fontWeight: '700', color: COLORS.text },
  winnerBadge:    { fontSize: 12, color: COLORS.warning },
  myBadge:        { fontSize: 10, fontWeight: '700', color: COLORS.primary, backgroundColor: '#EEF2FF', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  teamCaptain:    { fontSize: 12, color: COLORS.textMuted },
  teamMembers:    { fontSize: 12, color: COLORS.textMuted },
  teamRecord:     { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  empty:          { alignItems: 'center', padding: 40 },
  emptyText:      { color: COLORS.textMuted, fontSize: 15 },
  footer:         { padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  registerBtn:    { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  registerBtnText:{ color: '#fff', fontWeight: '800', fontSize: 16 },
});
