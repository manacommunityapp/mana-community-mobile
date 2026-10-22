const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export interface FDProduct {
  id: string;
  bank: string;
  bank_icon: string;
  category: 'BANK' | 'NBFC' | 'POST_OFFICE';
  interest_rate: number;
  senior_rate: number;
  min_amount: number;
  max_amount: number;
  tenures: { label: string; months: number; rate: number }[];
  is_tax_saver: boolean;
  rating: string;
}

export interface FDBooking {
  id: string;
  product_id: string;
  bank: string;
  principal: number;
  interest_rate: number;
  tenure_months: number;
  tenure_label: string;
  maturity_amount: number;
  interest_earned: number;
  start_date: string;
  maturity_date: string;
  status: 'ACTIVE' | 'MATURED' | 'PREMATURE_CLOSED';
  fd_number: string;
}

export interface FDBookResult {
  fd_number: string;
  upi_intent_url: string;
  phone_pe_url: string;
  transaction_ref: string;
  principal: number;
  maturity_amount: number;
  maturity_date: string;
}

// ── Fallback Data ────────────────────────────────────────────────────────────

const FD_PRODUCTS: FDProduct[] = [
  {
    id: 'fd-sbi', bank: 'SBI – State Bank of India', bank_icon: '🏦', category: 'BANK',
    interest_rate: 6.80, senior_rate: 7.30, min_amount: 1000, max_amount: 10000000,
    tenures: [
      { label: '7-45 days', months: 1, rate: 3.50 }, { label: '6 months', months: 6, rate: 5.75 },
      { label: '1 year', months: 12, rate: 6.80 }, { label: '2 years', months: 24, rate: 7.00 },
      { label: '3 years', months: 36, rate: 6.75 }, { label: '5 years (Tax Saver)', months: 60, rate: 6.50 },
    ], is_tax_saver: true, rating: 'AAA',
  },
  {
    id: 'fd-hdfc', bank: 'HDFC Bank', bank_icon: '🏦', category: 'BANK',
    interest_rate: 7.10, senior_rate: 7.60, min_amount: 5000, max_amount: 10000000,
    tenures: [
      { label: '6 months', months: 6, rate: 6.00 }, { label: '1 year', months: 12, rate: 7.10 },
      { label: '18 months', months: 18, rate: 7.25 }, { label: '2 years', months: 24, rate: 7.00 },
      { label: '3 years', months: 36, rate: 7.00 }, { label: '5 years (Tax Saver)', months: 60, rate: 7.00 },
    ], is_tax_saver: true, rating: 'AAA',
  },
  {
    id: 'fd-bajaj', bank: 'Bajaj Finance FD', bank_icon: '💰', category: 'NBFC',
    interest_rate: 8.10, senior_rate: 8.35, min_amount: 15000, max_amount: 5000000,
    tenures: [
      { label: '12 months', months: 12, rate: 7.60 }, { label: '18 months', months: 18, rate: 7.80 },
      { label: '24 months', months: 24, rate: 8.10 }, { label: '36 months', months: 36, rate: 8.05 },
      { label: '42 months', months: 42, rate: 8.10 }, { label: '44 months', months: 44, rate: 8.10 },
    ], is_tax_saver: false, rating: 'AAA',
  },
  {
    id: 'fd-icici', bank: 'ICICI Bank', bank_icon: '🏦', category: 'BANK',
    interest_rate: 7.10, senior_rate: 7.60, min_amount: 10000, max_amount: 10000000,
    tenures: [
      { label: '6 months', months: 6, rate: 6.00 }, { label: '1 year', months: 12, rate: 7.10 },
      { label: '15 months', months: 15, rate: 7.25 }, { label: '2 years', months: 24, rate: 7.00 },
      { label: '5 years (Tax Saver)', months: 60, rate: 7.00 },
    ], is_tax_saver: true, rating: 'AAA',
  },
  {
    id: 'fd-post', bank: 'India Post Office FD', bank_icon: '📮', category: 'POST_OFFICE',
    interest_rate: 7.50, senior_rate: 7.50, min_amount: 1000, max_amount: 0,
    tenures: [
      { label: '1 year', months: 12, rate: 6.90 }, { label: '2 years', months: 24, rate: 7.00 },
      { label: '3 years', months: 36, rate: 7.10 }, { label: '5 years (Tax Saver)', months: 60, rate: 7.50 },
    ], is_tax_saver: true, rating: 'Sovereign',
  },
  {
    id: 'fd-shriram', bank: 'Shriram Finance FD', bank_icon: '💼', category: 'NBFC',
    interest_rate: 8.35, senior_rate: 8.60, min_amount: 5000, max_amount: 5000000,
    tenures: [
      { label: '12 months', months: 12, rate: 8.00 }, { label: '24 months', months: 24, rate: 8.10 },
      { label: '36 months', months: 36, rate: 8.20 }, { label: '48 months', months: 48, rate: 8.35 },
      { label: '60 months', months: 60, rate: 8.35 },
    ], is_tax_saver: false, rating: 'AA+',
  },
];

const MY_FDS: FDBooking[] = [
  {
    id: 'mfd1', product_id: 'fd-bajaj', bank: 'Bajaj Finance FD', principal: 50000,
    interest_rate: 8.10, tenure_months: 24, tenure_label: '24 months',
    maturity_amount: 58765, interest_earned: 8765,
    start_date: '2024-01-15', maturity_date: '2026-01-15',
    status: 'ACTIVE', fd_number: 'BAJAJ-FD-240115001',
  },
];

function calcMaturity(principal: number, ratePercent: number, months: number): number {
  const r = ratePercent / 100 / 4;
  const n = months / 3;
  return Math.round(principal * Math.pow(1 + r, n));
}

// ── Service ──────────────────────────────────────────────────────────────────

export const fdService = {
  async getProducts(): Promise<FDProduct[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/fd/products`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d) && d.length > 0) return d; }
    } catch {}
    return FD_PRODUCTS;
  },

  async getMyFDs(): Promise<FDBooking[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/fd/my-fds`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
    } catch {}
    return MY_FDS;
  },

  async book(payload: { product_id: string; principal: number; tenure_months: number; rate: number }): Promise<FDBookResult> {
    try {
      const r = await fetch(`${API_BASE}/v1/fd/book`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) { const d = await r.json(); if (d?.fd_number) return d; }
    } catch {}
    const fdNo = `MANA-FD-${Date.now()}`;
    const tr = `MANA-FD-${Date.now()}`;
    const maturity = calcMaturity(payload.principal, payload.rate, payload.tenure_months);
    const md = new Date(); md.setMonth(md.getMonth() + payload.tenure_months);
    return {
      fd_number: fdNo,
      upi_intent_url: `upi://pay?pa=fd@setu&pn=Mana+FD&am=${payload.principal}&cu=INR&tr=${tr}&tn=Fixed+Deposit+${fdNo}`,
      phone_pe_url: `phonepe://pay?pa=fd@setu&pn=Mana+FD&am=${payload.principal}&cu=INR&tr=${tr}`,
      transaction_ref: tr,
      principal: payload.principal,
      maturity_amount: maturity,
      maturity_date: md.toISOString().split('T')[0],
    };
  },

  calcMaturity,
};
