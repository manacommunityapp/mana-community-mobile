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
    const resp = await api.get<RechargePlan[]>(`/v1/recharge/plans?operatorId=${encodeURIComponent(operatorId)}`);
    return resp.data ?? [];
  },

  async initiateRecharge(req: RechargeRequest): Promise<RechargeResponse> {
    const resp = await api.post<RechargeResponse>('/v1/recharge/initiate', req);
    return resp.data;
  },
};
