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

const MOCK_INVITES: GroupInvite[] = [
  {
    id: 1,
    title: 'Diwali Gathering',
    eventDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '23:00',
    passCode: 'MANA-DIWALI22',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    totalGuests: 8,
    checkedIn: 3,
    guests: [
      { name: 'Rohan Sharma', phone: '9876500001', checkedIn: true },
      { name: 'Priya Mehta', phone: '9876500002', checkedIn: true },
      { name: 'Arjun Gupta', phone: '9876500003', vehicleNumber: 'KA-01-AB-1234', checkedIn: true },
      { name: 'Sneha Joshi', phone: '9876500004', checkedIn: false },
      { name: 'Vikram Nair', vehicleNumber: 'MH-04-CD-5678', checkedIn: false },
      { name: 'Anita Desai', phone: '9876500006', checkedIn: false },
      { name: 'Kiran Rao', checkedIn: false },
      { name: 'Suresh Pillai', phone: '9876500008', checkedIn: false },
    ],
  },
];

export const groupInviteService = {
  async getMyGroupInvites(): Promise<GroupInvite[]> {
    try {
      const res = await api.get<GroupInvite[]>('/visitors/group-invites');
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_INVITES;
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
