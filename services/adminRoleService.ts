import api from './apiClient';
import { secureLog } from '@/security';

export type ApprovalType = 'MEMBER' | 'VENDOR' | 'POST' | 'EVENT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SecurityAlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type GovernanceItemType = 'RULE' | 'POLICY' | 'BYLAW' | 'RESOLUTION';
export type GovernanceStatus = 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'ARCHIVED';

export interface AdminApproval {
  id: number;
  type: ApprovalType;
  title: string;
  submittedBy: string;
  flat: string;
  submittedAt: string;
  status: ApprovalStatus;
  details: string;
}

export interface FinanceEntry {
  id: number;
  category: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'OVERDUE';
}

export interface SecurityAlert {
  id: number;
  title: string;
  description: string;
  level: SecurityAlertLevel;
  location: string;
  reportedAt: string;
  resolved: boolean;
  assignedGuard?: string;
}

export interface GovernanceItem {
  id: number;
  type: GovernanceItemType;
  title: string;
  description: string;
  status: GovernanceStatus;
  effectiveDate: string;
  lastUpdated: string;
  author: string;
}

export interface AdminDashboardStats {
  totalResidents: number;
  pendingApprovals: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  activeAlerts: number;
  occupancyRate: number;
  openTickets: number;
  totalUnits: number;

  // 10-point Community Admin Dashboard parity fields
  ownerCount?: number;
  tenantCount?: number;
  residentCount?: number;
  maintenanceCollectedThisMonthAmount?: number;
  outstandingInvoiceCount?: number;
  outstandingDuesAmount?: number;
  activeVisitorsCount?: number;
  expectedVisitorsTodayCount?: number;
  slaBreachedTicketsCount?: number;
  eventAttendanceCount?: number;
  facilityUtilizationPercent?: number;
  monthlyFacilityBookingsCount?: number;
  activeVendorContractsCount?: number;
  contractsExpiringWithin30DaysCount?: number;
  currentFinancialYearBudgetAmount?: number;
  currentFinancialYearSpentAmount?: number;
  communityPostsLast30DaysCount?: number;
}

export interface AnalyticsData {
  monthlyRevenue: number[];
  monthlyExpenses: number[];
  monthLabels: string[];
  occupancyTrend: number[];
  ticketsByCategory: { category: string; count: number }[];
  memberGrowth: { month: string; count: number }[];
}

// ── Backend response types ──────────────────────────────────────





interface AdminMemberResponse {
  id: number;
  name?: string;
  fullName?: string;
  email?: string;
  flatNumber?: string;
  status?: string;
  createdAt?: string;
  role?: string;
}

interface ReportResponse {
  id: number;
  targetType?: string;
  targetContent?: string;
  targetAuthor?: string;
  reason?: string;
  status?: string;
  createdAt?: string;
  reporter?: { name?: string; fullName?: string };
}

interface ExpenseResponse {
  id: number;
  title?: string;
  description?: string;
  amount: number;
  category?: string;
  status?: string;
  createdAt?: string;
}



interface BillingInvoiceResponse {
  id: number;
  description?: string;
  amount?: number;
  status?: string;
  dueDate?: string;
  createdAt?: string;
}

interface BudgetAllocation {
  id: number;
  category?: string;
  allocatedAmount?: number;
  spentAmount?: number;
  financialYear?: string;
  notes?: string;
}

interface VendorInvoiceResponse {
  id: number;
  invoiceNumber?: string;
  vendorName?: string;
  totalAmount?: number;
  status?: string;
  invoiceDate?: string;
  dueDate?: string;
}

interface FinanceInvoiceResponse {
  id: number;
  code?: string;
  status?: string;
  customerId?: number;
  customerName?: string;
  docDate?: string;
  dueDate?: string;
  subtotal?: number;
  grandTotal?: number;
  notes?: string;
}

interface FinanceReceiptResponse {
  id: number;
  code?: string;
  receiptType?: string;
  customerId?: number;
  customerName?: string;
  receiptDate?: string;
  amount?: number;
  paymentMode?: string;
  reference?: string;
  notes?: string;
}

interface FinancePurchaseResponse {
  id: number;
  code?: string;
  status?: string;
  vendorId?: number;
  vendorName?: string;
  docDate?: string;
  dueDate?: string;
  subtotal?: number;
  grandTotal?: number;
  notes?: string;
}

interface FinanceVendorPaymentResponse {
  id: number;
  code?: string;
  paymentType?: string;
  vendorId?: number;
  vendorName?: string;
  paymentDate?: string;
  amount?: number;
  paymentMode?: string;
  paidFrom?: string;
  reference?: string;
  status?: string;
  notes?: string;
}





