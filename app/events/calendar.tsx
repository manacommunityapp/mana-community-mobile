import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import type { EventDto } from '@/types/api';

export default function EventCalendarScreen() {
  const router = useRouter();
  const { goBack } = useAppBack({ fallbackRoute: '/tabs/events' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: events = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: eventService.getAllEvents,
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      if (!e.startDate) return false;
      try {
        return isSameDay(parseISO(e.startDate), day);
      } catch {
        return false;
      }
    });
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Event Calendar</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Month Selector */}
      <View style={s.monthBar}>
        <TouchableOpacity
          onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          style={s.monthArrow}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.monthTitle}>{format(currentDate, 'MMMM yyyy')}</Text>
        <TouchableOpacity
          onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          style={s.monthArrow}
        >
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Days Ribbon */}
      <View style={s.daysRibbonWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={daysInMonth}
          keyExtractor={item => item.toISOString()}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
          renderItem={({ item }) => {
            const isSelected = isSameDay(item, selectedDate);
            const isCurrentDay = isToday(item);
            const dayEvents = getEventsForDay(item);
            const hasEvents = dayEvents.length > 0;

            return (
              <TouchableOpacity
                onPress={() => setSelectedDate(item)}
                style={[
                  s.dayCard,
                  isSelected && s.dayCardSelected,
                  isCurrentDay && !isSelected && s.dayCardToday,
                ]}
              >
                <Text style={[s.dayWeekday, isSelected && s.textLight]}>
                  {format(item, 'EEE')}
                </Text>
                <Text style={[s.dayNumber, isSelected && s.textLight]}>
                  {format(item, 'd')}
                </Text>
                {hasEvents ? (
                  <View style={[s.eventDot, isSelected ? { backgroundColor: '#fff' } : { backgroundColor: COLORS.primary }]} />
                ) : <View style={{ height: 5 }} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Selected Day Agenda */}
      <View style={s.agendaSection}>
        <Text style={s.agendaHeader}>
          Events for {format(selectedDate, 'EEE, MMM d, yyyy')}
        </Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : selectedDayEvents.length === 0 ? (
          <View style={s.emptyDayWrap}>
            <Text style={{ fontSize: 36 }}>🏖️</Text>
            <Text style={s.emptyDayTitle}>No community events scheduled</Text>
            <Text style={s.emptyDaySub}>Enjoy your relaxed day or propose an activity!</Text>
          </View>
        ) : (
          <FlatList
            data={selectedDayEvents}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.eventRowCard}
                onPress={() => router.push(`/events/${item.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={s.eventTimeBox}>
                  <Text style={s.eventTimeText}>{item.startTime || 'TBD'}</Text>
                  <Text style={s.eventTypeBadge}>{item.type || 'EVENT'}</Text>
                </View>
                <View style={s.eventRowInfo}>
                  <Text style={s.eventRowTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={s.eventRowVenue} numberOfLines={1}>
                    📍 {item.venue || item.location || 'Community Grounds'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  monthBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff',
  },
  monthTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  monthArrow: { padding: 6, borderRadius: 8, backgroundColor: '#F1F5F9' },
  daysRibbonWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },
  dayCard: {
    width: 52, height: 72, borderRadius: 14, backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  dayCardSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayCardToday: { borderColor: COLORS.primary, borderWidth: 1.5 },
  dayWeekday: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 2 },
  dayNumber: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  textLight: { color: '#fff' },
  eventDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 4 },
  agendaSection: { flex: 1, padding: 16 },
  agendaHeader: { fontSize: 14, fontWeight: '800', color: '#475569', marginBottom: 12 },
  emptyDayWrap: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyDayTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 10 },
  emptyDaySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  eventRowCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 14, borderRadius: RADIUS.md, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  eventTimeBox: { width: 80, alignItems: 'center', paddingRight: 10, borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  eventTimeText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  eventTypeBadge: { fontSize: 9, fontWeight: '700', color: COLORS.primary, marginTop: 3 },
  eventRowInfo: { flex: 1, paddingHorizontal: 12 },
  eventRowTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  eventRowVenue: { fontSize: 11, color: '#64748B', marginTop: 3 },
});
