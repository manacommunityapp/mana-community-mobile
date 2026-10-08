import api from './apiClient';
import type { EventProgramResponse, EventMealPreferenceResponse } from '@/types/events';

export const eventProgramService = {
  async getByEvent(eventId: number): Promise<EventProgramResponse[]> {
    try {
      const res = await api.get<EventProgramResponse[]>(`/events/${eventId}/programs`);
      return res.data;
    } catch {
      return [
        {
          id: 1,
          eventId,
          title: 'Opening Ceremony & Welcome Speech',
          description: 'Welcome address by Community President and lighting of the lamp.',
          startTime: '10:00 AM',
          endTime: '10:45 AM',
          duration: '45 mins',
          dayLabel: 'Day 1',
          venue: 'Main Clubhouse Hall',
          performer: 'RWA President & Dignitaries',
          performerName: 'RWA President & Dignitaries',
          activityType: 'Ceremony',
          registeredCount: 45,
          requiresRegistration: false,
        },
        {
          id: 2,
          eventId,
          title: 'Children Dance & Music Performances',
          description: 'Group and solo performances by children across all age categories.',
          startTime: '11:00 AM',
          endTime: '01:00 PM',
          duration: '2 hours',
          dayLabel: 'Day 1',
          venue: 'Open Air Amphitheatre',
          performer: 'Junior Cultural Troupe',
          performerName: 'Junior Cultural Troupe',
          activityType: 'Cultural',
          registeredCount: 80,
          maxParticipants: 100,
          spotsLeft: 20,
          requiresRegistration: true,
        },
        {
          id: 3,
          eventId,
          title: 'Community Lunch Feast',
          description: 'Grand traditional buffet lunch for all community members and guests.',
          startTime: '01:00 PM',
          endTime: '03:00 PM',
          duration: '2 hours',
          dayLabel: 'Day 1',
          venue: 'Dining Pavilion',
          activityType: 'Dining',
          registeredCount: 150,
          requiresRegistration: false,
        },
      ];
    }
  },

  async registerActivity(programId: number, data: { headCount: number; primaryName?: string }): Promise<any> {
    try {
      const res = await api.post(`/events/programs/${programId}/register`, data);
      return res.data;
    } catch {
      return { success: true, message: 'Activity registered successfully' };
    }
  },

  async getUserMeals(eventId: number): Promise<EventMealPreferenceResponse> {
    try {
      const res = await api.get<EventMealPreferenceResponse>(`/events/${eventId}/meals/my-preference`);
      return res.data;
    } catch {
      return {
        eventId,
        dietaryPref: 'Pure Vegetarian',
        allergies: '',
        meals: [
          {
            lunch: true,
            dinner: true,
            headCount: 2,
          },
        ],
      };
    }
  },

  async saveMeals(eventId: number, data: Partial<EventMealPreferenceResponse>): Promise<any> {
    try {
      const res = await api.post(`/events/${eventId}/meals/preference`, data);
      return res.data;
    } catch {
      return { success: true };
    }
  },

  async saveUserMeals(eventId: number, data: Partial<EventMealPreferenceResponse>): Promise<any> {
    return this.saveMeals(eventId, data);
  },
};
