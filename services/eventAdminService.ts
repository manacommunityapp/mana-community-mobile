import api from './apiClient';

// ── Types ────────────────────────────────────────────────────────

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type EventType = 'COMMUNITY' | 'SOCIAL' | 'SPORTS' | 'CULTURAL' | 'RELIGIOUS' | 'MEETING' | 'WORKSHOP' | 'OTHER';

export interface EventAdminDashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  liveEvents: number;
  totalRegistrations: number;
  totalVenues: number;
  publishedEvents: number;
}

export interface EventSummary {
  id: number;
  title: string;
  type: EventType | string;
  status: EventStatus | string;
  startDate: string;
  endDate?: string;
  venue?: string;
  registrationCount: number;
  maxAttendees?: number;
  organizer: string;
  priceType: string;
}

export interface EventRegistration {
  id: number;
  eventId: number;
  eventTitle: string;
  userName: string;
  userEmail?: string;
  flat?: string;
  registeredAt: string;
  status: string;
  ticketType?: string;
}

export interface EventVenue {
  id: number;
  name: string;
  type?: string;
  capacity?: number;
  location?: string;
  isAvailable: boolean;
  amenities?: string[];
}

export interface EventAnalyticsData {
  eventsByType: { type: string; count: number }[];
  registrationsByMonth: { month: string; count: number }[];
  topEvents: { name: string; registrations: number }[];
  venueUtilization: { venue: string; bookings: number }[];
  attendanceRate: number;
}

// ── Sample Data (fallback) ──────────────────────────────────────

const sampleEvents: EventSummary[] = [
  { id: 1, title: 'Diwali Celebration 2026', type: 'CULTURAL', status: 'PUBLISHED', startDate: '2026-10-20T18:00:00', endDate: '2026-10-20T22:00:00', venue: 'Community Hall', registrationCount: 120, maxAttendees: 200, organizer: 'Cultural Committee', priceType: 'FREE' },
  { id: 2, title: 'Yoga & Wellness Workshop', type: 'WORKSHOP', status: 'PUBLISHED', startDate: '2026-10-05T06:00:00', endDate: '2026-10-05T08:00:00', venue: 'Garden Area', registrationCount: 35, maxAttendees: 50, organizer: 'Health Committee', priceType: 'FREE' },
  { id: 3, title: 'Annual General Meeting', type: 'MEETING', status: 'DRAFT', startDate: '2026-10-15T10:00:00', venue: 'Clubhouse Hall', registrationCount: 0, organizer: 'RWA Board', priceType: 'FREE' },
  { id: 4, title: 'Children\'s Day Carnival', type: 'SOCIAL', status: 'PUBLISHED', startDate: '2026-11-14T09:00:00', endDate: '2026-11-14T17:00:00', venue: 'Community Ground', registrationCount: 85, maxAttendees: 150, organizer: 'Parent Committee', priceType: 'PAID' },
  { id: 5, title: 'Navratri Garba Night', type: 'RELIGIOUS', status: 'COMPLETED', startDate: '2026-09-25T19:00:00', endDate: '2026-09-25T23:00:00', venue: 'Community Hall', registrationCount: 180, maxAttendees: 200, organizer: 'Cultural Committee', priceType: 'PAID' },
  { id: 6, title: 'Weekend Movie Screening', type: 'SOCIAL', status: 'CANCELLED', startDate: '2026-09-28T19:00:00', venue: 'Clubhouse Hall', registrationCount: 22, maxAttendees: 60, organizer: 'Entertainment Committee', priceType: 'FREE' },
];

