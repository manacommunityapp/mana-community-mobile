import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarType } from '@/services/calendarService';
import { CALENDAR_CONFIG, CALENDAR_TYPES } from '@/constants/calendarConfig';

interface Props {
  activeCalendars: CalendarType[];
  onToggle: (c: CalendarType) => void;
}

export function CalendarTypeFilter({ activeCalendars, onToggle }: Props) {
  const allActive = activeCalendars.length === 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={[styles.chip, allActive && styles.chipAll]}
        onPress={() => {
          if (!allActive) {
            CALENDAR_TYPES.forEach(t => {
              if (activeCalendars.includes(t)) onToggle(t);
            });
          }
        }}
      >
        <Ionicons name="calendar-outline" size={12} color={allActive ? '#fff' : '#374151'} />
        <Text style={[styles.chipText, allActive && styles.chipTextActive]}>All</Text>
      </TouchableOpacity>

      {CALENDAR_TYPES.map(type => {
        const cfg = CALENDAR_CONFIG[type];
        const active = activeCalendars.includes(type);
        return (
          <TouchableOpacity
            key={type}
            style={[styles.chip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
            onPress={() => onToggle(type)}
          >
            <Ionicons name={cfg.icon as any} size={12} color={active ? '#fff' : cfg.color} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{cfg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  chipAll: {
    backgroundColor: '#374151',
    borderColor: '#374151',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
  },
});
