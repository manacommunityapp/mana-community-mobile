import api from './apiClient';

export interface GraphNodeDto {
  id: string;
  name: string;
  avatar?: string;
  type: 'PERSON' | 'GROUP' | 'TOPIC';
  subtitle?: string;
  commonInterests?: string[];
  mutualConnections?: number;
}

export const communityGraphService = {
  async getDiscoverFeed(): Promise<{
    recommendedNeighbors: GraphNodeDto[];
    interestClubs: GraphNodeDto[];
    trendingDiscussions: any[];
  }> {
    const res = await api.get('/community-graph/discover');
    return res.data;
  },

  async connectWithNeighbor(targetUserId: string): Promise<void> {
    await api.post(`/community-graph/connect/${targetUserId}`);
  },
};