// ── Service ─────────────────────────────────────────────────────

export const adminRoleService = {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    throw new Error('Admin dashboard metrics are not fully backed by live data yet.');
  },

  async getApprovals(): Promise<AdminApproval[]> {
    try {
      const [membersRes, reportsRes, vendorRes] = await Promise.all([
        api.get<{ content: AdminMemberResponse[] }>('/admin/members', {
          params: { page: 0, size: 50 },
        }),
        api.get<{ content: ReportResponse[] }>('/admin/reports', {
          params: { page: 0, size: 50 },
        }),
        api.get<any>('/vendor/registrations', {
          params: { page: 0, size: 20 },
        }),
      ]);

      const memberApprovals: AdminApproval[] = (membersRes?.data?.content || [])
        .filter(m => m.status === 'PENDING')
        .map(m => ({
          id: m.id,
          type: 'MEMBER' as ApprovalType,
          title: 'New Member Registration',
          submittedBy: m.fullName || m.name || m.email || '',
          flat: m.flatNumber || '',
          submittedAt: m.createdAt || '',
          status: 'PENDING' as ApprovalStatus,
          details: `${m.role || 'Resident'} registration for ${m.flatNumber || 'N/A'}.`,
        }));

      const approvedMembers: AdminApproval[] = (membersRes?.data?.content || [])
        .filter(m => m.status === 'APPROVED' || m.status === 'ACTIVE')
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          type: 'MEMBER' as ApprovalType,
          title: 'Member Registration',
          submittedBy: m.fullName || m.name || m.email || '',
          flat: m.flatNumber || '',
          submittedAt: m.createdAt || '',
          status: 'APPROVED' as ApprovalStatus,
          details: `${m.role || 'Resident'} at ${m.flatNumber || 'N/A'}.`,
        }));

      const reportApprovals: AdminApproval[] = (reportsRes?.data?.content || [])
        .map(r => ({
          id: r.id + 100000,
          type: 'POST' as ApprovalType,
          title: `Flagged ${r.targetType || 'Content'} Report`,
          submittedBy: r.reporter?.fullName || r.reporter?.name || 'Anonymous',
          flat: '',
          submittedAt: r.createdAt || '',
          status: mapReportStatus(r.status),
          details: `${r.reason || 'Reported content'}. Content: "${(r.targetContent || '').slice(0, 80)}..."`,
        }));

      const vendorContent = vendorRes?.data?.content || vendorRes?.data || [];
      const liveVendorApprovals: AdminApproval[] = Array.isArray(vendorContent) ? vendorContent.map((v: any) => ({
        id: (v.id || 0) + 200000,
        type: 'VENDOR' as ApprovalType,
        title: `${v.businessName || v.vendorName || 'Vendor'} Registration`,
        submittedBy: v.contactPerson || v.ownerName || 'Vendor Applicant',
        flat: 'Commercial',
        submittedAt: v.createdAt || new Date().toISOString(),
        status: (v.status === 'APPROVED' ? 'APPROVED' : v.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as ApprovalStatus,
        details: `${v.serviceCategory || 'Vendor Service'} registration. ${v.description || ''}`,
      })) : [];

      const combinedLive = [
        ...memberApprovals,
        ...liveVendorApprovals.filter(v => v.status === 'PENDING'),
        ...reportApprovals.filter(r => r.status === 'PENDING'),
        ...approvedMembers,
        ...liveVendorApprovals.filter(v => v.status !== 'PENDING'),
        ...reportApprovals.filter(r => r.status !== 'PENDING'),
      ];

      return combinedLive;
    } catch (err) {
      secureLog.warn('AdminRoleService: Live approvals API unavailable', err);
      throw err;
    }
  },

  async approveItem(id: number): Promise<void> {
    if (id >= 200000) {
      await api.put(`/vendor/registrations/${id - 200000}/approve`);
    } else if (id >= 100000) {
      await api.put(`/admin/reports/${id - 100000}/resolve`);
    } else {
      await api.put(`/admin/members/${id}/approve`);
    }
  },

  async rejectItem(id: number, reason?: string): Promise<void> {
    if (id >= 200000) {
      await api.put(`/vendor/registrations/${id - 200000}/reject`, null, {
        params: { reason: reason || 'Application rejected by community admin' },
      });
    } else if (id >= 100000) {
      await api.put(`/admin/reports/${id - 100000}/dismiss`);
    } else {
      await api.put(`/admin/members/${id}/reject`, reason ? { reason } : undefined);
    }
  },

  async getFinanceEntries(): Promise<FinanceEntry[]> {
    try {
      const [
        expensesRes,
        billingRes,
        vendorInvRes,
        financeInvoicesRes,
        receiptsRes,
        purchasesRes,
        vendorPaymentsRes,
        budgetRes,
      ] = await Promise.all([
        api.get<{ content: ExpenseResponse[] }>('/expenses', {
          params: { page: 0, size: 100 },
        }).catch(() => null),
        api.get<{ content: BillingInvoiceResponse[] }>('/billing/invoices', {
          params: { page: 0, size: 100 },
        }).catch(() => null),
        api.get<VendorInvoiceResponse[]>('/asset-finance/invoices').catch(() => null),
        api.get<FinanceInvoiceResponse[]>('/finance/invoices').catch(() => null),
        api.get<FinanceReceiptResponse[]>('/finance/receipts').catch(() => null),
        api.get<FinancePurchaseResponse[]>('/finance/purchases').catch(() => null),
        api.get<FinanceVendorPaymentResponse[]>('/finance/vendor-payments').catch(() => null),
        api.get<BudgetAllocation[]>('/finance/budget').catch(() => null),
      ]);

      const expenses: FinanceEntry[] = (expensesRes?.data?.content || []).map(e => ({
        id: e.id,
        category: formatCategory(e.category),
        description: e.title || e.description || '',
        amount: Number(e.amount) || 0,
        type: 'EXPENSE' as const,
        date: e.createdAt?.split('T')[0] || '',
        status: mapExpenseStatus(e.status),
      }));

      const billingIncome: FinanceEntry[] = (billingRes?.data?.content || []).map(inv => ({
        id: inv.id + 10000,
        category: 'Maintenance Dues',
        description: inv.description || 'Resident Billing',
        amount: Number(inv.amount) || 0,
        type: 'INCOME' as const,
        date: inv.createdAt?.split('T')[0] || inv.dueDate?.split('T')[0] || '',
        status: mapExpenseStatus(inv.status),
      }));

      const vendorExpenses: FinanceEntry[] = (vendorInvRes?.data || []).map(inv => ({
        id: inv.id + 20000,
        category: 'Vendor Payments',
        description: `${inv.vendorName || 'Vendor'} — ${inv.invoiceNumber || ''}`,
        amount: Number(inv.totalAmount) || 0,
        type: 'EXPENSE' as const,
        date: inv.invoiceDate?.split('T')[0] || '',
        status: mapVendorInvoiceStatus(inv.status),
      }));

      const financeInvoices: FinanceEntry[] = (financeInvoicesRes?.data || []).map(inv => ({
        id: inv.id + 30000,
        category: 'Invoice',
        description: `${inv.customerName || 'Resident'} — ${inv.code || 'INV'}`,
        amount: Number(inv.grandTotal ?? inv.subtotal ?? 0),
        type: 'INCOME' as const,
        date: inv.docDate || inv.dueDate || '',
        status: mapExpenseStatus(inv.status),
      }));

      const financeReceipts: FinanceEntry[] = (receiptsRes?.data || []).map(rcpt => ({
        id: rcpt.id + 40000,
        category: rcpt.receiptType === 'ADVANCE_RECEIPT' ? 'Advance Payment' : 'Receipt',
        description: `${rcpt.customerName || 'Resident'} — ${rcpt.code || 'RCPT'}${rcpt.paymentMode ? ` (${rcpt.paymentMode})` : ''}`,
        amount: Number(rcpt.amount) || 0,
        type: 'INCOME' as const,
        date: rcpt.receiptDate || '',
        status: 'COMPLETED' as const,
      }));

      const financePurchases: FinanceEntry[] = (purchasesRes?.data || []).map(p => ({
        id: p.id + 50000,
        category: 'Purchases',
        description: `${p.vendorName || 'Vendor'} — ${p.code || 'PO'}`,
        amount: Number(p.grandTotal ?? p.subtotal ?? 0),
        type: 'EXPENSE' as const,
        date: p.docDate || p.dueDate || '',
        status: mapExpenseStatus(p.status),
      }));

      const financeVendorPayments: FinanceEntry[] = (vendorPaymentsRes?.data || []).map(vp => ({
        id: vp.id + 60000,
        category: 'Vendor Payments',
        description: `${vp.vendorName || 'Vendor'} — ${vp.code || 'VPAY'}${vp.paymentMode ? ` (${vp.paymentMode})` : ''}`,
        amount: Number(vp.amount) || 0,
        type: 'EXPENSE' as const,
        date: vp.paymentDate || '',
        status: mapExpenseStatus(vp.status || 'PAID'),
      }));

      const allEntries = [
        ...financeReceipts,
        ...billingIncome,
        ...financeInvoices,
        ...expenses,
        ...financePurchases,
        ...financeVendorPayments,
        ...vendorExpenses,
      ];

      if (budgetRes?.data?.length) {
        const budgets = budgetRes.data;
        const totalBudget = budgets.reduce((s, b) => s + (b.allocatedAmount || 0), 0);
        const totalSpent = budgets.reduce((s, b) => s + (b.spentAmount || 0), 0);
        if (totalBudget > 0) {
          allEntries.unshift({
            id: 99999,
            category: 'Budget',
            description: `FY ${budgets[0]?.financialYear || ''} — ₹${(totalSpent / 1000).toFixed(0)}k of ₹${(totalBudget / 1000).toFixed(0)}k used`,
            amount: totalBudget - totalSpent,
            type: 'INCOME' as const,
            date: new Date().toISOString().split('T')[0],
            status: 'COMPLETED',
          });
        }
      }

      if (allEntries.length > 0) {
        return allEntries.sort((a, b) => b.date.localeCompare(a.date));
      }
    } catch (err) {
      secureLog.warn('AdminRoleService: Live finance API unavailable, using fallback', err);
    }
    throw new Error('Finance data is unavailable. No live records could be loaded.');
  },

  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    try {
      const activeVisitorsRes = await api.get<any[]>('/visitors/active');
      if (Array.isArray(activeVisitorsRes.data) && activeVisitorsRes.data.length > 0) {
        const liveAlerts: SecurityAlert[] = activeVisitorsRes.data.slice(0, 5).map((v, i) => {
          const passId = 50000 + (v.id || i);
          return {
            id: passId,
            title: `Active Visitor: ${v.visitorName || 'Guest'}`,
            description: `Vehicle: ${v.vehicleNumber || 'Walk-in'} visiting flat ${v.flatNumber || 'Community'}. Purpose: ${v.purpose || 'Visit'}. Pass code: ${v.passCode || 'N/A'}.`,
            level: 'INFO' as SecurityAlertLevel,
            location: `Gate: ${v.gateIn || 'Main Gate'}`,
            reportedAt: v.checkedInAt || v.createdAt || new Date().toISOString(),
            resolved: false,
            assignedGuard: v.guardIn || 'Gate Officer',
          };
        });
        return liveAlerts;
      }
    } catch (err) {
      secureLog.warn('AdminRoleService: Live visitors/security alerts unavailable', err);
      throw err;
    }
    return [];
  },

  async resolveAlert(id: number): Promise<void> {
    if (id < 50000) throw new Error('This alert cannot be resolved through the server yet.');
    await api.put(`/visitors/${id - 50000}/check-out`);
  },

  async assignAlert(id: number, guardName: string): Promise<void> {
    void guardName;
    throw new Error(`Assigning alert ${id} to a guard is not connected to the server yet.`);
  },

  async getGovernanceItems(): Promise<GovernanceItem[]> {
    throw new Error('Governance data is not connected to the mobile API yet.');
  },

  async getAnalytics(): Promise<AnalyticsData> {
    throw new Error('Admin analytics are not fully connected to live backend data yet.');
  },
};

