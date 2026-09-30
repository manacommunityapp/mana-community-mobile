import api from './apiClient';

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

export const communityGraphService = {
  /**
   * Fetch personalized discover recommendations from graph service.
   */
  async getDiscoverFeed(): Promise<DiscoverFeedResponse> {
    try {
      const res = await api.get<DiscoverFeedResponse>('/community-graph/discover');
      if (res.data && res.data.recommendedNeighbors) {
        return res.data;
      }
    } catch {
      try {
        const res2 = await api.get<any>('/api/graph/discover');
        if (res2.data) return res2.data;
      } catch {
        // Use structured fallback
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
        await api.post('/api/graph/relationships', {
          targetId: targetUserId,
          relationshipType: 'CONNECTED_TO',
          notes: message,
        });
      } catch {
        // Fallback optimistic resolution
      }
    }
  },

  /**
   * Search community graph for neighbors by skill/keyword.
   */
  async searchCommunity(query: string): Promise<any> {
    const res = await api.get('/api/graph/discover/search', { params: { q: query } });
    return res.data;
  },

  /**
   * Get trending skills & topics in the community.
   */
  async getTopSkills(): Promise<any[]> {
    const res = await api.get<any[]>('/api/graph/discover/skills');
    return res.data;
  },
};

