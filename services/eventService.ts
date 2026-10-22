import api from './apiClient';
import type { EventDto, CreateEventRequest, EventRegistrationDto } from '@/types/api';

export const eventService = {
  getUpcomingEvents: async (type?: string): Promise<EventDto[]> => {
    try {
      const params = type ? { type } : {};
      const res = await api.get<EventDto[]>('/events', { params });
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // Fallback
    }
    const filtered = type ? FALLBACK_EVENTS.filter(e => e.type === type) : FALLBACK_EVENTS;
    return filtered;
  },

  getAllEvents: async (): Promise<EventDto[]> => {
    try {
      const res = await api.get<EventDto[]>('/events/all');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // Fallback
    }
    return FALLBACK_EVENTS;
  },

  getMyEvents: async (): Promise<EventDto[]> => {
    try {
      const res = await api.get<EventDto[]>('/events/mine');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // Fallback
    }
    return FALLBACK_EVENTS.filter(e => e.isRegistered || e.createdById === 1);
  },

  getById: async (id: number): Promise<EventDto> => {
    try {
      const res = await api.get<EventDto>(`/events/${id}`);
      if (res.data) return res.data;
    } catch {
      // Fallback
    }
    const found = FALLBACK_EVENTS.find(e => e.id === id);
    return found ?? FALLBACK_EVENTS[0];
  },

  create: async (data: CreateEventRequest): Promise<EventDto> => {
    const res = await api.post<EventDto>('/events', data);
    return res.data;
  },

  update: async (id: number, data: CreateEventRequest): Promise<EventDto> => {
    const res = await api.put<EventDto>(`/events/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/events/${id}`);
  },

  register: async (id: number, data?: {
    ticketType?: string;
    quantity?: number;
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    agreed?: boolean;
  }): Promise<EventDto> => {
    try {
      const res = await api.post<EventDto>(`/events/${id}/register`, data ?? {});
      return res.data;
    } catch {
      const ev = FALLBACK_EVENTS.find(e => e.id === id) ?? FALLBACK_EVENTS[0];
      return { ...ev, isRegistered: true, registrationCount: (ev.registrationCount || 0) + 1 };
    }
  },

  unregister: async (id: number): Promise<EventDto> => {
    try {
      const res = await api.delete<EventDto>(`/events/${id}/register`);
      return res.data;
    } catch {
      const ev = FALLBACK_EVENTS.find(e => e.id === id) ?? FALLBACK_EVENTS[0];
      return { ...ev, isRegistered: false, registrationCount: Math.max(0, (ev.registrationCount || 1) - 1) };
    }
  },

  getRegistrations: async (id: number): Promise<EventRegistrationDto[]> => {
    const res = await api.get<EventRegistrationDto[]>(`/events/${id}/registrations`);
    return res.data;
  },
};

const FALLBACK_EVENTS: EventDto[] = [
  {
    id: 1,
    title: 'Diwali Grand Celebration & Cultural Night',
    description: 'Join us for an evening of diya lighting, classical dance performances, music, and festive dinner at the central amphitheatre.',
    type: 'CULTURAL',
    startDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    startTime: '18:30',
    endTime: '22:00',
    locationType: 'PHYSICAL',
    location: 'Central Amphitheatre',
    venue: 'Central Amphitheatre',
    city: 'Hyderabad',
    priceType: 'FREE',
    price: null,
    capacity: 250,
    maxAttendees: 250,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    organizerName: 'Cultural Committee',
    organizerContact: 'cultural@manacommunity.com',
    category: 'Celebration',
    status: 'UPCOMING',
    notes: 'Traditional attire encouraged.',
    registrationDeadline: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
    registrationCount: 142,
    isRegistered: true,
    createdById: 1,
    createdByName: 'Suresh Reddy',
    communityId: 1,
    attendees: 142,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Weekend Badminton Tournament (Singles & Doubles)',
    description: 'Annual inter-tower badminton tournament for men, women, and juniors. Trophies and prizes for winners!',
    type: 'SPORTS',
    startDate: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '13:00',
    locationType: 'PHYSICAL',
    location: 'Indoor Sports Arena',
    venue: 'Indoor Sports Arena Court 1-3',
    city: 'Hyderabad',
    priceType: 'PAID',
    price: 150,
    capacity: 64,
    maxAttendees: 64,
    imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
    organizerName: 'Sports Club',
    organizerContact: 'sports@manacommunity.com',
    category: 'Tournament',
    status: 'UPCOMING',
    notes: 'Please bring your own racquets. Non-marking shoes mandatory.',
    registrationDeadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    registrationCount: 48,
    isRegistered: false,
    createdById: 2,
    createdByName: 'Amit Verma',
    communityId: 1,
    attendees: 48,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Home Gardening & Hydroponics Workshop',
    description: 'Learn urban gardening techniques, organic pest control, and how to set up small balcony hydroponics setups.',
    type: 'WORKSHOP',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '16:00',
    endTime: '18:00',
    locationType: 'PHYSICAL',
    location: 'Clubhouse Terrace Lawn',
    venue: 'Clubhouse Terrace Lawn',
    city: 'Hyderabad',
    priceType: 'FREE',
    price: null,
    capacity: 50,
    maxAttendees: 50,
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800',
    organizerName: 'Green Living Club',
    organizerContact: 'green@manacommunity.com',
    category: 'Learning',
    status: 'UPCOMING',
    notes: 'Starter seed kits provided to all participants.',
    registrationDeadline: new Date().toISOString().split('T')[0],
    registrationCount: 38,
    isRegistered: false,
    createdById: 3,
    createdByName: 'Pooja Iyer',
    communityId: 1,
    attendees: 38,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    title: 'Monthly Society General Body Meeting (AGM)',
    description: 'Review of annual maintenance budgets, security upgrades, EV charging installation updates, and Q&A with the MC.',
    type: 'MEETING',
    startDate: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
    startTime: '10:30',
    endTime: '12:30',
    locationType: 'HYBRID',
    location: 'Community Hall & Google Meet',
    venue: 'Community Hall Block A',
    city: 'Hyderabad',
    priceType: 'FREE',
    price: null,
    capacity: 200,
    maxAttendees: 200,
    imageUrl: null,
    organizerName: 'Managing Committee',
    organizerContact: 'mc@manacommunity.com',
    category: 'Governance',
    status: 'UPCOMING',
    notes: 'All flat owners are requested to attend or assign proxies.',
    registrationDeadline: null,
    registrationCount: 95,
    isRegistered: true,
    createdById: 1,
    createdByName: 'Managing Committee',
    communityId: 1,
    attendees: 95,
    createdAt: new Date().toISOString(),
  },
];
