import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '@/constants/config';
import type { AttendanceRecord, AttendanceStatus } from '@/types/hrm';

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  onDayPress?: (record: AttendanceRecord) => void;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: COLORS.success,
  ABSENT: COLORS.error,
  HALF_DAY: COLORS.warning,
  ON_LEAVE: '#3B82F6',
  HOLIDAY: '#8B5CF6',
  WEEK_OFF: '#94A3B8',
  NOT_MARKED: '#CBD5E1',
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function AttendanceCalendar({
  records,
  month,
  year,
  onMonthChange,
  onDayPress,
}: AttendanceCalendarProps) {
  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach(r => recordMap.set(r.attendanceDate, r));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (month === 0) onMonthChange(11, year - 1);
    else onMonthChange(month - 1, year);
  };
  const nextMonth = () => {
    if (month === 11) onMonthChange(0, year + 1);
    else onMonthChange(month + 1, year);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={s.dayHeaders}>
        {DAY_HEADERS.map(d => (
          <Text key={d} style={s.dayHeader}>{d}</Text>
        ))}
      </View>

      <View style={s.grid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`e-${idx}`} style={s.cell} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = recordMap.get(dateStr);
          const dotColor = record ? STATUS_COLORS[record.attendanceStatus] : undefined;
          const isToday = (() => {
            const t = new Date();
            return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
          })();

          return (
            <TouchableOpacity
              key={day}
              style={[s.cell, isToday && s.todayCell]}
              onPress={() => record && onDayPress?.(record)}
              activeOpacity={record ? 0.7 : 1}
            >
              <Text style={[s.dayText, isToday && s.todayText]}>{day}</Text>
              {dotColor && <View style={[s.dot, { backgroundColor: dotColor }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.legend}>
        {(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY'] as AttendanceStatus[]).map(status => (
          <View key={status} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: STATUS_COLORS[status] }]} />
            <Text style={s.legendLabel}>{status.replace('_', ' ')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: FONTS.displaySemi,
    color: COLORS.text,
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  todayCell: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
  },
  dayText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  todayText: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
});
