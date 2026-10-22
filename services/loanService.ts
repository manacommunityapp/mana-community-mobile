const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export interface LoanOffer {
  id: string;
  lender: string;
  lender_icon: string;
  type: 'PERSONAL' | 'HOME' | 'VEHICLE' | 'EDUCATION' | 'GOLD';
  min_amount: number;
  max_amount: number;
  interest_rate_min: number;
  interest_rate_max: number;
  max_tenure_months: number;
  processing_fee_pct: number;
  disbursal_time: string;
  features: string[];
  pre_approved?: boolean;
}

export interface LoanApplication {
  id: string;
  offer_id: string;
  lender: string;
  type: string;
  amount: number;
  interest_rate: number;
  tenure_months: number;
  emi: number;
  total_payable: number;
  disbursed_date: string;
  next_emi_date: string;
  emis_paid: number;
  emis_total: number;
  outstanding: number;
  status: 'ACTIVE' | 'CLOSED' | 'PENDING';
  loan_account: string;
}

export interface LoanApplyResult {
  application_id: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED';
  message: string;
  upi_intent_url?: string;
  phone_pe_url?: string;
  emi: number;
  total_payable: number;
}

// ── Fallback Data ────────────────────────────────────────────────────────────

const LOAN_OFFERS: LoanOffer[] = [
  {
    id: 'loan-phonepe-credit', lender: 'PhonePe Credit (NBFC)', lender_icon: '⚡', type: 'PERSONAL',
    min_amount: 1000, max_amount: 500000, interest_rate_min: 10.99, interest_rate_max: 23.99,
    max_tenure_months: 24, processing_fee_pct: 1.0, disbursal_time: 'Instant',
    features: ['Instant approval', 'No collateral', 'Flexible repayment'], pre_approved: true,
  },
  {
    id: 'loan-bajaj', lender: 'Bajaj Finserv Personal Loan', lender_icon: '💰', type: 'PERSONAL',
    min_amount: 20000, max_amount: 5000000, interest_rate_min: 11.00, interest_rate_max: 26.00,
    max_tenure_months: 84, processing_fee_pct: 2.0, disbursal_time: '24 hours',
    features: ['High loan amount', 'Long tenure', 'Pre-approved offers'],
  },
  {
    id: 'loan-hdfc', lender: 'HDFC Bank Personal Loan', lender_icon: '🏦', type: 'PERSONAL',
    min_amount: 50000, max_amount: 4000000, interest_rate_min: 10.50, interest_rate_max: 24.00,
    max_tenure_months: 60, processing_fee_pct: 2.5, disbursal_time: '4 hours',
    features: ['Competitive rates', 'No hidden charges', 'Online process'],
  },
  {
    id: 'loan-icici', lender: 'ICICI Bank Personal Loan', lender_icon: '🏦', type: 'PERSONAL',
    min_amount: 50000, max_amount: 5000000, interest_rate_min: 10.85, interest_rate_max: 19.00,
    max_tenure_months: 72, processing_fee_pct: 1.5, disbursal_time: '3 seconds (pre-approved)',
    features: ['Instant disbursal', '3-second approval', 'Minimal docs'],
  },
  {
    id: 'loan-kreditbee', lender: 'KreditBee – Instant Credit', lender_icon: '🐝', type: 'PERSONAL',
    min_amount: 1000, max_amount: 300000, interest_rate_min: 15.00, interest_rate_max: 29.95,
    max_tenure_months: 15, processing_fee_pct: 2.0, disbursal_time: '10 minutes',
    features: ['No credit history needed', 'Small ticket loans', 'Quick disbursal'],
  },
  {
    id: 'loan-stashfin', lender: 'StashFin Credit Line', lender_icon: '💳', type: 'PERSONAL',
    min_amount: 1000, max_amount: 500000, interest_rate_min: 11.99, interest_rate_max: 59.99,
    max_tenure_months: 36, processing_fee_pct: 2.0, disbursal_time: 'Instant',
    features: ['Revolving credit line', 'Pay for what you use', 'Reusable limit'],
  },
];

const MY_LOANS: LoanApplication[] = [
  {
    id: 'loan-app-1', offer_id: 'loan-bajaj', lender: 'Bajaj Finserv', type: 'PERSONAL',
    amount: 200000, interest_rate: 13.5, tenure_months: 24, emi: 9587,
    total_payable: 230088, disbursed_date: '2024-06-01', next_emi_date: '2025-11-01',
    emis_paid: 17, emis_total: 24, outstanding: 28548,
    status: 'ACTIVE', loan_account: 'BF-PL-2024-001234',
  },
];

function calcEMI(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 100 / 12;
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

// ── Service ──────────────────────────────────────────────────────────────────

export const loanService = {
  async getOffers(type?: LoanOffer['type']): Promise<LoanOffer[]> {
    try {
      const url = type ? `${API_BASE}/v1/loans/offers?type=${type}` : `${API_BASE}/v1/loans/offers`;
      const r = await fetch(url);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d) && d.length > 0) return d; }
    } catch {}
    return type ? LOAN_OFFERS.filter(o => o.type === type) : LOAN_OFFERS;
  },

  async getMyLoans(): Promise<LoanApplication[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/loans/my-loans`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
    } catch {}
    return MY_LOANS;
  },

  async apply(payload: { offer_id: string; amount: number; tenure_months: number; rate: number }): Promise<LoanApplyResult> {
    try {
      const r = await fetch(`${API_BASE}/v1/loans/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) { const d = await r.json(); if (d?.application_id) return d; }
    } catch {}
    const appId = `MANA-LOAN-${Date.now()}`;
    const emi = calcEMI(payload.amount, payload.rate, payload.tenure_months);
    return {
      application_id: appId,
      status: 'PENDING_VERIFICATION',
      message: 'Application submitted! Our team will verify details and disburse within 24 hours.',
      emi,
      total_payable: emi * payload.tenure_months,
    };
  },

  calcEMI,
};
