import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS, getInitials } from '@/constants/config';
import type { SportsPlayerRankingResponse } from '@/types/api';

function medal(rank?: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function RatingBar({ rating }: { rating?: number }) {
  if (!rating) return null;
  const pct = Math.min(100, (rating / 3000) * 100);
  return (
    <View style={bar.wrap}>
      <View style={[bar.fill, { width: `${pct}%` as never }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  wrap: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, width: 60, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
});

function RankCard({ entry }: { entry: SportsPlayerRankingResponse }) {
  const name = entry.player.fullName || entry.player.email || `Player ${entry.player.id}`;
  const m = medal(entry.rank);
  return (
    <View style={[rc.card, entry.rank != null && entry.rank <= 3 && rc.cardTop]}>
      <View style={rc.left}>
        <View style={rc.rankWrap}>
          {m ? (
            <Text style={rc.medal}>{m}</Text>
          ) : (
            <Text style={rc.rankNum}>{entry.rank ?? '—'}</Text>
          )}
        </View>
        <View style={rc.avatar}>
          <Text style={rc.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={rc.info}>
          <Text style={rc.name} numberOfLines={1}>{name}</Text>
          {entry.player.flatNo && <Text style={rc.flat}>🏠 {entry.player.flatNo}</Text>}
          <View style={rc.meta}>
            {entry.sport && <Text style={rc.sport}>{entry.sport.name}</Text>}
            {entry.season && <Text style={rc.season}>{entry.season}</Text>}
          </View>
        </View>
      </View>
      <View style={rc.right}>
        {entry.rating != null && (
          <>
            <Text style={rc.ratingVal}>{entry.rating}</Text>
            <RatingBar rating={entry.rating} />
          </>
        )}
        {entry.source && <Text style={rc.source}>{entry.source}</Text>}
      </View>
    </View>
  );
}
const rc = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  cardTop:    { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  left:       { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  rankWrap:   { width: 32, alignItems: 'center' },
  rankNum:    { fontSize: 16, fontWeight: '700', color: COLORS.textMuted },
  medal:      { fontSize: 22 },
  avatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  info:       { flex: 1 },
  name:       { fontSize: 14, fontWeight: '700', color: COLORS.text },
  flat:       { fontSize: 11, color: COLORS.textMuted },
  meta:       { flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  sport:      { fontSize: 11, fontWeight: '600', color: COLORS.primary, backgroundColor: COLORS.primary + '15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  season:     { fontSize: 11, color: COLORS.textMuted },
  right:      { alignItems: 'flex-end', gap: 4 },
  ratingVal:  { fontSize: 20, fontWeight: '900', color: COLORS.text },
  source:     { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic' },
});

const SPORTS = ['All', 'CRICKET', 'FOOTBALL', 'BADMINTON', 'TENNIS', 'BASKETBALL', 'SWIMMING', 'ATHLETICS'];

export default function RankingsScreen() {
  const router = useRouter();
  const [sport, setSport] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['rankings', sport],
    queryFn:  () => sportsService.getRankings(sport !== 'All' ? { sport } : undefined),
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Community Rankings</Text>
      </View>

      {/* Sport filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {SPORTS.map((sp) => (
          <TouchableOpacity
            key={sp}
            style={[s.chip, sport === sp && s.chipActive]}
            onPress={() => setSport(sp)}
          >
            <Text style={[s.chipText, sport === sp && s.chipTextActive]}>
              {sp === 'All' ? 'All Sports' : sp.charAt(0) + sp.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      ) : (data?.length ?? 0) === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏆</Text>
          <Text style={s.emptyText}>No rankings available yet</Text>
          <Text style={s.emptySub}>Play matches to earn your ranking</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          <Text style={s.count}>{data!.length} players ranked</Text>
          {data!.map((entry) => (
            <RankCard key={entry.id} entry={entry} />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:          { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:         { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text, flex: 1 },
  filters:       { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:      { fontSize: 13, fontWeight: '600', color: COLORS.text },
  chipTextActive:{ color: '#fff' },
  list:          { padding: 16, gap: 10 },
  count:         { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyIcon:     { fontSize: 48 },
  emptyText:     { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub:      { fontSize: 13, color: COLORS.textMuted },
});
