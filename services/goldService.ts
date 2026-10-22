const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export interface GoldPrice {
  per_gram_22k: number;
  per_gram_24k: number;
  change_pct_24h: number;
  updated_at: string;
}

export interface GoldHolding {
  id: string;
  grams: number;
  purity: '22K' | '24K';
  avg_buy_price: number;
  current_value: number;
  unrealised_pnl: number;
  unrealised_pnl_pct: number;
}

export interface GoldTransaction {
  id: string;
  type: 'BUY' | 'SELL';
  grams: number;
  price_per_gram: number;
  amount: number;
  purity: '22K' | '24K';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  created_at: string;
  upi_ref?: string;
}

export interface GoldBuyResult {
  upi_intent_url: string;
  phone_pe_url: string;
  transaction_ref: string;
  grams: number;
  amount: number;
}

const FALLBACK_PRICE: GoldPrice = {
  per_gram_22k: 6850,
  per_gram_24k: 7450,
  change_pct_24h: 0.42,
  updated_at: new Date().toISOString(),
};

const FALLBACK_HOLDING: GoldHolding = {
  id: 'holding-1',
  grams: 2.5,
  purity: '24K',
  avg_buy_price: 7100,
  current_value: 7450 * 2.5,
  unrealised_pnl: (7450 - 7100) * 2.5,
  unrealised_pnl_pct: ((7450 - 7100) / 7100) * 100,
};

const FALLBACK_HISTORY: GoldTransaction[] = [
  { id: 'gt-1', type: 'BUY', grams: 1.5, price_per_gram: 7200, amount: 10800, purity: '24K', status: 'COMPLETED', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'gt-2', type: 'BUY', grams: 1.0, price_per_gram: 6950, amount: 6950, purity: '24K', status: 'COMPLETED', created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
];

export const goldService = {
  async getPrice(): Promise<GoldPrice> {
    try {
      const r = await fetch(`${API_BASE}/v1/gold/price`);
      if (r.ok) { const d = await r.json(); if (d?.per_gram_24k) return d; }
    } catch {}
    return FALLBACK_PRICE;
  },

  async getHoldings(): Promise<GoldHolding[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/gold/holdings`, { headers: { 'Content-Type': 'application/json' } });
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
    } catch {}
    return [FALLBACK_HOLDING];
  },

  async getHistory(): Promise<GoldTransaction[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/gold/transactions`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
    } catch {}
    return FALLBACK_HISTORY;
  },

  async buy(amountInr: number, purity: '22K' | '24K'): Promise<GoldBuyResult> {
    try {
      const r = await fetch(`${API_BASE}/v1/gold/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_inr: amountInr, purity }),
      });
      if (r.ok) { const d = await r.json(); if (d?.upi_intent_url) return d; }
    } catch {}
    const price = purity === '24K' ? FALLBACK_PRICE.per_gram_24k : FALLBACK_PRICE.per_gram_22k;
    const grams = amountInr / price;
    const tr = `MANA-GOLD-${Date.now()}`;
    return {
      upi_intent_url: `upi://pay?pa=gold@setu&pn=Mana+Digital+Gold&am=${amountInr.toFixed(2)}&cu=INR&tr=${tr}&tn=Digital+Gold+Purchase`,
      phone_pe_url: `phonepe://pay?pa=gold@setu&pn=Mana+Digital+Gold&am=${amountInr.toFixed(2)}&cu=INR&tr=${tr}`,
      transaction_ref: tr,
      grams: Math.round(grams * 1000) / 1000,
      amount: amountInr,
    };
  },

  async sell(grams: number, purity: '22K' | '24K'): Promise<{ transaction_ref: string; amount: number }> {
    try {
      const r = await fetch(`${API_BASE}/v1/gold/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grams, purity }),
      });
      if (r.ok) { const d = await r.json(); if (d?.transaction_ref) return d; }
    } catch {}
    const price = purity === '24K' ? FALLBACK_PRICE.per_gram_24k : FALLBACK_PRICE.per_gram_22k;
    return { transaction_ref: `MANA-GOLD-SELL-${Date.now()}`, amount: Math.round(grams * price) };
  },
};
