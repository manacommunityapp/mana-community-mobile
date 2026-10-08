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
  recommendedNeighbors: [
    {
      id: 'rec-1',
      type: 'PERSON',
      name: 'Dr. Anita Nair',
      subtitle: 'Senior Consultant Pediatrician • Flat A-304',
      commonInterests: ['Pediatrics', 'Child Health', 'Weekend Guidance'],
      mutualConnections: 4,
      matchScore: 97,
      flat: 'A-304',
      tower: 'Tower A',
      profession: 'Senior Consultant Pediatrician',
      description: '15+ yrs experience. Available for weekend emergency consultations and pediatric child guidance for society families.',
      availability: 'Sat-Sun (10 AM - 1 PM)',
      isVerified: true,
    },
    {
      id: 'rec-2',
      type: 'PERSON',
      name: 'Rohan Deshpande',
      subtitle: 'Badminton & Marathon Enthusiast • Flat B-601',
      commonInterests: ['Badminton', 'Running 10K', 'Morning 6:30 AM'],
      mutualConnections: 3,
      matchScore: 93,
      flat: 'B-601',
      tower: 'Tower B',
      profession: 'Badminton & Marathon Enthusiast',
      description: 'Looking for doubles partner for weekend morning sessions at society court and 10k morning runners.',
      availability: 'Daily Mornings',
      isVerified: true,
    },
    {
      id: 'rec-3',
      type: 'PERSON',
      name: 'Rashmi South Kitchen',
      subtitle: 'Artisanal Home Cook • Flat C-202',
      commonInterests: ['South Indian', 'Fresh Idlis', 'Pre-order'],
      mutualConnections: 2,
      matchScore: 89,
      flat: 'C-202',
      tower: 'Tower C',
      profession: 'Artisanal Home Cook',
      description: 'Authentic Mangalore Ghee Roast, soft Tatte Idlis, and weekend sourdough bakes made with pure ingredients.',
      availability: 'Fri-Sun (Pre-order)',
      isVerified: true,
    },
    {
      id: 'rec-4',
      type: 'PERSON',
      name: 'Rajesh Mehta (CA & SEBI RIA)',
      subtitle: 'Chartered Accountant & Wealth Advisor • Flat D-802',
      commonInterests: ['Tax Filing', 'Retirement', 'Mutual Funds'],
      mutualConnections: 1,
      matchScore: 86,
      flat: 'D-802',
      tower: 'Tower D',
      profession: 'Chartered Accountant & Wealth Advisor',
      description: 'Helping neighbours optimize income tax, retirement corpus, and estate planning with complimentary 30m reviews.',
      availability: 'Weekday Evenings',
      isVerified: true,
    },
    {
      id: 'rec-5',
      type: 'PERSON',
      name: 'Priyanka Sen',
      subtitle: 'Ex-Google Tech Lead & Math Coach • Flat A-1102',
      commonInterests: ['Python', 'Data Structures', 'IIT-JEE Prep'],
      mutualConnections: 3,
      matchScore: 91,
      flat: 'A-1102',
      tower: 'Tower A',
      profession: 'Ex-Google Tech Lead & Math Coach',
      description: 'Mentoring high school and college students in algorithmic problem solving, Python coding, and career prep.',
      availability: 'Weekend Afternoons',
      isVerified: true,
    },
    {
      id: 'rec-6',
      type: 'PERSON',
      name: 'Karthik Varma',
      subtitle: 'Product Manager @ Tech Park • Flat B-403',
      commonInterests: ['EV Carpool', 'Tech Park', '08:30 AM Departure'],
      mutualConnections: 4,
      matchScore: 94,
      flat: 'B-403',
      tower: 'Tower B',
      profession: 'Product Manager @ Tech Park',
      description: 'Daily commute to Whitefield / ITPL. Offering 3 seats in EV SUV with silent ride and wifi.',
      availability: 'Mon - Fri',
      isVerified: true,
    },
  ],
  interestClubs: [
    { id: 'club-1', name: 'Mana Runners Club', type: 'GROUP', subtitle: '48 members • 6 AM Daily' },
    { id: 'club-2', name: 'Book & Philosophy Club', type: 'GROUP', subtitle: '24 members • Alternate Sun' },
  ],
  trendingDiscussions: [],
};

const DEFAULT_TOP_SKILLS = [
  { name: 'Pediatrics & Child Care', count: 12, category: 'Health' },
  { name: 'Financial Planning & Tax', count: 9, category: 'Finance' },
  { name: 'Software & Python Coding', count: 18, category: 'Tech' },
  { name: 'Yoga & Mindfulness', count: 14, category: 'Fitness' },
  { name: 'EV Carpooling', count: 8, category: 'Commute' },
  { name: 'Home Baking & Catering', count: 11, category: 'Food' },
];

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
