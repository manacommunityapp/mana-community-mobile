const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export type FundCategory = 'ELSS' | 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP' | 'INDEX' | 'LIQUID' | 'HYBRID';

export interface MutualFund {
  id: string;
  name: string;
  short_name: string;
  category: FundCategory;
  amc: string;
  nav: number;
  nav_change_pct: number;
  returns_1y: number;
  returns_3y: number;
  returns_5y: number;
  risk: 'LOW' | 'MODERATE' | 'HIGH';
  min_sip: number;
  min_lumpsum: number;
  rating: number;
}

export interface SipMandate {
  id: string;
  fund_id: string;
  fund_name: string;
  amount: number;
  sip_date: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  next_installment: string;
  total_invested: number;
  current_value: number;
}

export interface MFHolding {
  fund_id: string;
  fund_name: string;
  units: number;
  avg_nav: number;
  current_nav: number;
  invested_amount: number;
  current_value: number;
  pnl: number;
  pnl_pct: number;
}

export interface InvestResult {
  upi_intent_url: string;
  phone_pe_url: string;
  transaction_ref: string;
  units: number;
  amount: number;
}

const FALLBACK_FUNDS: MutualFund[] = [
  { id: 'HDFC_ELSS', name: 'HDFC Tax Saver Fund – Direct Growth', short_name: 'HDFC Tax Saver', category: 'ELSS', amc: 'HDFC AMC', nav: 1024.50, nav_change_pct: 0.82, returns_1y: 22.4, returns_3y: 18.6, returns_5y: 16.2, risk: 'HIGH', min_sip: 500, min_lumpsum: 500, rating: 5 },
  { id: 'AXIS_BLUECHIP', name: 'Axis Bluechip Fund – Direct Growth', short_name: 'Axis Bluechip', category: 'LARGE_CAP', amc: 'Axis AMC', nav: 63.18, nav_change_pct: 0.54, returns_1y: 18.2, returns_3y: 15.8, returns_5y: 14.1, risk: 'MODERATE', min_sip: 500, min_lumpsum: 1000, rating: 4 },
  { id: 'MIRAE_MIDCAP', name: 'Mirae Asset Midcap Fund – Direct Growth', short_name: 'Mirae Midcap', category: 'MID_CAP', amc: 'Mirae AMC', nav: 38.47, nav_change_pct: 1.12, returns_1y: 28.6, returns_3y: 22.1, returns_5y: 19.4, risk: 'HIGH', min_sip: 1000, min_lumpsum: 5000, rating: 5 },
  { id: 'NIFTY50_INDEX', name: 'UTI Nifty 50 Index Fund – Direct Growth', short_name: 'UTI Nifty 50', category: 'INDEX', amc: 'UTI AMC', nav: 148.22, nav_change_pct: 0.46, returns_1y: 17.8, returns_3y: 15.2, returns_5y: 13.8, risk: 'MODERATE', min_sip: 500, min_lumpsum: 1000, rating: 4 },
  { id: 'LIQUID_HDFC', name: 'HDFC Liquid Fund – Direct Growth', short_name: 'HDFC Liquid', category: 'LIQUID', amc: 'HDFC AMC', nav: 4921.80, nav_change_pct: 0.02, returns_1y: 7.2, returns_3y: 6.8, returns_5y: 6.4, risk: 'LOW', min_sip: 1000, min_lumpsum: 5000, rating: 4 },
  { id: 'ICICI_HYBRID', name: 'ICICI Pru Balanced Advantage – Direct Growth', short_name: 'ICICI Balanced', category: 'HYBRID', amc: 'ICICI AMC', nav: 58.94, nav_change_pct: 0.38, returns_1y: 16.4, returns_3y: 14.2, returns_5y: 12.6, risk: 'MODERATE', min_sip: 1000, min_lumpsum: 5000, rating: 4 },
];

const FALLBACK_HOLDINGS: MFHolding[] = [
  { fund_id: 'AXIS_BLUECHIP', fund_name: 'Axis Bluechip Fund', units: 47.82, avg_nav: 58.20, current_nav: 63.18, invested_amount: 2783, current_value: 3021.86, pnl: 238.86, pnl_pct: 8.58 },
];

const FALLBACK_SIPS: SipMandate[] = [
  { id: 'sip-1', fund_id: 'AXIS_BLUECHIP', fund_name: 'Axis Bluechip Fund', amount: 2000, sip_date: 5, status: 'ACTIVE', next_installment: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split('T')[0], total_invested: 24000, current_value: 28400 },
];

export const mutualFundService = {
  async getFunds(category?: FundCategory): Promise<MutualFund[]> {
    try {
      const url = category ? `${API_BASE}/v1/mf/funds?category=${category}` : `${API_BASE}/v1/mf/funds`;
      const r = await fetch(url);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d) && d.length > 0) return d; }
    } catch {}
    return category ? FALLBACK_FUNDS.filter(f => f.category === category) : FALLBACK_FUNDS;
  },

  async getHoldings(): Promise<MFHolding[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/mf/holdings`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
    } catch {}
    return FALLBACK_HOLDINGS;
  },

  async getSips(): Promise<SipMandate[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/mf/sips`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
    } catch {}
    return FALLBACK_SIPS;
  },

  async invest(fundId: string, amount: number, type: 'SIP' | 'LUMPSUM', sipDate?: number): Promise<InvestResult> {
    try {
      const r = await fetch(`${API_BASE}/v1/mf/invest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fund_id: fundId, amount, type, sip_date: sipDate }),
      });
      if (r.ok) { const d = await r.json(); if (d?.upi_intent_url) return d; }
    } catch {}
    const fund = FALLBACK_FUNDS.find(f => f.id === fundId);
    const units = fund ? Math.round((amount / fund.nav) * 1000) / 1000 : 0;
    const tr = `MANA-MF-${Date.now()}`;
    return {
      upi_intent_url: `upi://pay?pa=mf@setu&pn=Mana+MF+${type}&am=${amount}&cu=INR&tr=${tr}&tn=Mutual+Fund+${type}`,
      phone_pe_url: `phonepe://pay?pa=mf@setu&pn=Mana+MF&am=${amount}&cu=INR&tr=${tr}`,
      transaction_ref: tr,
      units,
      amount,
    };
  },

  async pauseSip(sipId: string): Promise<void> {
    try { await fetch(`${API_BASE}/v1/mf/sips/${sipId}/pause`, { method: 'POST' }); } catch {}
  },

  async cancelSip(sipId: string): Promise<void> {
    try { await fetch(`${API_BASE}/v1/mf/sips/${sipId}/cancel`, { method: 'DELETE' }); } catch {}
  },
};
