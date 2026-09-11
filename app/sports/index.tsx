import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { ScoreCard } from '@/components/sports/ScoreCard';
import { TournamentCard } from '@/components/sports/TournamentCard';
import { COLORS } from '@/constants/config';

const QUICK_ACTIONS = [
  { emoji: '🏆', label: 'Tournaments',  route: '/sports/tournaments' },
  { emoji: '📅', label: 'Schedule',     route: '/sports/matches'     },
  { emoji: '👥', label: 'My Teams',     route: '/sports/my-teams'    },
  { emoji: '🔨', label: 'Live Auction', route: '/auction'            },
];

export default function SportsHubScreen() {
  const router = useRouter();

  const { data: liveMatches = [], isLoading: loadingLive, refetch, isRefetching } = useQuery({
    queryKey:       ['sports-live'],
    queryFn:        sportsService.getLiveMatches,
    refetchInterval: 15_000,
  });

  const { data: todayMatches = [], isLoading: loadingToday } = useQuery({
    queryKey: ['sports-today'],
    queryFn:  sportsService.getTodayMatches,
    refetchInterval: 60_000,
  });

  const { data: tournamentsPage, isLoading: loadingTournaments } = useQuery({
    queryKey: ['tournaments-hub'],
    queryFn:  () => sportsService.getTournaments(undefined, 'ONGOING'),
  });
  const ongoingTournaments = tournamentsPage?.content.slice(0, 3) ?? [];

  const { data: upcoming, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['tournaments-upcoming'],
    queryFn:  () => sportsService.getTournaments(undefined, 'REGISTRATION_OPEN'),
  });
  const openRegistration = upcoming?.content.slice(0, 2) ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Sports</Text>
        {liveMatches.length > 0 && (
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveCount}>{liveMatches.length} Live</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ── Live matches ── */}
        {liveMatches.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🔴 Live Now</Text>
            <View style={s.liveCards}>
              {liveMatches.map((m) => (
                <ScoreCard key={m.id} match={m} />
              ))}
            </View>
          </View>
        )}

        {/* ── Quick actions ── */}
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={s.quickCard}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <Text style={s.quickEmoji}>{a.emoji}</Text>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Today's schedule ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Today's Matches</Text>
            <TouchableOpacity onPress={() => router.push('/sports/matches')}>
              <Text style={s.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {loadingToday ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : todayMatches.length === 0 ? (
            <View style={s.emptySmall}>
              <Text style={s.emptySmallText}>No matches scheduled today.</Text>
            </View>
          ) : (
            <View style={s.cards}>
              {todayMatches.slice(0, 4).map((m) => (
                <ScoreCard key={m.id} match={m} compact />
              ))}
              {todayMatches.length > 4 && (
                <TouchableOpacity style={s.moreBtn} onPress={() => router.push('/sports/matches')}>
                  <Text style={s.moreBtnText}>+{todayMatches.length - 4} more matches</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Ongoing tournaments ── */}
        {(ongoingTournaments.length > 0 || loadingTournaments) && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>🏆 Active Tournaments</Text>
              <TouchableOpacity onPress={() => router.push('/sports/tournaments')}>
                <Text style={s.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {loadingTournaments ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <View style={s.cards}>
                {ongoingTournaments.map((t) => (
                  <TournamentCard key={t.id} tournament={t} compact />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Open registration ── */}
        {openRegistration.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📋 Registration Open</Text>
            <View style={s.cards}>
              {openRegistration.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: COLORS.text },
  livePill:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.error },
  liveCount:      { fontSize: 12, fontWeight: '700', color: COLORS.error },
  scroll:         { padding: 16, gap: 20 },
  section:        { gap: 10 },
  sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: COLORS.text },
  seeAll:         { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  liveCards:      { gap: 10 },
  cards:          { gap: 10 },
  quickGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard:      { width: '47%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border },
  quickEmoji:     { fontSize: 30 },
  quickLabel:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  emptySmall:     { backgroundColor: COLORS.surface, borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptySmallText: { color: COLORS.textMuted, fontSize: 14 },
  moreBtn:        { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12, alignItems: 'center' },
  moreBtnText:    { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
});
