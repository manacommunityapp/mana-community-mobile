import { useState, useEffect, useCallback, useRef } from 'react';
import { calendarService, CalendarEventDto, CalendarType } from '@/services/calendarService';

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useCalendar() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [activeCalendars, setActiveCalendars] = useState<CalendarType[]>([]);
  const [events, setEvents] = useState<CalendarEventDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(async (date: Date, cals: CalendarType[]) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    from.setDate(from.getDate() - 7);
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    to.setDate(to.getDate() + 7);
    try {
      const data = await calendarService.getEvents(fmt(from), fmt(to), cals.length ? cals : undefined);
      setEvents(data);
      setError(null);
    } catch (e: unknown) {
      if ((e as Error)?.name === 'CanceledError' || (e as Error)?.name === 'AbortError') return;
      setError((e as any)?.response?.data?.message ?? 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload(viewDate, activeCalendars);
  }, [viewDate.getFullYear(), viewDate.getMonth(), activeCalendars.join(',')]);

  const toggleCalendar = (c: CalendarType) =>
    setActiveCalendars(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const eventsForDate = (date: Date): CalendarEventDto[] => {
    const d = fmt(date);
    return events.filter(e => e.startTime.startsWith(d));
  };

  return {
    viewDate,
    setViewDate,
    activeCalendars,
    toggleCalendar,
    events,
    eventsForDate,
    loading,
    error,
    reload: () => reload(viewDate, activeCalendars),
  };
}
