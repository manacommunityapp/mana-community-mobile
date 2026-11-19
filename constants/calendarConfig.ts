import { CalendarType } from '@/services/calendarService';

export const CALENDAR_CONFIG: Record<CalendarType, { label: string; color: string; icon: string }> = {
  MY_CALENDAR:          { label: 'My Calendar',    color: '#2563EB', icon: 'calendar-outline' },
  FAMILY_CALENDAR:      { label: 'Family',         color: '#7C3AED', icon: 'people-outline' },
  COMMUNITY_CALENDAR:   { label: 'Community',      color: '#059669', icon: 'home-outline' },
  SPORTS_CALENDAR:      { label: 'Sports',         color: '#D97706', icon: 'trophy-outline' },
  PAYMENT_DUES:         { label: 'Payments',       color: '#DC2626', icon: 'card-outline' },
  APPOINTMENT_CALENDAR: { label: 'Appointments',   color: '#0891B2', icon: 'medkit-outline' },
  STAFF_SCHEDULE:       { label: 'Staff',          color: '#6B7280', icon: 'hammer-outline' },
  TRIP_EVENT_CALENDAR:  { label: 'Trips & Events', color: '#DB2777', icon: 'airplane-outline' },
};

export const CALENDAR_TYPES = Object.keys(CALENDAR_CONFIG) as CalendarType[];

export const EVENT_COLORS = [
  '#2563EB', '#7C3AED', '#059669', '#D97706',
  '#DC2626', '#0891B2', '#DB2777', '#6B7280',
];

export const RECURRENCE_OPTIONS = [
  { label: 'Does not repeat',   rrule: '' },
  { label: 'Daily',             rrule: 'FREQ=DAILY' },
  { label: 'Weekly',            rrule: 'FREQ=WEEKLY' },
  { label: 'Monthly',           rrule: 'FREQ=MONTHLY' },
  { label: 'Yearly',            rrule: 'FREQ=YEARLY' },
];
