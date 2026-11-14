import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS, getInitials } from '@/constants/config';
import type { SportsGenericLeaderboardEntry } from '@/types/api';

function medal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function RankRow({ entry }: { entry: SportsGenericLeaderboardEntry }) {
  const m = medal(entry.rank);
  const displayName = entry.playerName || entry.teamName || `Player ${entry.playerId}`;
  return (
    <View style={[row.wrap, entry.rank <= 3 && row.top3]}>
      <View style={row.rankCol}>
        {m ? (
          <Text style={row.medal}>{m}</Text>
        ) : (
          <Text style={row.rankNum}>{entry.rank}</Text>
        )}
      </View>
      <View style={row.avatar}>
        <Text style={row.avatarText}>{getInitials(displayName)}</Text>
      </View>
      <View style={row.info}>
        <Text style={row.name} numberOfLines={1}>{displayName}</Text>
        {entry.matchesPlayed != null && (
          <Text style={row.sub}>{entry.matchesPlayed} matches</Text>
        )}
      </View>
      <View style={row.scoreCol}>
        <Text style={row.score}>{entry.value}</Text>
        {entry.category ? <Text style={row.cat}>{entry.category}</Text> : null}
      </View>
    </View>
  );
}
const row = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  top3:     { backgroundColor: '#FEF9C3' },
  rankCol:  { width: 32, alignItems: 'center' },
  rankNum:  { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
  medal:    { fontSize: 20 },
  avatar:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText:{ fontSize: 13, fontWeight: '800', color: COLORS.primary },
  info:     { flex: 1 },
  name:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sub:      { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  scoreCol: { alignItems: 'flex-end' },
  score:    { fontSize: 20, fontWeight: '900', color: COLORS.text },
  cat:      { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
});

export default function TournamentLeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const configId = Number(id);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['leaderboard-categories', configId],
    queryFn:  () => sportsService.getLeaderboardCategories(configId),
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['generic-leaderboard', configId, activeCategory],
    queryFn:  () => sportsService.getGenericLeaderboard(configId, activeCategory ?? undefined),
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Leaderboard</Text>
      </View>

      {/* Category filter */}
      {(categories?.length ?? 0) > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.cats}
        >
          <TouchableOpacity
            style={[s.chip, activeCategory == null && s.chipActive]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[s.chipText, activeCategory == null && s.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories!.map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.chip, activeCategory === c && s.chipActive]}
              onPress={() => setActiveCategory(c)}
            >
              <Text style={[s.chipText, activeCategory === c && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      ) : (entries?.length ?? 0) === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏆</Text>
          <Text style={s.emptyText}>No rankings yet</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Podium for top 3 */}
          {entries!.slice(0, 3).length === 3 && (
            <View style={s.podium}>
              {/* 2nd */}
              <View style={[s.podiumItem, s.podiumSecond]}>
                <Text style={s.podiumMedal}>🥈</Text>
                <Text style={s.podiumName} numberOfLines={1}>{entries![1].playerName || entries![1].teamName || `#${entries![1].playerId}`}</Text>
                <Text style={s.podiumScore}>{entries![1].value}</Text>
              </View>
              {/* 1st */}
              <View style={[s.podiumItem, s.podiumFirst]}>
                <Text style={s.podiumMedal}>🥇</Text>
                <Text style={s.podiumName} numberOfLines={1}>{entries![0].playerName || entries![0].teamName || `#${entries![0].playerId}`}</Text>
                <Text style={s.podiumScore}>{entries![0].value}</Text>
              </View>
              {/* 3rd */}
              <View style={[s.podiumItem, s.podiumThird]}>
                <Text style={s.podiumMedal}>🥉</Text>
                <Text style={s.podiumName} numberOfLines={1}>{entries![2].playerName || entries![2].teamName || `#${entries![2].playerId}`}</Text>
                <Text style={s.podiumScore}>{entries![2].value}</Text>
              </View>
            </View>
          )}

          {/* Full table */}
          <View style={s.tableHeader}>
            <Text style={[s.th, { width: 32 }]}>#</Text>
            <Text style={[s.th, { flex: 1 }]}>Player</Text>
            <Text style={s.th}>Score</Text>
          </View>
          {entries!.map((e) => (
            <RankRow key={`${e.playerId}-${e.category}`} entry={e} />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:         { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:        { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text, flex: 1 },
  cats:         { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:     { fontSize: 13, fontWeight: '600', color: COLORS.text },
  chipTextActive:{ color: '#fff' },
  podium:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 20, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  podiumItem:   { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F9FAFB' },
  podiumFirst:  { backgroundColor: '#FEF9C3', paddingVertical: 16 },
  podiumSecond: { backgroundColor: '#F1F5F9' },
  podiumThird:  { backgroundColor: '#FFF7ED' },
  podiumMedal:  { fontSize: 24 },
  podiumName:   { fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  podiumScore:  { fontSize: 18, fontWeight: '900', color: COLORS.text },
  tableHeader:  { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  th:           { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon:    { fontSize: 40 },
  emptyText:    { fontSize: 15, color: COLORS.textMuted },
});
