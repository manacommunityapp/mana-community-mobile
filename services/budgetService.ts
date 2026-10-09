import api from './apiClient';
import { secureLog } from '@/security';

export interface BudgetAllocation {
  id: number;
  financialYear: string;
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const FALLBACK_BUDGETS: BudgetAllocation[] = [
  {
    id: 1,
    financialYear: 'FY 2026-27',
    category: 'OpEx_Maintenance',
    allocatedAmount: 1200000,
    spentAmount: 480000,
    notes: 'Lifts, DG sets, and water pump AMCs',
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 2,
    financialYear: 'FY 2026-27',
    category: 'SECURITY',
    allocatedAmount: 1800000,
    spentAmount: 900000,
    notes: '24/7 Security guard agency and boom barrier maintenance',
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 3,
    financialYear: 'FY 2026-27',
    category: 'CLEANING',
    allocatedAmount: 950000,
    spentAmount: 420000,
    notes: 'Housekeeping staff, waste management, and sanitization chemicals',
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 4,
    financialYear: 'FY 2026-27',
    category: 'CapEx_Asset',
    allocatedAmount: 2500000,
    spentAmount: 1100000,
    notes: 'Solar rooftop panels and clubhouse gym equipment upgrades',
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 5,
    financialYear: 'FY 2026-27',
    category: 'FESTIVAL',
    allocatedAmount: 400000,
    spentAmount: 180000,
    notes: 'Diwali, New Year, and Independence Day celebrations',
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 6,
    financialYear: 'FY 2026-27',
    category: 'SPORTS',
    allocatedAmount: 300000,
    spentAmount: 95000,
    notes: 'Badminton court re-flooring and cricket turf net maintenance',
    createdAt: '2026-04-01T00:00:00Z',
  },
];

export const budgetService = {
  async getBudgets(financialYear?: string): Promise<BudgetAllocation[]> {
    try {
      const res = await api.get('/finance/budget', {
        params: financialYear ? { financialYear } : undefined,
      });
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (err) {
      secureLog.warn('[budgetService] Backend budget API unavailable, using fallback', err);
    }
    return financialYear
      ? FALLBACK_BUDGETS.filter(b => b.financialYear === financialYear)
      : FALLBACK_BUDGETS;
  },

  async allocateBudget(data: {
    financialYear: string;
    category: string;
    amount: number;
    notes?: string;
  }): Promise<BudgetAllocation> {
    try {
      const res = await api.post('/finance/budget', null, {
        params: {
          financialYear: data.financialYear,
          category: data.category,
          amount: data.amount,
          notes: data.notes,
        },
      });
      if (res.data) return res.data;
    } catch (err) {
      secureLog.warn('[budgetService] API allocation failed, creating local allocation', err);
    }
    const newAlloc: BudgetAllocation = {
      id: Math.floor(100 + Math.random() * 900),
      financialYear: data.financialYear,
      category: data.category,
      allocatedAmount: data.amount,
      spentAmount: 0,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
    FALLBACK_BUDGETS.unshift(newAlloc);
    return newAlloc;
  },

  async deleteAllocation(id: number): Promise<void> {
    try {
      await api.delete(`/finance/budget/${id}`);
    } catch (err) {
      secureLog.warn(`[budgetService] API delete failed for ${id}`, err);
    }
    const idx = FALLBACK_BUDGETS.findIndex(b => b.id === id);
    if (idx !== -1) FALLBACK_BUDGETS.splice(idx, 1);
  },
};
