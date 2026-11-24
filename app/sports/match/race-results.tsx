import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS } from '@/constants/config';
import type { SportsRaceResultResponse } from '@/types/api';

function medal(rank?: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function StatusBadge({ status }: { status?: string }) {
  const color =
    status === 'DNF' ? '#EF4444' :
    status === 'DNS' ? '#6B7280' :
    status === 'DQ'  ? '#F59E0B' :
    '#16a34a';
  const label = status || 'FIN';
  return (
    <View style={[rb.badge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <Text style={[rb.badgeText, { color }]}>{label}</Text>
    </View>
  );
}
const rb = StyleSheet.create({
  badge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

function ResultRow({ result, index }: { result: SportsRaceResultResponse; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const m = medal(result.overallRank);
  return (
    <TouchableOpacity
      style={[rr.row, index % 2 === 0 && rr.rowAlt]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={rr.main}>
        <View style={rr.rank}>
          {m ? (
            <Text style={rr.medal}>{m}</Text>
          ) : (
            <Text style={rr.rankNum}>{result.overallRank ?? '—'}</Text>
          )}
        </View>
        <View style={rr.info}>
          <Text style={rr.name} numberOfLines={1}>{result.playerName || result.teamName || `Lane ${result.laneNumber}`}</Text>
          {result.heatNumber != null && (
            <Text style={rr.sub}>Heat {result.heatNumber}  ·  Lane {result.laneNumber ?? '—'}</Text>
          )}
        </View>
        <View style={rr.right}>
          <Text style={rr.time}>{result.formattedTime ?? '—'}</Text>
          {result.isPersonalBest && <Text style={rr.pb}>PB</Text>}
          <StatusBadge status={result.raceStatus} />
        </View>
      </View>
      {expanded && result.splitTimes && result.splitTimes.length > 0 && (
        <View style={rr.splits}>
          {result.splitTimes.map((t, i) => (
            <View key={i} style={rr.split}>
              <Text style={rr.splitLabel}>Split {i + 1}</Text>
              <Text style={rr.splitTime}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
const rr = StyleSheet.create({
  row:       { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowAlt:    { backgroundColor: '#F9FAFB' },
  main:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank:      { width: 32, alignItems: 'center' },
  rankNum:   { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
  medal:     { fontSize: 20 },
  info:      { flex: 1 },
  name:      { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sub:       { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  right:     { alignItems: 'flex-end', gap: 3 },
  time:      { fontSize: 15, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'] },
  pb:        { fontSize: 9, fontWeight: '900', color: '#7C3AED', backgroundColor: '#EDE9FE', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  splits:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8, paddingLeft: 42 },
  split:     { backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  splitLabel:{ fontSize: 10, color: COLORS.textMuted },
  splitTime: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});

export default function RaceResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const matchId = Number(id);

  const [activeHeat, setActiveHeat] = useState<number | null>(null);

  const { data: allResults, isLoading } = useQuery({
    queryKey: ['race-results', matchId],
    queryFn:  () => sportsService.getRaceResults(matchId),
  });

  const heats = [...new Set((allResults || []).map((r) => r.heatNumber).filter((h): h is number => h != null))].sort((a, b) => a - b);

  const { data: heatResults, isLoading: heatLoading } = useQuery({
    queryKey: ['race-heat', matchId, activeHeat],
    queryFn:  () => sportsService.getRaceHeat(matchId, activeHeat!),
    enabled:  activeHeat != null,
  });

  const rows = activeHeat != null ? (heatResults ?? []) : (allResults ?? []);
  const loading = isLoading || (activeHeat != null && heatLoading);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Race Results</Text>
      </View>

      {/* Heat filter */}
      {heats.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.heats}
        >
          <TouchableOpacity
            style={[s.chip, activeHeat == null && s.chipActive]}
            onPress={() => setActiveHeat(null)}
          >
            <Text style={[s.chipText, activeHeat == null && s.chipTextActive]}>Overall</Text>
          </TouchableOpacity>
          {heats.map((h) => (
            <TouchableOpacity
              key={h}
              style={[s.chip, activeHeat === h && s.chipActive]}
              onPress={() => setActiveHeat(h)}
            >
              <Text style={[s.chipText, activeHeat === h && s.chipTextActive]}>Heat {h}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏁</Text>
          <Text style={s.emptyText}>No results yet</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header row */}
          <View style={s.tableHeader}>
            <Text style={[s.th, { width: 32 }]}>#</Text>
            <Text style={[s.th, { flex: 1 }]}>Athlete</Text>
            <Text style={s.th}>Time</Text>
          </View>
          {rows.map((r, i) => (
            <ResultRow key={r.id} result={r} index={i} />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:        { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:       { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text, flex: 1 },
  heats:       { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:    { fontSize: 13, fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: '#fff' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  th:          { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon:   { fontSize: 40 },
  emptyText:   { fontSize: 15, color: COLORS.textMuted },
});
