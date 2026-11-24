import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEventDto } from '@/services/calendarService';
import { CALENDAR_CONFIG } from '@/constants/calendarConfig';

interface Props {
  date: Date;
  events: CalendarEventDto[];
  onEventPress: (event: CalendarEventDto) => void;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
}

function fmtHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function DayAgendaList({ date, events, onEventPress }: Props) {
  const calCfg = (e: CalendarEventDto) => CALENDAR_CONFIG[e.calendarType];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{fmtHeader(date)}</Text>
      {events.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={28} color="#D1D5DB" />
          <Text style={styles.emptyText}>Nothing scheduled</Text>
        </View>
      ) : (
        events.map(ev => {
          const cfg = calCfg(ev);
          return (
            <TouchableOpacity
              key={ev.id}
              style={[styles.card, ev.isCancelled && styles.cardCancelled]}
              onPress={() => onEventPress(ev)}
              activeOpacity={0.75}
            >
              <View style={[styles.leftBorder, { backgroundColor: ev.color || cfg?.color || '#4F46E5' }]} />
              <View style={styles.cardBody}>
                <View style={styles.topRow}>
                  <Text style={[styles.title, ev.isCancelled && styles.titleCancelled]} numberOfLines={1}>
                    {ev.title}
                  </Text>
                  {ev.isCancelled && (
                    <View style={styles.cancelledBadge}>
                      <Text style={styles.cancelledBadgeText}>Cancelled</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.timeText}>
                  {ev.allDay
                    ? 'All day'
                    : `${fmtTime(ev.startTime)} – ${fmtTime(ev.endTime)}`}
                </Text>
                {ev.location && (
                  <Text style={styles.location} numberOfLines={1}>
                    <Ionicons name="location-outline" size={11} color="#9CA3AF" /> {ev.location}
                  </Text>
                )}
              </View>
              {ev.hasReminder && (
                <Ionicons name="notifications-outline" size={14} color="#9CA3AF" style={styles.reminderIcon} />
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardCancelled: {
    opacity: 0.55,
  },
  leftBorder: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  titleCancelled: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  cancelledBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cancelledBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  reminderIcon: {
    alignSelf: 'center',
    marginRight: 10,
  },
});
