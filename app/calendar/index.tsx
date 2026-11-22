import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendar } from '@/hooks/useCalendar';
import { calendarService, CalendarEventDto } from '@/services/calendarService';
import { CalendarTypeFilter } from '@/components/calendar/CalendarTypeFilter';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DayAgendaList } from '@/components/calendar/DayAgendaList';
import { EventDetailSheet } from '@/components/calendar/EventDetailSheet';
import { CreateEventSheet } from '@/components/calendar/CreateEventSheet';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  const {
    viewDate, setViewDate,
    activeCalendars, toggleCalendar,
    events, eventsForDate,
    loading, error, reload,
  } = useCalendar();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDto | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | undefined>(undefined);

  const prevMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventPress = (event: CalendarEventDto) => {
    setSelectedEvent(event);
  };

  const handleReminderChange = async (
    eventSource: string, sourceId: string,
    minutesBefore: number, eventStartTime: string
  ) => {
    if (minutesBefore === -1) {
      await calendarService.removeReminder(eventSource, sourceId);
    } else {
      await calendarService.setReminder(eventSource, sourceId, minutesBefore, eventStartTime);
    }
    reload();
    setSelectedEvent(null);
  };

  const handleDelete = async (id: string) => {
    await calendarService.deletePersonal(id);
    setSelectedEvent(null);
    reload();
  };

  const handleEdit = (event: CalendarEventDto) => {
    setEditingEvent(event);
    setShowCreate(true);
  };

  const handleCreated = (event: CalendarEventDto) => {
    setShowCreate(false);
    setEditingEvent(undefined);
    reload();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Month navigator */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={22} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => { setEditingEvent(undefined); setShowCreate(true); }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar type filter */}
      <CalendarTypeFilter activeCalendars={activeCalendars} onToggle={toggleCalendar} />

      {/* Loading / error */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}
      {error && !loading && (
        <TouchableOpacity style={styles.errorRow} onPress={reload}>
          <Ionicons name="refresh-outline" size={14} color="#DC2626" />
          <Text style={styles.errorText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Month grid */}
      <MonthGrid
        year={viewDate.getFullYear()}
        month={viewDate.getMonth()}
        events={events}
        selectedDate={selectedDate}
        onDayPress={handleDayPress}
      />

      {/* Day agenda (scrollable remainder) */}
      <View style={styles.agenda}>
        <DayAgendaList
          date={selectedDate}
          events={eventsForDate(selectedDate)}
          onEventPress={handleEventPress}
        />
      </View>

      {/* Event detail sheet */}
      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onReminderChange={handleReminderChange}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}

      {/* Create / edit sheet */}
      <CreateEventSheet
        visible={showCreate}
        onClose={() => { setShowCreate(false); setEditingEvent(undefined); }}
        onCreated={handleCreated}
        editingEvent={editingEvent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  navBtn: {
    padding: 2,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
  },
  loadingText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  agenda: {
    flex: 1,
  },
});
