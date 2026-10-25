const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

export type TxnType = 'BILL' | 'RECHARGE' | 'TRANSFER_SENT' | 'TRANSFER_RECEIVED' | 'INVESTMENT' | 'ENTERTAINMENT' | 'LOAN_EMI';
export type TxnStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface UpiTransaction {
  id: string;
  type: TxnType;
  icon: string;
  merchant: string;
  description: string;
  upi_ref: string;
  amount: number;
  date: string;      // ISO date string
  time: string;      // HH:MM
  status: TxnStatus;
  category_color: string;
  category_bg: string;
}

const TYPE_META: Record<TxnType, { icon: string; color: string; bg: string }> = {
  BILL:               { icon: '⚡', color: '#D97706', bg: '#FFFBEB' },
  RECHARGE:           { icon: '📱', color: '#0284C7', bg: '#F0F9FF' },
  TRANSFER_SENT:      { icon: '↑',  color: '#DC2626', bg: '#FEF2F2' },
  TRANSFER_RECEIVED:  { icon: '↓',  color: '#16A34A', bg: '#F0FDF4' },
  INVESTMENT:         { icon: '📈', color: '#1D4ED8', bg: '#EFF6FF' },
  ENTERTAINMENT:      { icon: '🎬', color: '#7C3AED', bg: '#F5F3FF' },
  LOAN_EMI:           { icon: '💸', color: '#0F766E', bg: '#F0FDFA' },
};

