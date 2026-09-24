import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { ScoreCard } from '@/components/sports/ScoreCard';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { format, addDays, isSameDay, isToday as checkIsToday } from 'date-fns';
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

function buildDateOptions() {
  const today = new Date();
  return [-2, -1, 0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(today, offset));
}

const STATUS_FILTERS = [
  { key: undefined,    label: 'All',       icon: 'list' as const },
  { key: 'LIVE',       label: 'Live',      icon: 'radio' as const },
  { key: 'SCHEDULED',  label: 'Upcoming',  icon: 'calendar' as const },
  { key: 'COMPLETED',  label: 'Results',   icon: 'checkmark-circle' as const },
];

export default function MatchScheduleScreen() {
  const router   = useRouter();
  const params   = useLocalSearchParams<{ sport?: string }>();
  const dates    = buildDateOptions();
  const today    = new Date();

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [sportFilter,  setSportFilter]  = useState<SportType | 'ALL'>((params.sport as SportType) || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (params.sport) {
      setSportFilter(params.sport as SportType);
    }
  }, [params.sport]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: matchesPage, isLoading, refetch, isRefetching } = useQuery({
    queryKey:       ['matches', dateStr, statusFilter, sportFilter],
    queryFn:        () => sportsService.getMatches(sportFilter === 'ALL' ? undefined : (sportFilter as any), dateStr, statusFilter),
    refetchInterval: statusFilter === 'LIVE' ? 15_000 : false,
  });

  const matches = matchesPage?.content ?? [];
  const total   = matchesPage?.totalElements ?? 0;
  const liveCount = matches.filter(m => m.status === 'LIVE').length;

  const isSelectedToday = checkIsToday(selectedDate);
  const currentSport = SPORTS_LIST.find(s => s.key === sportFilter);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>
            {sportFilter !== 'ALL' ? `${currentSport?.emoji} ${currentSport?.label}` : 'Match Schedule'}
          </Text>
          <Text style={s.subTitle}>
            {isSelectedToday ? `Today · ${format(selectedDate, 'MMMM d')}` : format(selectedDate, 'EEEE, MMMM d')}
          </Text>
        </View>
        {liveCount > 0 && (
          <View style={s.liveHeaderPill}>
            <View style={s.liveHeaderDot} />
            <Text style={s.liveHeaderText}>{liveCount} Live</Text>
          </View>
        )}
      </View>

      {/* ── Sport Selector Chips ─────────────────────────────────── */}
      <View style={s.sportsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sportsScroll}
        >
          {SPORTS_LIST.map((sp) => {
            const active = sportFilter === sp.key;
            return (
              <TouchableOpacity
                key={sp.key}
                style={[s.sportChip, active && s.sportChipActive]}
                onPress={() => setSportFilter(sp.key)}
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

      {/* ── Interactive Date Selector Strip ───────────────────────── */}
      <View style={s.datesWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.datesScroll}
        >
          {dates.map((d) => {
            const active   = isSameDay(d, selectedDate);
            const isTodayDate = isSameDay(d, today);

            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[s.dateCard, active && s.dateCardActive, isTodayDate && !active && s.dateCardToday]}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.8}
              >
                {isTodayDate && (
                  <View style={[s.todayBadge, active && s.todayBadgeActive]}>
                    <Text style={[s.todayBadgeText, active && s.todayBadgeTextActive]}>TODAY</Text>
                  </View>
                )}
                <Text style={[s.dateDayName, active && s.dateDayNameActive]}>
                  {format(d, 'EEE')}
                </Text>
                <Text style={[s.dateDayNumber, active && s.dateDayNumberActive]}>
                  {format(d, 'd')}
                </Text>
                <Text style={[s.dateMonth, active && s.dateMonthActive]}>
                  {format(d, 'MMM')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Status Segment Filter ──────────────────────────────────── */}
      <View style={s.statusSection}>
        <View style={s.statusSegment}>
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={String(f.key)}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.75}
              >
                {f.key === 'LIVE' && <View style={s.statusLiveDot} />}
                <Text style={[s.segmentText, active && s.segmentTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Match Feed ────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={s.loaderContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loaderText}>Loading fixtures...</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <View style={s.cardWrapper}>
              <ScoreCard match={item} />
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
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={38} color={COLORS.primary} />
              </View>
              <Text style={s.emptyTitle}>No matches found</Text>
              <Text style={s.emptySubtitle}>
                There are no matches scheduled on {format(selectedDate, 'MMM d, yyyy')}{sportFilter !== 'ALL' ? ` for ${currentSport?.label}` : ''}.
              </Text>
              <View style={s.emptyActions}>
                {!isSelectedToday && (
                  <TouchableOpacity
                    style={s.emptyActionBtn}
                    onPress={() => setSelectedDate(today)}
                  >
                    <Ionicons name="today-outline" size={15} color="#fff" />
                    <Text style={s.emptyActionBtnText}>Go to Today</Text>
                  </TouchableOpacity>
                )}
                {sportFilter !== 'ALL' && (
                  <TouchableOpacity
                    style={s.emptySecondaryBtn}
                    onPress={() => setSportFilter('ALL')}
                  >
                    <Text style={s.emptySecondaryBtnText}>View All Sports</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  liveHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  liveHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.error,
  },
  liveHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.error,
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

  // ── Interactive Date Selector ────────────────────────────────────
  datesWrap: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datesScroll: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  dateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 62,
    gap: 1,
  },
  dateCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  dateCardToday: {
    borderColor: COLORS.primaryMid,
    backgroundColor: COLORS.primaryLight,
  },
  todayBadge: {
    backgroundColor: COLORS.primaryMid,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: 2,
  },
  todayBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  todayBadgeTextActive: {
    color: '#fff',
  },
  dateDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  dateDayNameActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  dateDayNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  dateDayNumberActive: {
    color: '#fff',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  dateMonthActive: {
    color: 'rgba(255,255,255,0.8)',
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
    backgroundColor: COLORS.error,
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

  // ── Match List ───────────────────────────────────────────────────
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
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...SHADOWS.sm,
  },
  emptyActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptySecondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: COLORS.surface,
  },
  emptySecondaryBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
});

