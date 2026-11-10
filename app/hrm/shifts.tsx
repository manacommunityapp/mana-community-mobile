import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { HrEmployeeShift } from '@/types/hrm';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(offset: number): { from: string; to: string; dates: Date[] } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + offset * 7);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(dates[0]), to: fmt(dates[6]), dates };
}

function formatShortDate(d: Date): string {
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
}

export default function ShiftsScreen() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);

  const { from, to, dates } = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const { data: shifts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-my-shifts', from, to],
    queryFn: () => hrmService.getMyShifts(from, to),
  });

  const shiftMap = new Map<string, HrEmployeeShift>();
  (shifts ?? []).forEach((s: HrEmployeeShift) => shiftMap.set(s.shiftDate, s));

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="My Shifts" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      {/* Week Navigator */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.weekLabel}>
          {formatShortDate(dates[0])} – {formatShortDate(dates[6])}
        </Text>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>
        {weekOffset !== 0 && (
          <TouchableOpacity style={s.todayBtn} onPress={() => setWeekOffset(0)} activeOpacity={0.7}>
            <Text style={s.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={COLORS.primary} />}
        contentContainerStyle={s.content}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          dates.map(date => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const shift = shiftMap.get(dateStr);
            const isToday = dateStr === todayStr;
            const isPast = date < today && !isToday;

            return (
              <View key={dateStr} style={[s.dayCard, isToday && s.dayCardToday, isPast && s.dayCardPast]}>
                <View style={s.dayHeader}>
                  <Text style={[s.dayName, isToday && s.dayNameToday]}>
                    {DAY_NAMES[date.getDay()]}
                  </Text>
                  <Text style={[s.dayDate, isToday && s.dayDateToday]}>
                    {formatShortDate(date)}
                  </Text>
                  {isToday && (
                    <View style={s.todayBadge}>
                      <Text style={s.todayBadgeText}>TODAY</Text>
                    </View>
                  )}
                </View>
                {shift ? (
                  <View style={s.shiftInfo}>
                    <View style={s.shiftNameRow}>
                      <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                      <Text style={s.shiftName}>{shift.shiftName}</Text>
                    </View>
                    <Text style={s.shiftTime}>
                      {shift.startTime} – {shift.endTime}
                      {shift.breakMinutes > 0 && ` (${shift.breakMinutes}m break)`}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.noShift}>No shift assigned</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  weekLabel: {
    fontSize: 14,
    fontFamily: FONTS.displaySemi,
    color: COLORS.text,
    fontWeight: '600',
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.xs,
  },
  todayBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontWeight: '700',
  },

  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 14,
    marginTop: 10,
    ...SHADOWS.sm,
  },
  dayCardToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.card,
  },
  dayCardPast: { opacity: 0.6 },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dayName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
  },
  dayNameToday: { color: COLORS.primary },
  dayDate: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  dayDateToday: { color: COLORS.primary },
  todayBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  todayBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  shiftInfo: { marginTop: 4 },
  shiftNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shiftName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    fontWeight: '600',
  },
  shiftTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginLeft: 22,
  },
  noShift: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});
