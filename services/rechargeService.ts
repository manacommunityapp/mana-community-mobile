import api from './apiClient';

// ── Types ────────────────────────────────────────────────────────────────────

export type RechargeType = 'PREPAID' | 'POSTPAID';

export interface MobileOperator {
  id: string;
  name: string;
  shortName: string;
  icon: string;        // emoji
  logoColor: string;
  circles: string[];   // telecom circles covered
}

export interface RechargePlan {
  id: string;
  operatorId: string;
  category: 'POPULAR' | 'DATA' | 'UNLIMITED' | 'VALIDITY' | 'TOPUP';
  price: number;
  validity: string;
  data: string;
  calls: string;
  sms: string;
  description: string;
  isBestSeller?: boolean;
  isRecommended?: boolean;
}

export interface RechargeRequest {
  mobileNumber: string;
  operatorId: string;
  circle: string;
  planId: string;
  amount: number;
  rechargeType: RechargeType;
}

export interface RechargeResponse {
  transactionId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  upiIntentUrl: string;
  phonePeUrl: string;
  amount: number;
  mobileNumber: string;
  operatorId: string;
  planDescription: string;
}

// ── Static operator catalogue ────────────────────────────────────────────────

const OPERATORS: MobileOperator[] = [
  { id: 'JIO', name: 'Reliance Jio', shortName: 'Jio', icon: '🔵', logoColor: '#0066CC', circles: ['All India'] },
  { id: 'AIRTEL', name: 'Bharti Airtel', shortName: 'Airtel', icon: '🔴', logoColor: '#E40000', circles: ['All India'] },
  { id: 'VI', name: 'Vi (Vodafone Idea)', shortName: 'Vi', icon: '🟣', logoColor: '#EE0066', circles: ['All India'] },
  { id: 'BSNL', name: 'BSNL', shortName: 'BSNL', icon: '🟢', logoColor: '#1B6CA8', circles: ['All India'] },
  { id: 'MTNL', name: 'MTNL', shortName: 'MTNL', icon: '⚫', logoColor: '#333333', circles: ['Mumbai', 'Delhi'] },
];

// ── Static plans per operator ─────────────────────────────────────────────────

const JIO_PLANS: RechargePlan[] = [
  { id: 'JIO-239', operatorId: 'JIO', category: 'POPULAR', price: 239, validity: '28 days', data: '1.5 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Standard daily data pack with unlimited calling', isBestSeller: true },
  { id: 'JIO-299', operatorId: 'JIO', category: 'UNLIMITED', price: 299, validity: '28 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Extra data for heavy users', isRecommended: true },
  { id: 'JIO-479', operatorId: 'JIO', category: 'DATA', price: 479, validity: '56 days', data: '1.5 GB/day', calls: 'Unlimited', sms: '100/day', description: '2-month pack — great value for roaming' },
  { id: 'JIO-719', operatorId: 'JIO', category: 'VALIDITY', price: 719, validity: '84 days', data: '1.5 GB/day', calls: 'Unlimited', sms: '100/day', description: '3-month plan with steady data' },
  { id: 'JIO-2879', operatorId: 'JIO', category: 'VALIDITY', price: 2879, validity: '365 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Annual plan — best per-day value' },
  { id: 'JIO-19', operatorId: 'JIO', category: 'TOPUP', price: 19, validity: 'No expiry top-up', data: 'None', calls: '0.5p/sec post limit', sms: 'None', description: 'Low balance top-up' },
];

const AIRTEL_PLANS: RechargePlan[] = [
  { id: 'AIRTEL-249', operatorId: 'AIRTEL', category: 'POPULAR', price: 249, validity: '28 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Airtel Wynk + HelloTunes included', isBestSeller: true },
  { id: 'AIRTEL-299', operatorId: 'AIRTEL', category: 'UNLIMITED', price: 299, validity: '28 days', data: '3 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Max data with Airtel XStream', isRecommended: true },
  { id: 'AIRTEL-479', operatorId: 'AIRTEL', category: 'DATA', price: 479, validity: '56 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', description: '2-month pack with OTT benefits' },
  { id: 'AIRTEL-839', operatorId: 'AIRTEL', category: 'VALIDITY', price: 839, validity: '84 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Quarterly plan' },
  { id: 'AIRTEL-3599', operatorId: 'AIRTEL', category: 'VALIDITY', price: 3599, validity: '365 days', data: '2.5 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Annual plan + Amazon Prime' },
];

const VI_PLANS: RechargePlan[] = [
  { id: 'VI-239', operatorId: 'VI', category: 'POPULAR', price: 239, validity: '28 days', data: '1.5 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Vi Movies & TV included', isBestSeller: true },
  { id: 'VI-299', operatorId: 'VI', category: 'UNLIMITED', price: 299, validity: '28 days', data: '2.5 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Weekend Data Rollover benefit', isRecommended: true },
  { id: 'VI-479', operatorId: 'VI', category: 'DATA', price: 479, validity: '56 days', data: '1.5 GB/day', calls: 'Unlimited', sms: '100/day', description: '2-month pack' },
  { id: 'VI-719', operatorId: 'VI', category: 'VALIDITY', price: 719, validity: '84 days', data: '1.5 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Quarterly plan' },
];

