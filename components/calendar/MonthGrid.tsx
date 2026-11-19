import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CalendarEventDto } from '@/services/calendarService';

const { width: SCREEN_W } = Dimensions.get('window');
const CELL_W = Math.floor((SCREEN_W - 32) / 7);
const CELL_H = 56;
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

interface Props {
  year: number;
  month: number;
  events: CalendarEventDto[];
  onDayPress: (date: Date) => void;
  selectedDate?: Date;
}

export function MonthGrid({ year, month, events, onDayPress, selectedDate }: Props) {
  const today = useMemo(() => new Date(), []);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startOffset = first.getDay();
    const result: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      result.push({ date: d, inMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      result.push({ date: new Date(year, month, d), inMonth: true });
    }
    const remaining = 7 - (result.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        result.push({ date: new Date(year, month + 1, d), inMonth: false });
      }
    }
    return result;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEventDto[]> = {};
    for (const e of events) {
      const key = e.startTime.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  const rows: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Day-of-week header */}
      <View style={styles.headerRow}>
        {DOW.map((d, i) => (
          <View key={i} style={[styles.headerCell, { width: CELL_W }]}>
            <Text style={[styles.headerText, i === 0 && styles.sunday, i === 6 && styles.saturday]}>{d}</Text>
          </View>
        ))}
      </View>
      {/* Grid rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map(({ date, inMonth }, ci) => {
            const key = fmt(date);
            const dayEvents = eventsByDate[key] ?? [];
            const isToday = isSameDay(date, today);
            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.cell,
                  { width: CELL_W, height: CELL_H },
                  isSelected && styles.cellSelected,
                ]}
                onPress={() => onDayPress(date)}
                activeOpacity={0.7}
              >
                <View style={[styles.dateCircle, isToday && styles.todayCircle]}>
                  <Text style={[
                    styles.dateText,
                    !inMonth && styles.dateTextDim,
                    isToday && styles.dateTextToday,
                  ]}>
                    {date.getDate()}
                  </Text>
                </View>
                {dayEvents.length > 0 && (
                  <View style={styles.dots}>
                    {dayEvents.slice(0, 3).map((e, di) => (
                      <View
                        key={di}
                        style={[styles.dot, { backgroundColor: e.color || '#4F46E5' }]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: 4,
    paddingTop: 4,
  },
  headerCell: {
    alignItems: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  sunday: { color: '#EF4444' },
  saturday: { color: '#3B82F6' },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderRadius: 8,
  },
  cellSelected: {
    backgroundColor: '#EEF2FF',
  },
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: '#4F46E5',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  dateTextDim: {
    color: '#D1D5DB',
  },
  dateTextToday: {
    color: '#fff',
    fontWeight: '800',
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
