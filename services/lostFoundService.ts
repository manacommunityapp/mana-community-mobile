import api from './apiClient';

export interface LostFoundItem {
  id: string;
  type: 'LOST' | 'FOUND';
  title: string;
  location: string;
  date: string;
  description: string;
  reportedBy: string;
  contact: string;
  status: 'OPEN' | 'RESOLVED';
}

export interface CreateLostFoundRequest {
  type: 'LOST' | 'FOUND';
  title: string;
  location: string;
  description?: string;
  contact?: string;
}

const MOCK_ITEMS: LostFoundItem[] = [
  {
    id: 'LF-101',
    type: 'LOST',
    title: 'Blue Car Key Fob (Hyundai)',
    location: 'Basement Parking B2, near Pillar 14',
    date: 'Today, 2:30 PM',
    description: 'Black and silver key fob with blue silicone cover and small teddy bear keychain.',
    reportedBy: 'Kavita Roy (A-804)',
    contact: '+91 98451 00234',
    status: 'OPEN',
  },
  {
    id: 'LF-102',
    type: 'FOUND',
    title: 'Kids Titan Watch (Pink)',
    location: 'Children Play Area Bench',
    date: 'Yesterday, 6:00 PM',
    description: 'Pink strap digital sports watch found on the wooden bench next to swings. Handed to Tower B Security.',
    reportedBy: 'Security Guard Ram',
    contact: 'Tower B Main Desk',
    status: 'OPEN',
  },
  {
    id: 'LF-103',
    type: 'FOUND',
    title: 'Reading Glasses with Brown Leather Case',
    location: 'Clubhouse Library Room',
    date: '02 Oct, 11:00 AM',
    description: 'Rectangular gold-rimmed glasses in brown case. Deposited with clubhouse manager.',
    reportedBy: 'Clubhouse Reception',
    contact: 'Clubhouse Desk',
    status: 'RESOLVED',
  },
  {
    id: 'LF-104',
    type: 'LOST',
    title: 'Gym Water Bottle (Black Hydroflask)',
    location: 'Clubhouse Gymnasium / Treadmill area',
    date: '01 Oct, 8:00 AM',
    description: 'Matte black 1-litre bottle with red sticker.',
    reportedBy: 'Rahul Verma (C-302)',
    contact: '+91 98765 43210',
    status: 'OPEN',
  },
];

export const lostFoundService = {
  async getItems(): Promise<LostFoundItem[]> {
    try {
      const res = await api.get<LostFoundItem[]>('/lost-found/items');
      if (res.data?.length) return res.data;
    } catch {
      // fall through to mock
    }
    return [...MOCK_ITEMS];
  },

  async createItem(data: CreateLostFoundRequest): Promise<LostFoundItem> {
    try {
      const res = await api.post<LostFoundItem>('/lost-found/items', data);
      if (res.data) return res.data;
    } catch {
      // fall through to mock
    }
    const mock: LostFoundItem = {
      id: `LF-${Math.floor(100 + Math.random() * 900)}`,
      type: data.type,
      title: data.title,
      location: data.location,
      date: 'Just now',
      description: data.description || 'No additional details provided.',
      reportedBy: 'You (Current Resident)',
      contact: data.contact || 'Via in-app chat',
      status: 'OPEN',
    };
    MOCK_ITEMS.unshift(mock);
    return mock;
  },

  async claimItem(itemId: string): Promise<void> {
    try {
      await api.post(`/lost-found/items/${itemId}/claim`);
    } catch {
      // mock: silently succeed — notification to reporter is server-side
    }
  },
};