const BSNL_PLANS: RechargePlan[] = [
  { id: 'BSNL-197', operatorId: 'BSNL', category: 'POPULAR', price: 197, validity: '26 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', description: 'BSNL STV 197 daily data pack', isBestSeller: true },
  { id: 'BSNL-247', operatorId: 'BSNL', category: 'UNLIMITED', price: 247, validity: '30 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Monthly all-in-one pack', isRecommended: true },
  { id: 'BSNL-666', operatorId: 'BSNL', category: 'VALIDITY', price: 666, validity: '90 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', description: 'Quarterly plan' },
];

const MTNL_PLANS: RechargePlan[] = [
  { id: 'MTNL-199', operatorId: 'MTNL', category: 'POPULAR', price: 199, validity: '28 days', data: '1 GB/day', calls: 'Unlimited local + STD', sms: '100/day', description: 'Mumbai/Delhi pack', isBestSeller: true },
];

const PLANS_CATALOGUE: Record<string, RechargePlan[]> = {
  JIO: JIO_PLANS,
  AIRTEL: AIRTEL_PLANS,
  VI: VI_PLANS,
  BSNL: BSNL_PLANS,
  MTNL: MTNL_PLANS,
};

// ── Operator detection by mobile prefix ──────────────────────────────────────

const OPERATOR_PREFIXES: Record<string, string> = {
  '6': 'JIO', '7': 'AIRTEL', '8': 'AIRTEL', '9': 'AIRTEL',
  '63': 'JIO', '64': 'JIO', '65': 'JIO', '66': 'JIO', '67': 'JIO', '68': 'JIO', '69': 'JIO',
  '70': 'BSNL', '71': 'BSNL', '72': 'VI', '73': 'VI', '74': 'VI',
  '75': 'AIRTEL', '76': 'AIRTEL', '77': 'VI', '78': 'AIRTEL', '79': 'AIRTEL',
  '80': 'VI', '81': 'AIRTEL', '82': 'AIRTEL', '83': 'VI', '84': 'VI',
  '85': 'AIRTEL', '86': 'AIRTEL', '87': 'BSNL', '88': 'AIRTEL', '89': 'VI',
  '90': 'AIRTEL', '91': 'AIRTEL', '92': 'AIRTEL', '93': 'AIRTEL', '94': 'AIRTEL',
  '95': 'AIRTEL', '96': 'JIO', '97': 'AIRTEL', '98': 'AIRTEL', '99': 'AIRTEL',
};

function detectOperator(mobile: string): string | null {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length < 2) return null;
  const prefix2 = digits.slice(0, 2);
  const prefix1 = digits.slice(0, 1);
  return OPERATOR_PREFIXES[prefix2] || OPERATOR_PREFIXES[prefix1] || null;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const rechargeService = {
  getOperators(): MobileOperator[] {
    return OPERATORS;
  },

  detectOperator(mobile: string): MobileOperator | null {
    const id = detectOperator(mobile);
    return id ? (OPERATORS.find(o => o.id === id) ?? null) : null;
  },

  async getPlans(operatorId: string): Promise<RechargePlan[]> {
    try {
      const resp = await api.get<RechargePlan[]>(`/v1/recharge/plans?operatorId=${operatorId}`);
      if (resp.data && resp.data.length > 0) return resp.data;
    } catch {
      // fallthrough
    }
    return PLANS_CATALOGUE[operatorId] ?? [];
  },

  async initiateRecharge(req: RechargeRequest): Promise<RechargeResponse> {
    try {
      const resp = await api.post<RechargeResponse>('/v1/recharge/initiate', req);
      if (resp.data?.transactionId) return resp.data;
    } catch {
      // fallthrough
    }
    // Fallback: generate UPI intent locally
    const tr = `MANA-RCH-${Date.now()}`;
    const pa = 'recharge@manapay';
    const pn = encodeURIComponent(`${req.operatorId} Recharge`);
    const plan = PLANS_CATALOGUE[req.operatorId]?.find(p => p.id === req.planId);
    return {
      transactionId: tr,
      status: 'PENDING',
      upiIntentUrl: `upi://pay?pa=${pa}&pn=${pn}&am=${req.amount.toFixed(2)}&cu=INR&tr=${tr}&tn=Mobile+Recharge`,
      phonePeUrl: `phonepe://pay?pa=${pa}&pn=${pn}&am=${req.amount.toFixed(2)}&cu=INR&tr=${tr}`,
      amount: req.amount,
      mobileNumber: req.mobileNumber,
      operatorId: req.operatorId,
      planDescription: plan?.description ?? `₹${req.amount} recharge`,
    };
  },
};
