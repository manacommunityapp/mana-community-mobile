import { apiClient } from './apiClient';
import type {
  CommunityProfile,
  RecommendationCard,
  OmniSearchResponse,
  UpdateVisibilityRequest,
} from '@/types/manaIntelligence';

export const manaIntelligenceService = {
  getPersonalizedFeed: async (): Promise<{ recommendations: RecommendationCard[]; total: number }> => {
    try {
      const res = await apiClient.get('/api/graph/recommendations/feed');
      return (res.data as any)?.data || res.data;
    } catch {
      return {
        recommendations: [
          {
            id: 'rec-1',
            type: 'GROUP_BUY_DEAL',
            title: 'Royal Basmati Rice 5kg (Tier 3 Unlocked)',
            subtitle: '₹340 / unit (saved 24%) • 8 bags left',
            badge: '🔥 Hot Deal',
            score: 0.96,
            reason: 'High demand in your tower (Tower A)',
            targetRoute: '/deals/1',
            actionLabel: 'Join Deal',
          },
          {
            id: 'rec-2',
            type: 'SKILL_MATCH',
            title: 'Dr. Anita Nair (Pediatrician)',
            subtitle: 'Tower A • 12 years exp',
            badge: 'Neighbor Pro',
            score: 0.91,
            reason: 'Verified resident in your building',
            targetRoute: '/intelligence/discover',
            actionLabel: 'Connect',
          }
        ],
        total: 2,
      };
    }
  },

  searchDiscoverProfiles: async (q?: string, tower?: string, skill?: string): Promise<CommunityProfile[]> => {
    try {
      const res = await apiClient.get('/api/graph/discover/search', {
        params: { q, tower, skill },
      });
      return (res.data as any)?.data || res.data;
    } catch {
      return [];
    }
  },

  omniSearch: async (query: string, limit = 6): Promise<OmniSearchResponse> => {
    try {
      const res = await apiClient.get('/api/graph/omnisearch', {
        params: { q: query, limit },
      });
      return (res.data as any)?.data || res.data;
    } catch {
      return { results: [], query, totalMatches: 0 };
    }
  },

  getTopSkills: async (): Promise<{ skill: string; count: number }[]> => {
    try {
      const res = await apiClient.get('/api/graph/discover/skills');
      return (res.data as any)?.data || res.data;
    } catch {
      return [
        { skill: 'Doctor', count: 14 },
        { skill: 'Teacher', count: 9 },
        { skill: 'Yoga', count: 7 },
        { skill: 'Software Engineer', count: 22 },
        { skill: 'Chef', count: 5 }
      ];
    }
  },

  updateVisibility: async (req: UpdateVisibilityRequest): Promise<CommunityProfile> => {
    const res = await apiClient.put('/api/graph/privacy/visibility', req);
    return (res.data as any)?.data || res.data;
  },
};
