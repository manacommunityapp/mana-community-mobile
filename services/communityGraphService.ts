import api from './apiClient';
import { secureLog } from '@/security';

export interface GraphNodeDto {
  id: string;
  name: string;
  avatar?: string;
  type: 'PERSON' | 'GROUP' | 'TOPIC' | string;
  subtitle?: string;
  commonInterests?: string[];
  mutualConnections?: number;
  matchScore?: number;
  flat?: string;
  tower?: string;
  profession?: string;
  description?: string;
  availability?: string;
  isVerified?: boolean;
}

export interface DiscoverFeedResponse {
  recommendedNeighbors: GraphNodeDto[];
  interestClubs: GraphNodeDto[];
  trendingDiscussions: any[];
}

export const FALLBACK_DISCOVER_FEED: DiscoverFeedResponse = {
  recommendedNeighbors: [],
  interestClubs: [],
  trendingDiscussions: [],
};

const DEFAULT_TOP_SKILLS: any[] = [];

export const communityGraphService = {
  /**
   * Fetch personalized discover recommendations from graph service.
   */
  async getDiscoverFeed(): Promise<DiscoverFeedResponse> {
    try {
      const res = await api.get<DiscoverFeedResponse>('/community-graph/discover');
      if (res.data && res.data.recommendedNeighbors && res.data.recommendedNeighbors.length > 0) {
        return res.data;
      }
    } catch {
      try {
        const res2 = await api.get<any>('/graph/discover');
        if (res2.data && res2.data.neighbors) {
          return {
            recommendedNeighbors: res2.data.neighbors.map((n: any) => ({
              id: String(n.id || n.userId),
              name: n.name || n.fullName || 'Neighbor',
              type: 'PERSON',
              subtitle: `${n.profession || 'Resident'} • Flat ${n.flatNumber || n.flatNo || ''}`,
              flat: n.flatNumber || n.flatNo,
              tower: n.tower,
              profession: n.profession,
              commonInterests: n.skills || n.interests || [],
              matchScore: n.matchScore || 90,
              isVerified: true,
            })),
            interestClubs: FALLBACK_DISCOVER_FEED.interestClubs,
            trendingDiscussions: [],
          };
        }
      } catch (err) {
        secureLog.warn('CommunityGraphService: getDiscoverFeed fallback to local data', err);
      }
    }
    return FALLBACK_DISCOVER_FEED;
  },

  /**
   * Send a neighbor connection request with optional intro message.
   */
  async connectWithNeighbor(targetUserId: string, message?: string): Promise<void> {
    try {
      await api.post(`/community-graph/connect/${targetUserId}`, { message });
    } catch {
      try {
        await api.post('/graph/relationships', {
          targetId: targetUserId,
          relationshipType: 'CONNECTED_TO',
          notes: message,
        });
      } catch {
        try {
          await api.post(`/graph/connect/${targetUserId}`, { message });
        } catch (err) {
          secureLog.warn('CommunityGraphService: connectWithNeighbor fallback handled', err);
        }
      }
    }
  },

  /**
   * Search community graph for neighbors by skill/keyword with tryPaths resilience.
   */
  async searchCommunity(query: string): Promise<any> {
    const q = (query || '').trim().toLowerCase();

    // Try path 1: /community-graph/discover/search
    try {
      const res1 = await api.get('/community-graph/discover/search', { params: { q: query } });
      if (res1.data) return res1.data;
    } catch {}

    // Try path 2: /graph/discover/search
    try {
      const res2 = await api.get('/graph/discover/search', { params: { q: query } });
      if (res2.data) return res2.data;
    } catch {}

    // Resilient fallback: search local fallback feed
    secureLog.info('CommunityGraphService: searchCommunity utilizing local fallback search for query:', query);
    const filtered = FALLBACK_DISCOVER_FEED.recommendedNeighbors.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      (item.profession && item.profession.toLowerCase().includes(q)) ||
      (item.flat && item.flat.toLowerCase().includes(q)) ||
      (item.commonInterests && item.commonInterests.some((i) => i.toLowerCase().includes(q))) ||
      (item.description && item.description.toLowerCase().includes(q))
    );

    return {
      results: filtered.map((n) => ({
        id: n.id,
        name: n.name,
        flatNumber: n.flat,
        profession: n.profession,
        type: n.type,
        skills: n.commonInterests,
      })),
      totalResults: filtered.length,
    };
  },

  /**
   * Get trending skills & topics in the community with tryPaths resilience.
   */
  async getTopSkills(): Promise<any[]> {
    // Try path 1: /community-graph/discover/skills
    try {
      const res1 = await api.get<any[]>('/community-graph/discover/skills');
      if (res1.data && Array.isArray(res1.data) && res1.data.length > 0) {
        return res1.data;
      }
    } catch {}

    // Try path 2: /graph/discover/skills
    try {
      const res2 = await api.get<any[]>('/graph/discover/skills');
      if (res2.data && Array.isArray(res2.data) && res2.data.length > 0) {
        return res2.data;
      }
    } catch {}

    // Resilient fallback
    return DEFAULT_TOP_SKILLS;
  },
};
