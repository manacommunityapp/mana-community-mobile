import api from './apiClient';

export type GroupInviteStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface GroupGuest {
  name: string;
  phone?: string;
  vehicleNumber?: string;
  checkedIn?: boolean;
}

export interface GroupInvite {
  id: number;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guests: GroupGuest[];
  passCode: string;
  status: GroupInviteStatus;
  createdAt: string;
  totalGuests: number;
  checkedIn: number;
}

export interface CreateGroupInviteRequest {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guests: GroupGuest[];
}

export const groupInviteService = {
  async getMyGroupInvites(): Promise<GroupInvite[]> {
    try {
      const res = await api.get<GroupInvite[]>('/visitors/group-invites');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async createGroupInvite(data: CreateGroupInviteRequest): Promise<GroupInvite> {
    try {
      const res = await api.post<GroupInvite>('/visitors/group-invites', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create group invite. Please try again.');
    }
  },

  async cancelGroupInvite(id: number): Promise<void> {
    try {
      await api.delete(`/visitors/group-invites/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to cancel invite.');
    }
  },

  async addGuestToInvite(id: number, guest: GroupGuest): Promise<GroupInvite> {
    try {
      const res = await api.post<GroupInvite>(`/visitors/group-invites/${id}/guests`, guest);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to add guest.');
    }
  },
};
