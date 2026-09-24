import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { BadgeCard } from '@/components/sports/BadgeCard';
import { COLORS } from '@/constants/config';
import { SPORT_EMOJI } from '@/components/sports/TournamentCard';
import type { LeaderboardCategory, SportType } from '@/types/api';

const SPORTS_FILTER: { key: SportType | 'ALL'; label: string }[] = [
  { key: 'ALL',         label: 'Overall'   },
  { key: 'CRICKET',     label: '🏏 Cricket'  },
  { key: 'FOOTBALL',    label: '⚽ Football' },
  { key: 'BADMINTON',   label: '🏸 Badminton'},
  { key: 'TABLE_TENNIS',label: '🏓 TT'       },
  { key: 'BASKETBALL',  label: '🏀 Basketball'},
];

const CATEGORIES: { key: LeaderboardCategory; label: string; desc: string }[] = [
  { key: 'WINS',          label: 'Most Wins',       desc: 'Total match wins'          },
  { key: 'MATCHES_PLAYED',label: 'Most Active',     desc: 'Matches played'            },
  { key: 'TROPHIES',      label: 'Trophies',        desc: 'Tournament trophies'       },
  { key: 'RATING',        label: 'Top Rated',       desc: 'Peer rating by community'  },
  { key: 'RUNS',          label: 'Most Runs',       desc: 'Cricket only'              },
  { key: 'WICKETS',       label: 'Most Wickets',    desc: 'Cricket only'              },
  { key: 'GOALS',         label: 'Top Scorer',      desc: 'Football only'             },
];

const PERIODS = [
  { key: 'MONTH' as const,    label: 'This Month' },
  { key: 'SEASON' as const,   label: 'This Season'},
  { key: 'ALL_TIME' as const, label: 'All Time'   },
];

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const router  = useRouter();
  const [sport,    setSport]    = useState<SportType | 'ALL'>('ALL');
  const [category, setCategory] = useState<LeaderboardCategory>('WINS');
  const [period,   setPeriod]   = useState<'MONTH' | 'SEASON' | 'ALL_TIME'>('ALL_TIME');

  const { data: entries = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['leaderboard', sport, category, period],
    queryFn:  () => sportsService.getLeaderboard(sport, category, period),
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Leaderboard</Text>
      </View>

      {/* Period */}
      <View style={s.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[s.periodChip, period === p.key && s.periodChipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[s.periodText, period === p.key && s.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sport filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsWrap}>
        {SPORTS_FILTER.map((sp) => (
          <TouchableOpacity
            key={sp.key}
            style={[s.chip, sport === sp.key && s.chipActive]}
            onPress={() => setSport(sp.key)}
          >
            <Text style={[s.chipText, sport === sp.key && s.chipTextActive]}>{sp.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catChips} style={s.catWrap}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[s.catChip, category === c.key && s.catChipActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[s.catText, category === c.key && s.catTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category description */}
      <Text style={s.catDesc}>
        {CATEGORIES.find((c) => c.key === category)?.desc}
      </Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => String(e.userId)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🏆</Text>
              <Text style={s.emptyText}>No data yet. Play more matches!</Text>
            </View>
          }
          renderItem={({ item: entry }) => (
            <TouchableOpacity
              style={[s.entryRow, entry.isCurrentUser && s.entryRowMine]}
              onPress={() => router.push(`/sports/player/${entry.userId}`)}
              activeOpacity={0.85}
            >
              {/* Rank */}
              <View style={s.rankWrap}>
                {entry.rank <= 3
                  ? <Text style={s.rankMedal}>{MEDAL[entry.rank - 1]}</Text>
                  : <Text style={s.rankNum}>{entry.rank}</Text>
                }
              </View>

              {/* Avatar */}
              <View style={[s.avatar, entry.rank <= 3 && s.avatarTop]}>
                <Text style={s.avatarText}>{entry.name[0]}</Text>
              </View>

              {/* Info */}
              <View style={s.entryInfo}>
                <View style={s.nameRow}>
                  <Text style={[s.entryName, entry.isCurrentUser && s.entryNameMe]} numberOfLines={1}>
                    {entry.name}
                    {entry.isCurrentUser ? ' (You)' : ''}
                  </Text>
                  {entry.topBadge && <BadgeCard badge={entry.topBadge} size="sm" />}
                </View>
                {entry.flatNo && <Text style={s.flat}>🏠 {entry.flatNo}</Text>}
              </View>

              {/* Value */}
              <Text style={[s.value, entry.rank === 1 && s.valueFirst]}>
                {entry.displayValue}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:            { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:           { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  periodRow:       { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  periodChip:      { flex: 1, paddingVertical: 10, alignItems: 'center' },
  periodChipActive:{ borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  periodText:      { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  periodTextActive:{ color: COLORS.primary, fontWeight: '700' },
  chipsWrap:       { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chips:           { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  chipActive:      { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  chipText:        { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive:  { color: COLORS.primary, fontWeight: '700' },
  catWrap:         { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catChips:        { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  catChip:         { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F3F4F6' },
  catChipActive:   { backgroundColor: COLORS.primary },
  catText:         { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  catTextActive:   { color: '#fff', fontWeight: '700' },
  catDesc:         { fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 16, paddingVertical: 6 },
  entryRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  entryRowMine:    { backgroundColor: '#F5F3FF' },
  rankWrap:        { width: 32, alignItems: 'center' },
  rankMedal:       { fontSize: 22 },
  rankNum:         { fontSize: 16, fontWeight: '800', color: COLORS.textMuted },
  avatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarTop:       { backgroundColor: COLORS.primary },
  avatarText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  entryInfo:       { flex: 1, gap: 2 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryName:       { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  entryNameMe:     { color: COLORS.primary, fontWeight: '800' },
  flat:            { fontSize: 11, color: COLORS.textMuted },
  value:           { fontSize: 16, fontWeight: '800', color: COLORS.text },
  valueFirst:      { color: '#D97706', fontSize: 18 },
  empty:           { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji:      { fontSize: 48 },
  emptyText:       { fontSize: 15, color: COLORS.textMuted },
});