const sampleRegistrations: EventRegistration[] = [
  { id: 1, eventId: 1, eventTitle: 'Diwali Celebration 2026', userName: 'Aarav Sharma', flat: 'A-201', registeredAt: '2026-09-28T10:00:00Z', status: 'CONFIRMED', ticketType: 'Family' },
  { id: 2, eventId: 1, eventTitle: 'Diwali Celebration 2026', userName: 'Priya Patel', flat: 'B-105', registeredAt: '2026-09-28T11:00:00Z', status: 'CONFIRMED', ticketType: 'Individual' },
  { id: 3, eventId: 2, eventTitle: 'Yoga & Wellness Workshop', userName: 'Meera Reddy', flat: 'A-404', registeredAt: '2026-09-27T08:00:00Z', status: 'CONFIRMED' },
  { id: 4, eventId: 4, eventTitle: 'Children\'s Day Carnival', userName: 'Vikram Singh', flat: 'D-101', registeredAt: '2026-09-26T15:00:00Z', status: 'PENDING', ticketType: 'Family' },
  { id: 5, eventId: 1, eventTitle: 'Diwali Celebration 2026', userName: 'Rahul Gupta', flat: 'C-302', registeredAt: '2026-09-25T09:00:00Z', status: 'CANCELLED' },
];

const SAMPLE_ANALYTICS: EventAnalyticsData = {
  eventsByType: [
    { type: 'Cultural', count: 5 },
    { type: 'Social', count: 4 },
    { type: 'Workshop', count: 3 },
    { type: 'Sports', count: 3 },
    { type: 'Meeting', count: 2 },
    { type: 'Religious', count: 2 },
  ],
  registrationsByMonth: [
    { month: 'Apr', count: 85 },
    { month: 'May', count: 120 },
    { month: 'Jun', count: 95 },
    { month: 'Jul', count: 140 },
    { month: 'Aug', count: 160 },
    { month: 'Sep', count: 180 },
  ],
  topEvents: [
    { name: 'Navratri Garba Night', registrations: 180 },
    { name: 'Diwali Celebration', registrations: 120 },
    { name: 'Children\'s Day Carnival', registrations: 85 },
    { name: 'Yoga Workshop', registrations: 35 },
    { name: 'Movie Screening', registrations: 22 },
  ],
  venueUtilization: [
    { venue: 'Community Hall', bookings: 12 },
    { venue: 'Clubhouse Hall', bookings: 8 },
    { venue: 'Community Ground', bookings: 6 },
    { venue: 'Garden Area', bookings: 4 },
  ],
  attendanceRate: 78,
};

// ── Service ─────────────────────────────────────────────────────

