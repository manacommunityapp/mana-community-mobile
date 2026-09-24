import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { TournamentCard, SPORT_EMOJI } from '@/components/sports/TournamentCard';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import type { SportType } from '@/types/api';

const SPORTS_LIST: { key: SportType | 'ALL'; label: string; emoji: string }[] = [
  { key: 'ALL',          label: 'All Sports',    emoji: '🏅' },
  { key: 'CRICKET',      label: 'Cricket',       emoji: '🏏' },
  { key: 'FOOTBALL',     label: 'Football',      emoji: '⚽' },
  { key: 'BADMINTON',    label: 'Badminton',     emoji: '🏸' },
  { key: 'TABLE_TENNIS', label: 'Table Tennis',  emoji: '🏓' },
  { key: 'BASKETBALL',   label: 'Basketball',    emoji: '🏀' },
  { key: 'VOLLEYBALL',   label: 'Volleyball',    emoji: '🏐' },
  { key: 'CHESS',        label: 'Chess',         emoji: '♟️' },
  { key: 'CARROM',       label: 'Carrom',        emoji: '🎯' },
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
  const params = useLocalSearchParams<{ sport?: string }>();
  const [sport,  setSport]  = useState<SportType | 'ALL'>((params.sport as SportType) || 'ALL');
  const [status, setStatus] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (params.sport) {
      setSport(params.sport as SportType);
    }
  }, [params.sport]);

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
  const currentSport = SPORTS_LIST.find(s => s.key === sport);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>
            {sport !== 'ALL' ? `${currentSport?.emoji} ${currentSport?.label}` : 'Tournaments'}
          </Text>
          <Text style={s.subTitle}>
            {total} {total === 1 ? 'tournament' : 'tournaments'} available
          </Text>
        </View>
        <TouchableOpacity
          style={s.headerCreateBtn}
          onPress={() => router.push('/sports/create-team')}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={16} color={COLORS.primary} />
          <Text style={s.headerCreateBtnText}>My Teams</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sport Selector Chips ─────────────────────────────────── */}
      <View style={s.sportsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sportsScroll}
        >
          {SPORTS_LIST.map((sp) => {
            const active = sport === sp.key;
            return (
              <TouchableOpacity
                key={sp.key}
                style={[s.sportChip, active && s.sportChipActive]}
                onPress={() => setSport(sp.key)}
                activeOpacity={0.75}
              >
                <Text style={s.sportEmoji}>{sp.emoji}</Text>
                <Text style={[s.sportLabel, active && s.sportLabelActive]}>
                  {sp.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Status Segment Filter ──────────────────────────────────── */}
      <View style={s.statusSection}>
        <View style={s.statusSegment}>
          {STATUS_TABS.map((t) => {
            const active = status === t.key;
            return (
              <TouchableOpacity
                key={String(t.key)}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
                onPress={() => setStatus(t.key)}
                activeOpacity={0.75}
              >
                {t.key === 'ONGOING' && <View style={s.statusLiveDot} />}
                <Text style={[s.segmentText, active && s.segmentTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Tournaments List ──────────────────────────────────────── */}
      {isLoading ? (
        <View style={s.loaderContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loaderText}>Loading tournaments...</Text>
        </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => (
            <View style={s.cardWrapper}>
              <TournamentCard tournament={item} />
            </View>
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} />
              : null
          }
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="trophy-outline" size={38} color={COLORS.primary} />
              </View>
              <Text style={s.emptyTitle}>No tournaments found</Text>
              <Text style={s.emptySubtitle}>
                There are no tournaments currently available{sport !== 'ALL' ? ` for ${currentSport?.label}` : ''}.
              </Text>
              {sport !== 'ALL' && (
                <TouchableOpacity
                  style={s.emptyActionBtn}
                  onPress={() => setSport('ALL')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="grid-outline" size={15} color="#fff" />
                  <Text style={s.emptyActionBtnText}>View All Sports</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Top Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  headerCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  headerCreateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ── Sport Selector Chips ─────────────────────────────────────────
  sportsWrap: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sportsScroll: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sportChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.sm,
  },
  sportEmoji: {
    fontSize: 14,
  },
  sportLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  sportLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // ── Status Segment Filter ────────────────────────────────────────
  statusSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusSegment: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  statusLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.warning,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── List Content ─────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 12,
  },
  cardWrapper: {
    marginBottom: 2,
  },

  // ── Loading & Empty States ───────────────────────────────────────
  loaderContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 8,
    ...SHADOWS.sm,
  },
  emptyActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

