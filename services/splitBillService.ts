import api from './apiClient';

export type SplitType = 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';

export interface SplitMember {
  user_id: string;
  name: string;
  flat?: string;
  share_amount: number;
  share_pct?: number;
  status: 'PENDING' | 'PAID' | 'DECLINED';
  upi_vpa?: string;
  paid_at?: string;
}

export interface SplitBill {
  id: string;
  title: string;
  description?: string;
  total_amount: number;
  split_type: SplitType;
  created_by: string;
  created_by_name: string;
  members: SplitMember[];
  settled_amount: number;
  pending_amount: number;
  status: 'OPEN' | 'PARTIALLY_SETTLED' | 'SETTLED';
  created_at: string;
  category: 'MAINTENANCE' | 'EVENT' | 'UTILITY' | 'FOOD' | 'OTHER';
}

export interface SettleResult {
  upi_intent_url: string;
  phone_pe_url: string;
  transaction_ref: string;
  amount: number;
}

const FALLBACK_SPLITS: SplitBill[] = [
  {
    id: 'split-1',
    title: 'Annual Day Event — Decoration',
    description: 'Community hall decoration for Annual Day 2025',
    total_amount: 12000,
    split_type: 'EQUAL',
    created_by: 'u-001',
    created_by_name: 'Rajesh Kumar (A-201)',
    members: [
      { user_id: 'u-001', name: 'Rajesh Kumar', flat: 'A-201', share_amount: 4000, status: 'PAID' },
      { user_id: 'u-002', name: 'Priya Sharma',  flat: 'A-202', share_amount: 4000, status: 'PENDING' },
      { user_id: 'u-003', name: 'Amit Verma',    flat: 'B-101', share_amount: 4000, status: 'PENDING' },
    ],
    settled_amount: 4000,
    pending_amount: 8000,
    status: 'PARTIALLY_SETTLED',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    category: 'EVENT',
  },
  {
    id: 'split-2',
    title: 'Generator Diesel — October',
    total_amount: 8500,
    split_type: 'EQUAL',
    created_by: 'u-004',
    created_by_name: 'Society Treasurer',
    members: [
      { user_id: 'u-002', name: 'Priya Sharma',  flat: 'A-202', share_amount: 2833, status: 'PENDING' },
      { user_id: 'u-003', name: 'Amit Verma',    flat: 'B-101', share_amount: 2833, status: 'PAID' },
      { user_id: 'u-001', name: 'Rajesh Kumar',  flat: 'A-201', share_amount: 2834, status: 'PENDING' },
    ],
    settled_amount: 2833,
    pending_amount: 5667,
    status: 'PARTIALLY_SETTLED',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    category: 'UTILITY',
  },
];

export const splitBillService = {
  async getSplits(): Promise<SplitBill[]> {
    try {
      const res = await api.get<SplitBill[]>('/v1/split/my-splits');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return FALLBACK_SPLITS;
  },

  async createSplit(payload: {
    title: string;
    description?: string;
    total_amount: number;
    split_type: SplitType;
    members: { user_id: string; name: string; flat?: string; share_amount: number }[];
    category: SplitBill['category'];
  }): Promise<SplitBill> {
    // The split is created server-side so every member sees it. A failure propagates —
    // never hand back a locally-minted split that only exists on this device.
    const res = await api.post<SplitBill>('/v1/split/create', payload);
    if (!res.data?.id) {
      throw new Error('Split could not be created: the server did not return a split.');
    }
    return res.data;
  },

  async settle(splitId: string, memberId: string, amount: number, payeeName: string): Promise<SettleResult> {
    // The UPI intent and transaction reference must be issued by the server so the
    // settlement is actually tracked. Never mint a payment intent on the client.
    const res = await api.post<SettleResult>(`/v1/split/${splitId}/settle`, {
      member_id: memberId,
      amount,
      payee_name: payeeName,
    });
    if (!res.data?.upi_intent_url) {
      throw new Error('Settlement could not be initiated: the server did not return a payment intent.');
    }
    return res.data;
  },
};