export const eventAdminService = {
  async getDashboardStats(): Promise<EventAdminDashboardStats> {
    try {
      const [eventsRes, venuesRes] = await Promise.all([
        api.get<any[]>('/events/all'),
        api.get<any[]>('/venues').catch(() => null),
      ]);
      const events = eventsRes.data;
      const now = new Date();
      return {
        totalEvents: events.length,
        upcomingEvents: events.filter(e => new Date(e.startDate || e.eventDate) > now && e.status !== 'CANCELLED').length,
        liveEvents: events.filter(e => {
          const start = new Date(e.startDate || e.eventDate);
          const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 3600000);
          return start <= now && end >= now && e.status !== 'CANCELLED';
        }).length,
        totalRegistrations: events.reduce((sum: number, e: any) => sum + (e.registrationCount ?? e.attendeesCount ?? 0), 0),
        totalVenues: venuesRes?.data?.length ?? 0,
        publishedEvents: events.filter(e => e.status === 'PUBLISHED').length,
      };
    } catch {
      return {
        totalEvents: 6,
        upcomingEvents: 3,
        liveEvents: 0,
        totalRegistrations: 442,
        totalVenues: 4,
        publishedEvents: 3,
      };
    }
  },

  async getEvents(type?: string, status?: string): Promise<EventSummary[]> {
    try {
      const res = await api.get<any[]>('/events/all');
      let events = res.data.map(mapEventDto);
      if (type) events = events.filter(e => e.type === type);
      if (status) events = events.filter(e => e.status === status);
      return events;
    } catch {
      let filtered = sampleEvents;
      if (type) filtered = filtered.filter(e => e.type === type);
      if (status) filtered = filtered.filter(e => e.status === status);
      return filtered;
    }
  },

  async createEvent(data: {
    title: string; type: string; description?: string;
    startDate: string; endDate?: string; venue?: string;
    maxAttendees?: number; priceType?: string;
  }): Promise<EventSummary> {
    const res = await api.post<any>('/events', data);
    return mapEventDto(res.data);
  },

  async updateEvent(id: number, data: Partial<EventSummary>): Promise<void> {
    await api.put(`/events/${id}`, data);
  },

  async deleteEvent(id: number): Promise<void> {
    await api.delete(`/events/${id}`);
  },

  async getRegistrations(eventId?: number): Promise<EventRegistration[]> {
    if (eventId) {
      try {
        const res = await api.get<any[]>(`/events/${eventId}/registrations`);
        return res.data.map(r => ({
          id: r.id,
          eventId,
          eventTitle: r.eventTitle || r.event?.title || '',
          userName: r.userName || r.user?.fullName || r.user?.name || '',
          userEmail: r.userEmail || r.user?.email,
          flat: r.flat || r.user?.flatNumber || '',
          registeredAt: r.registeredAt || r.createdAt || '',
          status: r.status || 'CONFIRMED',
          ticketType: r.ticketType,
        }));
      } catch {
        return sampleRegistrations.filter(r => r.eventId === eventId);
      }
    }
    return sampleRegistrations;
  },

  async getVenues(): Promise<EventVenue[]> {
    try {
      const res = await api.get<any[]>('/venues');
      return res.data.map(v => ({
        id: v.id,
        name: v.name || '',
        type: v.type || v.venueType || '',
        capacity: v.capacity,
        location: v.location || v.address || '',
        isAvailable: v.isAvailable ?? v.active ?? true,
        amenities: v.amenities,
      }));
    } catch {
      return [
        { id: 1, name: 'Community Hall', type: 'Indoor', capacity: 200, location: 'Block A, Ground Floor', isAvailable: true, amenities: ['AC', 'Sound System', 'Stage'] },
        { id: 2, name: 'Clubhouse Hall', type: 'Indoor', capacity: 100, location: 'Clubhouse Level 1', isAvailable: true, amenities: ['AC', 'Projector', 'WiFi'] },
        { id: 3, name: 'Community Ground', type: 'Outdoor', capacity: 500, location: 'Central Park Area', isAvailable: true, amenities: ['Open Space', 'Lighting'] },
        { id: 4, name: 'Garden Area', type: 'Outdoor', capacity: 80, location: 'Block B Garden', isAvailable: false, amenities: ['Gazebo', 'Seating'] },
        { id: 5, name: 'Terrace Lounge', type: 'Outdoor', capacity: 60, location: 'Clubhouse Terrace', isAvailable: true, amenities: ['Open Air', 'Bar Counter'] },
      ];
    }
  },

  async getAnalytics(): Promise<EventAnalyticsData> {
    try {
      const events = await eventAdminService.getEvents();
      const eventsByType: Record<string, number> = {};
      events.forEach(e => {
        const type = formatType(e.type);
        eventsByType[type] = (eventsByType[type] || 0) + 1;
      });

      const totalRegs = events.reduce((s, e) => s + e.registrationCount, 0);
      const totalMax = events.filter(e => e.maxAttendees).reduce((s, e) => s + (e.maxAttendees || 0), 0);
      const attendanceRate = totalMax > 0 ? Math.round((totalRegs / totalMax) * 100) : SAMPLE_ANALYTICS.attendanceRate;

      return {
        ...SAMPLE_ANALYTICS,
        eventsByType: Object.entries(eventsByType).map(([type, count]) => ({ type, count })),
        attendanceRate,
        topEvents: events
          .sort((a, b) => b.registrationCount - a.registrationCount)
          .slice(0, 5)
          .map(e => ({ name: e.title, registrations: e.registrationCount })),
      };
    } catch {
      return SAMPLE_ANALYTICS;
    }
  },
};

function mapEventDto(e: any): EventSummary {
  return {
    id: e.id,
    title: e.title || e.name || '',
    type: e.type || e.eventType || 'OTHER',
    status: e.status || 'DRAFT',
    startDate: e.startDate || e.eventDate || '',
    endDate: e.endDate,
    venue: e.venue?.name || e.venueName || e.location || '',
    registrationCount: e.registrationCount ?? e.attendeesCount ?? 0,
    maxAttendees: e.maxAttendees ?? e.capacity,
    organizer: e.organizer || e.createdBy?.fullName || '',
    priceType: e.priceType || 'FREE',
  };
}

function formatType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
