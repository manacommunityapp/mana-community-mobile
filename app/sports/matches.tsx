import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { ScoreCard } from '@/components/sports/ScoreCard';
import { COLORS } from '@/constants/config';
import { format, addDays, isSameDay } from 'date-fns';

function buildDateOptions() {
  const today = new Date();
  return [-1, 0, 1, 2, 3, 4, 5].map((offset) => addDays(today, offset));
}

const STATUS_FILTERS = [
  { key: undefined,    label: 'All'       },
  { key: 'LIVE',       label: '🔴 Live'   },
  { key: 'SCHEDULED',  label: 'Upcoming'  },
  { key: 'COMPLETED',  label: 'Results'   },
];

export default function MatchScheduleScreen() {
  const router   = useRouter();
  const dates    = buildDateOptions();
  const today    = new Date();

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: matchesPage, isLoading, refetch, isRefetching } = useQuery({
    queryKey:       ['matches', dateStr, statusFilter],
    queryFn:        () => sportsService.getMatches(undefined, dateStr, statusFilter),
    refetchInterval: statusFilter === 'LIVE' ? 15_000 : false,
  });

  const matches = matchesPage?.content ?? [];
  const total   = matchesPage?.totalElements ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Match Schedule</Text>
        {total > 0 && <Text style={s.count}>{total} matches</Text>}
      </View>

      {/* Date selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dates} style={s.datesWrap}>
        {dates.map((d) => {
          const active  = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          return (
            <TouchableOpacity
              key={d.toISOString()}
              style={[s.dateChip, active && s.dateChipActive]}
              onPress={() => setSelectedDate(d)}
            >
              <Text style={[s.dateDayLabel, active && s.dateDayLabelActive]}>
                {isToday ? 'Today' : format(d, 'EEE')}
              </Text>
              <Text style={[s.dateDayNum, active && s.dateDayNumActive]}>
                {format(d, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} style={s.filtersWrap}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.key)}
            style={[s.filterChip, statusFilter === f.key && s.filterChipActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[s.filterText, statusFilter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 12, marginVertical: 5 }}>
              <ScoreCard match={item} />
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📅</Text>
              <Text style={s.emptyTitle}>No matches on {format(selectedDate, 'dd MMM')}</Text>
              <Text style={s.emptyText}>
                {isSameDay(selectedDate, today) ? 'Try another day or check live scores.' : ''}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:               { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:              { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  count:              { fontSize: 13, color: COLORS.textMuted },
  datesWrap:          { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dates:              { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  dateChip:           { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border, minWidth: 56 },
  dateChipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateDayLabel:       { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  dateDayLabelActive: { color: 'rgba(255,255,255,0.8)' },
  dateDayNum:         { fontSize: 18, fontWeight: '800', color: COLORS.text },
  dateDayNumActive:   { color: '#fff' },
  filtersWrap:        { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filters:            { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  filterChipActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:         { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  filterTextActive:   { color: '#fff', fontWeight: '700' },
  empty:              { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji:         { fontSize: 48 },
  emptyTitle:         { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptyText:          { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});
