import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { sportsService } from '@/services/sportsService';
import { BadgeCard } from '@/components/sports/BadgeCard';
import { COLORS, SHADOWS, RADIUS, getInitials } from '@/constants/config';
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>Leaderboard</Text>
          <Text style={s.subTitle}>Community Rankings</Text>
        </View>
        <TouchableOpacity
          style={s.headerActionBtn}
          onPress={() => router.push('/sports/matches')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={s.headerActionBtnText}>Fixtures</Text>
        </TouchableOpacity>
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
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="trophy-outline" size={40} color={COLORS.primary} />
              </View>
              <Text style={s.emptyTitle}>No Rankings Recorded Yet</Text>
              <Text style={s.emptySub}>
                Tournament scores and match victories will automatically populate rankings here.
              </Text>
              <TouchableOpacity
                style={s.emptyActionBtn}
                onPress={() => router.push('/sports/matches')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={15} color="#fff" />
                <Text style={s.emptyActionBtnText}>Browse Matches</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: entry }) => {
            const eName = entry.name || entry.playerName || 'Player';
            const badgeObj: any = typeof entry.topBadge === 'string'
              ? { id: entry.topBadge, title: entry.topBadge, tier: 'rare', description: '', icon: 'medal' }
              : entry.topBadge;

            return (
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
                  <Text style={s.avatarText}>{getInitials(eName)}</Text>
                </View>

                {/* Info */}
                <View style={s.entryInfo}>
                  <View style={s.nameRow}>
                    <Text style={[s.entryName, entry.isCurrentUser && s.entryNameMe]} numberOfLines={1}>
                      {eName}
                      {entry.isCurrentUser ? ' (You)' : ''}
                    </Text>
                    {badgeObj && <BadgeCard badge={badgeObj} size="sm" />}
                  </View>
                  {(entry.flatNo || entry.flatNumber) && <Text style={s.flat}>🏠 {entry.flatNo || entry.flatNumber}</Text>}
                </View>

                {/* Value */}
                <Text style={[s.value, entry.rank === 1 && s.valueFirst]}>
                  {entry.displayValue ?? String(entry.score ?? '')}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12, ...SHADOWS.sm },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerCenter:    { flex: 1 },
  title:           { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  subTitle:        { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  headerActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#EEF2FF' },
  headerActionBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
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
  empty:           { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 10 },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:      { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub:        { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  emptyActionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.full, marginTop: 8 },
  emptyActionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