function makeRef() {
  return 'UPI' + (Date.now() % 1_000_000_000).toString().padStart(12, '0');
}

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const MOCK_TRANSACTIONS: UpiTransaction[] = [
  { id: 'txn-001', type: 'BILL',               icon: '⚡', merchant: 'BESCOM Electricity',      description: 'Consumer #9876543210 · Oct bill',       upi_ref: makeRef(), amount: -1247, date: daysAgo(1),  time: '09:12', status: 'SUCCESS', category_color: '#D97706', category_bg: '#FFFBEB' },
  { id: 'txn-002', type: 'RECHARGE',            icon: '📱', merchant: 'Jio Recharge',             description: '₹299 Unlimited plan · 30 days',          upi_ref: makeRef(), amount: -299,  date: daysAgo(2),  time: '11:35', status: 'SUCCESS', category_color: '#0284C7', category_bg: '#F0F9FF' },
  { id: 'txn-003', type: 'TRANSFER_SENT',       icon: '↑',  merchant: 'Rohit Sharma',              description: 'rohit@okaxis · Community fund',           upi_ref: makeRef(), amount: -500,  date: daysAgo(2),  time: '14:20', status: 'SUCCESS', category_color: '#DC2626', category_bg: '#FEF2F2' },
  { id: 'txn-004', type: 'INVESTMENT',          icon: '💰', merchant: 'Bajaj Finance FD',          description: 'FD booking · 24m @ 8.10%',                upi_ref: makeRef(), amount: -50000, date: daysAgo(3), time: '10:05', status: 'SUCCESS', category_color: '#1D4ED8', category_bg: '#EFF6FF' },
  { id: 'txn-005', type: 'BILL',               icon: '🚗', merchant: 'NHAI FASTag',               description: 'Vehicle KA01AB1234 · Toll recharge',      upi_ref: makeRef(), amount: -500,  date: daysAgo(4),  time: '08:47', status: 'SUCCESS', category_color: '#B45309', category_bg: '#FFFBEB' },
  { id: 'txn-006', type: 'TRANSFER_RECEIVED',  icon: '↓',  merchant: 'Priya Nair',                description: 'priya@paytm · Split bill refund',         upi_ref: makeRef(), amount: 350,   date: daysAgo(4),  time: '18:55', status: 'SUCCESS', category_color: '#16A34A', category_bg: '#F0FDF4' },
  { id: 'txn-007', type: 'ENTERTAINMENT',       icon: '🎬', merchant: 'PVR Cinemas',               description: '2x IMAX seats · Pushpa 2',                upi_ref: makeRef(), amount: -960,  date: daysAgo(5),  time: '19:30', status: 'SUCCESS', category_color: '#7C3AED', category_bg: '#F5F3FF' },
  { id: 'txn-008', type: 'BILL',               icon: '📺', merchant: 'Tata Play DTH',             description: 'Subscriber #3987654321 · Nov plan',       upi_ref: makeRef(), amount: -649,  date: daysAgo(6),  time: '12:00', status: 'SUCCESS', category_color: '#0F766E', category_bg: '#F0FDFA' },
  { id: 'txn-009', type: 'RECHARGE',            icon: '📡', merchant: 'Airtel Broadband',          description: '₹999 plan · 100 Mbps · 30 days',         upi_ref: makeRef(), amount: -999,  date: daysAgo(7),  time: '09:55', status: 'SUCCESS', category_color: '#0284C7', category_bg: '#F0F9FF' },
  { id: 'txn-010', type: 'TRANSFER_SENT',       icon: '↑',  merchant: 'Society Maintenance',       description: 'bbps@setu · Oct maintenance dues',        upi_ref: makeRef(), amount: -4200, date: daysAgo(8),  time: '10:00', status: 'SUCCESS', category_color: '#DC2626', category_bg: '#FEF2F2' },
  { id: 'txn-011', type: 'LOAN_EMI',            icon: '💸', merchant: 'Bajaj Finserv EMI',         description: 'Personal loan EMI #8/24',                 upi_ref: makeRef(), amount: -9587, date: daysAgo(9),  time: '07:00', status: 'SUCCESS', category_color: '#0F766E', category_bg: '#F0FDFA' },
  { id: 'txn-012', type: 'BILL',               icon: '💧', merchant: 'BWSSB Water Supply',        description: 'Consumer #1234567890 · Oct bill',         upi_ref: makeRef(), amount: -412,  date: daysAgo(10), time: '11:20', status: 'SUCCESS', category_color: '#0284C7', category_bg: '#E0F2FE' },
  { id: 'txn-013', type: 'TRANSFER_RECEIVED',  icon: '↓',  merchant: 'Arjun Reddy',               description: 'arjun@ybl · Movie ticket share',          upi_ref: makeRef(), amount: 480,   date: daysAgo(10), time: '20:15', status: 'SUCCESS', category_color: '#16A34A', category_bg: '#F0FDF4' },
  { id: 'txn-014', type: 'INVESTMENT',          icon: '📈', merchant: 'Parag Parikh Flex Cap',     description: 'Mutual fund SIP · Oct 2026',              upi_ref: makeRef(), amount: -5000, date: daysAgo(12), time: '08:30', status: 'SUCCESS', category_color: '#1D4ED8', category_bg: '#EFF6FF' },
  { id: 'txn-015', type: 'BILL',               icon: '🎓', merchant: 'CBSE Fee Portal',           description: 'Roll #3012345678 · Exam fee',             upi_ref: makeRef(), amount: -1800, date: daysAgo(13), time: '15:45', status: 'PENDING', category_color: '#7C3AED', category_bg: '#EDE9FE' },
  { id: 'txn-016', type: 'RECHARGE',            icon: '📱', merchant: 'Airtel Postpaid',           description: '+91 98765 43210 · Oct bill',              upi_ref: makeRef(), amount: -549,  date: daysAgo(14), time: '16:30', status: 'SUCCESS', category_color: '#0284C7', category_bg: '#F0F9FF' },
  { id: 'txn-017', type: 'TRANSFER_SENT',       icon: '↑',  merchant: 'Deepa Krishnan',            description: 'deepa@okicici · Society picnic fund',     upi_ref: makeRef(), amount: -1000, date: daysAgo(15), time: '13:10', status: 'FAILED',  category_color: '#DC2626', category_bg: '#FEF2F2' },
  { id: 'txn-018', type: 'BILL',               icon: '🏛️', merchant: 'GHMC Property Tax',          description: 'PTIN #123456789 · Q2 tax',               upi_ref: makeRef(), amount: -6200, date: daysAgo(18), time: '11:00', status: 'SUCCESS', category_color: '#5B21B6', category_bg: '#F5F3FF' },
  { id: 'txn-019', type: 'ENTERTAINMENT',       icon: '🎬', merchant: 'Inox Cinemas',              description: '2x seats · Animal - Returns',             upi_ref: makeRef(), amount: -700,  date: daysAgo(20), time: '17:00', status: 'SUCCESS', category_color: '#7C3AED', category_bg: '#F5F3FF' },
  { id: 'txn-020', type: 'BILL',               icon: '🟢', merchant: 'HP Gas LPG',                description: 'Consumer HP123456789 · Cylinder booking', upi_ref: makeRef(), amount: -932,  date: daysAgo(22), time: '10:30', status: 'SUCCESS', category_color: '#16A34A', category_bg: '#F0FDF4' },
];

export type TxnFilter = 'ALL' | TxnType;

export const upiHistoryService = {
  async getTransactions(): Promise<UpiTransaction[]> {
    try {
      const resp = await fetch(`${API_BASE}/v1/upi/history`);
      if (resp.ok) {
        const d = await resp.json();
        if (Array.isArray(d)) return d;
      }
      return [];
    } catch {
      return [];
    }
  },

  filterByType(txns: UpiTransaction[], filter: TxnFilter): UpiTransaction[] {
    if (filter === 'ALL') return txns;
    return txns.filter(t => t.type === filter);
  },

  search(txns: UpiTransaction[], query: string): UpiTransaction[] {
    if (!query.trim()) return txns;
    const q = query.toLowerCase();
    return txns.filter(t =>
      t.merchant.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      String(Math.abs(t.amount)).includes(q)
    );
  },

  getTotals(txns: UpiTransaction[]) {
    const sent = txns.filter(t => t.amount < 0 && t.status === 'SUCCESS').reduce((s, t) => s + Math.abs(t.amount), 0);
    const received = txns.filter(t => t.amount > 0 && t.status === 'SUCCESS').reduce((s, t) => s + t.amount, 0);
    return { sent, received };
  },

  TYPE_META,
};
