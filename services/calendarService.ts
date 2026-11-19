import { apiClient } from './apiClient';

export type CalendarType =
  | 'MY_CALENDAR'
  | 'FAMILY_CALENDAR'
  | 'COMMUNITY_CALENDAR'
  | 'SPORTS_CALENDAR'
  | 'PAYMENT_DUES'
  | 'APPOINTMENT_CALENDAR'
  | 'STAFF_SCHEDULE'
  | 'TRIP_EVENT_CALENDAR';

export interface CalendarEventDto {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  timezone: string;
  calendarType: CalendarType;
  eventSource: string;
  sourceId: string;
  color: string;
  isCancelled: boolean;
  hasReminder: boolean;
  deepLinkType: string;
  deepLinkId: string;
  metadata?: Record<string, unknown>;
}

export interface PersonalEventRequest {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  timezone?: string;
  calendarType: CalendarType;
  rrule?: string;
  color?: string;
}

function deviceTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
}

export const calendarService = {
  getEvents: async (from: string, to: string, calendars?: CalendarType[]): Promise<CalendarEventDto[]> => {
    const params: Record<string, string> = { from, to, tz: deviceTz() };
    if (calendars?.length) params.calendars = calendars.join(',');
    const res = await apiClient.get<CalendarEventDto[]>('/calendar/events', { params });
    return (res.data as any)?.data ?? res.data;
  },

  createPersonal: async (req: PersonalEventRequest): Promise<CalendarEventDto> => {
    const res = await apiClient.post<CalendarEventDto>('/calendar/personal', req);
    return (res.data as any)?.data ?? res.data;
  },

  updatePersonal: async (id: string | number, req: PersonalEventRequest): Promise<CalendarEventDto> => {
    const res = await apiClient.put<CalendarEventDto>(`/calendar/personal/${id}`, req);
    return (res.data as any)?.data ?? res.data;
  },

  deletePersonal: (id: string | number): Promise<void> =>
    apiClient.delete(`/calendar/personal/${id}`).then(() => {}),

  setReminder: (eventSource: string, sourceId: string, minutesBefore: number, eventStartTime: string): Promise<void> =>
    apiClient.post('/calendar/reminders', { eventSource, sourceId, minutesBefore, eventStartTime }).then(() => {}),

  removeReminder: (eventSource: string, sourceId: string): Promise<void> =>
    apiClient.delete('/calendar/reminders', { params: { eventSource, sourceId } }).then(() => {}),
};
