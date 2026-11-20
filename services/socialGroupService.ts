import api from './apiClient';
import type { ApiEnvelope, PageResponse } from './apiClient';

export type GroupType = 'BOOK_CLUB' | 'FITNESS' | 'PARENTS' | 'HOBBY' | 'PROFESSIONAL' | 'INTEREST' | 'GENERAL';

export interface SocialGroup {
  id: number;
  communityId: number;
  name: string;
  groupType: GroupType;
  description?: string;
  memberCount: number;
  isPrivate: boolean;
  coverImageUrl?: string;
  createdAt: string;
  isMember?: boolean;
}

export interface GroupMessage {
  id: number;
  groupId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  sentAt: string;
}

export interface GroupEvent {
  id: number;
  groupId: number;
  title: string;
  scheduledAt: string;
  location?: string;
  rsvpStatus?: 'GOING' | 'NOT_GOING' | 'MAYBE';
}

export interface GroupExpense {
  id: number;
  groupId: number;
  description: string;
  amount: number;
  paidByName: string;
  createdAt: string;
  myShare: number;
  myBalance: number;
}

export interface CreateGroupRequest {
  name: string;
  groupType: GroupType;
  description?: string;
  isPrivate: boolean;
}

export const socialGroupService = {
  async getCommunityGroups(communityId: number): Promise<SocialGroup[]> {
    const res = await api.get<ApiEnvelope<SocialGroup[]> | SocialGroup[]>(
      `/api/v1/social/groups?communityId=${communityId}`,
    );
    const d = res.data as any;
    return Array.isArray(d) ? d : (d?.data ?? []);
  },

  async getMyGroups(): Promise<SocialGroup[]> {
    const res = await api.get<ApiEnvelope<SocialGroup[]> | SocialGroup[]>(
      '/api/v1/social/groups/my',
    );
    const d = res.data as any;
    return Array.isArray(d) ? d : (d?.data ?? []);
  },

  async getGroup(groupId: number): Promise<SocialGroup> {
    const res = await api.get<ApiEnvelope<SocialGroup>>(`/api/v1/social/groups/${groupId}`);
    const d = res.data as any;
    return d?.data ?? d;
  },

  async createGroup(communityId: number, data: CreateGroupRequest): Promise<SocialGroup> {
    const res = await api.post<ApiEnvelope<SocialGroup>>(
      `/api/v1/social/groups?communityId=${communityId}`,
      data,
    );
    const d = res.data as any;
    return d?.data ?? d;
  },

  async join(groupId: number): Promise<void> {
    await api.post(`/api/v1/social/groups/${groupId}/join`);
  },

  async leave(groupId: number): Promise<void> {
    await api.post(`/api/v1/social/groups/${groupId}/leave`);
  },

  async getMessages(groupId: number, page = 0): Promise<GroupMessage[]> {
    const res = await api.get<ApiEnvelope<GroupMessage[]> | GroupMessage[]>(
      `/api/v1/social/groups/${groupId}/messages?page=${page}&size=30`,
    );
    const d = res.data as any;
    return Array.isArray(d) ? d : (d?.data ?? []);
  },

  async sendMessage(groupId: number, content: string): Promise<GroupMessage> {
    const res = await api.post<ApiEnvelope<GroupMessage>>(
      `/api/v1/social/groups/${groupId}/messages`,
      { content },
    );
    const d = res.data as any;
    return d?.data ?? d;
  },

  async getEvents(groupId: number): Promise<GroupEvent[]> {
    const res = await api.get<ApiEnvelope<GroupEvent[]> | GroupEvent[]>(
      `/api/v1/social/groups/${groupId}/events`,
    );
    const d = res.data as any;
    return Array.isArray(d) ? d : (d?.data ?? []);
  },

  async rsvp(groupId: number, eventId: number, status: 'GOING' | 'NOT_GOING' | 'MAYBE'): Promise<void> {
    await api.post(`/api/v1/social/groups/${groupId}/events/${eventId}/rsvp`, { status });
  },

  async getExpenses(groupId: number): Promise<GroupExpense[]> {
    const res = await api.get<ApiEnvelope<GroupExpense[]> | GroupExpense[]>(
      `/api/v1/social/groups/${groupId}/expenses`,
    );
    const d = res.data as any;
    return Array.isArray(d) ? d : (d?.data ?? []);
  },

  async addExpense(groupId: number, description: string, amount: number): Promise<GroupExpense> {
    const res = await api.post<ApiEnvelope<GroupExpense>>(
      `/api/v1/social/groups/${groupId}/expenses`,
      { description, amount },
    );
    const d = res.data as any;
    return d?.data ?? d;
  },
};
