import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { TournamentCard, SPORT_EMOJI } from '@/components/sports/TournamentCard';
import { COLORS } from '@/constants/config';
import type { SportType } from '@/types/api';

const SPORTS: { key: SportType | 'ALL'; label: string }[] = [
  { key: 'ALL',          label: 'All'           },
  { key: 'CRICKET',      label: '🏏 Cricket'    },
  { key: 'FOOTBALL',     label: '⚽ Football'   },
  { key: 'BADMINTON',    label: '🏸 Badminton'  },
  { key: 'TABLE_TENNIS', label: '🏓 Table Tennis'},
  { key: 'BASKETBALL',   label: '🏀 Basketball' },
  { key: 'VOLLEYBALL',   label: '🏐 Volleyball' },
  { key: 'CHESS',        label: '♟️ Chess'       },
  { key: 'CARROM',       label: '🎯 Carrom'     },
];

const STATUS_TABS = [
  { key: undefined,             label: 'All'        },
  { key: 'REGISTRATION_OPEN',   label: 'Open Reg'   },
  { key: 'ONGOING',             label: 'Live'       },
  { key: 'UPCOMING',            label: 'Upcoming'   },
  { key: 'COMPLETED',           label: 'Ended'      },
];

export default function TournamentsScreen() {
  const router = useRouter();
  const [sport,  setSport]  = useState<SportType | 'ALL'>('ALL');
  const [status, setStatus] = useState<string | undefined>(undefined);

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey:        ['tournaments', sport, status],
    queryFn:         ({ pageParam = 0 }) =>
      sportsService.getTournaments(sport === 'ALL' ? undefined : sport, status, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const tournaments = data?.pages.flatMap((p) => p.content) ?? [];
  const total       = data?.pages[0]?.totalElements ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Tournaments</Text>
        <Text style={s.count}>{total} total</Text>
      </View>

      {/* Sport filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsWrap}>
        {SPORTS.map((sp) => (
          <TouchableOpacity
            key={sp.key}
            style={[s.chip, sport === sp.key && s.chipActive]}
            onPress={() => setSport(sp.key)}
          >
            <Text style={[s.chipText, sport === sp.key && s.chipTextActive]}>{sp.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statusChips} style={s.statusWrap}>
        {STATUS_TABS.map((t) => (
          <TouchableOpacity
            key={String(t.key)}
            style={[s.statusChip, status === t.key && s.statusChipActive]}
            onPress={() => setStatus(t.key)}
          >
            <Text style={[s.statusText, status === t.key && s.statusTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 12, marginVertical: 5 }}>
              <TournamentCard tournament={item} />
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🏆</Text>
              <Text style={s.emptyText}>No tournaments found.</Text>
            </View>
          }
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
  count:           { fontSize: 13, color: COLORS.textMuted },
  chipsWrap:       { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chips:           { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  chipActive:      { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  chipText:        { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive:  { color: COLORS.primary, fontWeight: '700' },
  statusWrap:      { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statusChips:     { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  statusChip:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F3F4F6' },
  statusChipActive:{ backgroundColor: COLORS.primary },
  statusText:      { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  statusTextActive:{ color: '#fff', fontWeight: '700' },
  empty:           { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji:      { fontSize: 48 },
  emptyText:       { fontSize: 15, color: COLORS.textMuted },
});
