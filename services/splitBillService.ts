const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

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
      const r = await fetch(`${API_BASE}/v1/split/my-splits`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
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
    try {
      const r = await fetch(`${API_BASE}/v1/split/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) { const d = await r.json(); if (d?.id) return d; }
    } catch {}
    return {
      ...payload,
      id: `split-${Date.now()}`,
      created_by: 'me',
      created_by_name: 'You',
      members: payload.members.map(m => ({ ...m, status: 'PENDING' as const })),
      settled_amount: 0,
      pending_amount: payload.total_amount,
      status: 'OPEN',
      created_at: new Date().toISOString(),
    };
  },

  async settle(splitId: string, memberId: string, amount: number, payeeName: string): Promise<SettleResult> {
    try {
      const r = await fetch(`${API_BASE}/v1/split/${splitId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, amount }),
      });
      if (r.ok) { const d = await r.json(); if (d?.upi_intent_url) return d; }
    } catch {}
    const tr = `MANA-SPLIT-${Date.now()}`;
    return {
      upi_intent_url: `upi://pay?pa=split@setu&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tr=${tr}&tn=Split+Bill+Settlement`,
      phone_pe_url: `phonepe://pay?pa=split@setu&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tr=${tr}`,
      transaction_ref: tr,
      amount,
    };
  },
};