// ── Helpers ─────────────────────────────────────────────────────

function mapExpenseStatus(status?: string): 'COMPLETED' | 'PENDING' | 'OVERDUE' {
  const map: Record<string, 'COMPLETED' | 'PENDING' | 'OVERDUE'> = {
    APPROVED: 'COMPLETED', PAID: 'COMPLETED', COMPLETED: 'COMPLETED',
    PENDING: 'PENDING', DRAFT: 'PENDING',
    REJECTED: 'PENDING', OVERDUE: 'OVERDUE',
  };
  return map[status || ''] || 'PENDING';
}

function mapVendorInvoiceStatus(status?: string): 'COMPLETED' | 'PENDING' | 'OVERDUE' {
  const map: Record<string, 'COMPLETED' | 'PENDING' | 'OVERDUE'> = {
    PAID: 'COMPLETED', APPROVED: 'PENDING', PENDING: 'PENDING',
    REJECTED: 'PENDING', OVERDUE: 'OVERDUE',
  };
  return map[status || ''] || 'PENDING';
}

function mapReportStatus(status?: string): ApprovalStatus {
  const map: Record<string, ApprovalStatus> = {
    PENDING: 'PENDING', RESOLVED: 'APPROVED', DISMISSED: 'REJECTED',
  };
  return map[status || ''] || 'PENDING';
}

function formatCategory(category?: string): string {
  if (!category) return 'General';
  return category
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default adminRoleService;
