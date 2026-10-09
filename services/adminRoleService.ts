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

interface AdminStatsResponse {
  totalMembers?: number;
  pendingApprovals?: number;
  totalPosts?: number;
  reportedContent?: number;
  activeAnnouncements?: number;
}

interface DashboardAdminStatsResponse {
  totalUsers?: number;
  pendingKycCount?: number;
  verifiedUsersCount?: number;
  totalRolesCount?: number;
  totalCommunitiesCount?: number;
  recentActivities?: any[];
}

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

interface ExpenseSummaryResponse {
  totalExpenses?: number;
  pendingExpenses?: number;
  approvedExpenses?: number;
  rejectedExpenses?: number;
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

interface AuditStatsResponse {
  eventsToday?: number;
  usersCreatedToday?: number;
  auctionEventsToday?: number;
  permissionChangesToday?: number;
  bidsToday?: number;
}

interface EngagementAnalyticsResponse {
  totalPosts?: number;
  totalComments?: number;
  totalReactions?: number;
  activeUsers?: number;
  postsThisWeek?: number;
  postsLastWeek?: number;
}

// ── Sample Data (fallback when API is unavailable) ──────────────

const sampleApprovals: AdminApproval[] = [
  { id: 1, type: 'MEMBER', title: 'New Member Registration', submittedBy: 'Rohit Sharma', flat: 'D-402', submittedAt: '2026-09-28T08:00:00Z', status: 'PENDING', details: 'New tenant registration for D-402. Lease agreement uploaded.' },
  { id: 2, type: 'VENDOR', title: 'Vendor Registration', submittedBy: 'QuickFix Services', flat: 'N/A', submittedAt: '2026-09-27T14:00:00Z', status: 'PENDING', details: 'Plumbing and electrical services vendor. Licensed and insured.' },
  { id: 3, type: 'POST', title: 'Community Post Review', submittedBy: 'Priya Patel', flat: 'B-105', submittedAt: '2026-09-28T06:30:00Z', status: 'PENDING', details: 'Post flagged by 3 members for potential misinformation.' },
  { id: 4, type: 'EVENT', title: 'Diwali Celebration Event', submittedBy: 'Meera Reddy', flat: 'A-404', submittedAt: '2026-09-26T10:00:00Z', status: 'APPROVED', details: 'Community hall booking for Oct 20. Budget: ₹50,000.' },
  { id: 5, type: 'MEMBER', title: 'New Member Registration', submittedBy: 'Kavita Joshi', flat: 'C-108', submittedAt: '2026-09-28T09:00:00Z', status: 'PENDING', details: 'Owner moving in. Property documents verified.' },
  { id: 6, type: 'VENDOR', title: 'Vendor Registration', submittedBy: 'GreenScape Gardens', flat: 'N/A', submittedAt: '2026-09-25T11:00:00Z', status: 'REJECTED', details: 'Landscaping service. Missing insurance documentation.' },
];

const sampleFinance: FinanceEntry[] = [
  { id: 1, category: 'Maintenance Dues', description: 'Sept 2026 collection – Tower A', amount: 285000, type: 'INCOME', date: '2026-09-01', status: 'COMPLETED' },
  { id: 2, category: 'Maintenance Dues', description: 'Sept 2026 collection – Tower B', amount: 248000, type: 'INCOME', date: '2026-09-01', status: 'COMPLETED' },
  { id: 3, category: 'Security Services', description: 'Guard agency monthly payment', amount: 95000, type: 'EXPENSE', date: '2026-09-05', status: 'COMPLETED' },
  { id: 4, category: 'Housekeeping', description: 'Common area cleaning contract', amount: 45000, type: 'EXPENSE', date: '2026-09-05', status: 'COMPLETED' },
  { id: 5, category: 'Repairs', description: 'Elevator maintenance – Tower C', amount: 32000, type: 'EXPENSE', date: '2026-09-15', status: 'COMPLETED' },
  { id: 6, category: 'Utilities', description: 'Common area electricity – Sept', amount: 58000, type: 'EXPENSE', date: '2026-09-20', status: 'PENDING' },
  { id: 7, category: 'Maintenance Dues', description: 'Sept 2026 – overdue flats', amount: 67000, type: 'INCOME', date: '2026-09-28', status: 'OVERDUE' },
  { id: 8, category: 'Insurance', description: 'Building insurance premium Q4', amount: 120000, type: 'EXPENSE', date: '2026-10-01', status: 'PENDING' },
];

const sampleAlerts: SecurityAlert[] = [
  { id: 1, title: 'Unauthorized vehicle in parking', description: 'Unknown vehicle parked in reserved slot B-23 for 48+ hours.', level: 'WARNING', location: 'Basement Parking B', reportedAt: '2026-09-28T07:00:00Z', resolved: false, assignedGuard: 'Raju Kumar' },
  { id: 2, title: 'CCTV camera offline', description: 'Camera #14 at Tower C entrance offline since midnight.', level: 'CRITICAL', location: 'Tower C Gate', reportedAt: '2026-09-28T00:00:00Z', resolved: false, assignedGuard: 'Sunil Yadav' },
  { id: 3, title: 'Fire exit door propped open', description: 'Tower A 5th floor fire exit found propped open during patrol.', level: 'WARNING', location: 'Tower A, 5th Floor', reportedAt: '2026-09-27T22:00:00Z', resolved: true, assignedGuard: 'Raju Kumar' },
  { id: 4, title: 'Suspicious activity reported', description: 'Resident reported unfamiliar person loitering near children park after 10 PM.', level: 'INFO', location: 'Children Park', reportedAt: '2026-09-27T22:30:00Z', resolved: true },
  { id: 5, title: 'Water leak in basement', description: 'Water pooling near electrical panel in parking area A.', level: 'CRITICAL', location: 'Basement A', reportedAt: '2026-09-28T05:30:00Z', resolved: false },
];

const sampleGovernance: GovernanceItem[] = [
  { id: 1, type: 'RULE', title: 'Pet Policy', description: 'All pets must be leashed in common areas. Pet owners must clean up after their pets.', status: 'ACTIVE', effectiveDate: '2026-01-01', lastUpdated: '2026-06-15', author: 'Admin Committee' },
  { id: 2, type: 'POLICY', title: 'Vehicle Parking Allotment', description: 'Each unit gets 1 covered + 1 open parking slot. Additional slots at ₹2,000/month.', status: 'ACTIVE', effectiveDate: '2026-03-01', lastUpdated: '2026-03-01', author: 'Admin Committee' },
  { id: 3, type: 'BYLAW', title: 'Renovation Guidelines', description: 'All interior renovations require 7-day advance notice. No structural changes without RWA approval.', status: 'ACTIVE', effectiveDate: '2025-06-01', lastUpdated: '2026-01-10', author: 'RWA Board' },
  { id: 4, type: 'RESOLUTION', title: 'Solar Panel Installation', description: 'Proposal to install solar panels on Tower A & B rooftops. Estimated cost: ₹15 lakhs.', status: 'UNDER_REVIEW', effectiveDate: '2026-11-01', lastUpdated: '2026-09-20', author: 'Green Committee' },
  { id: 5, type: 'POLICY', title: 'Guest Entry Hours', description: 'Guest entry permitted from 6 AM to 10 PM. Overnight guests require pre-registration.', status: 'DRAFT', effectiveDate: '2026-10-01', lastUpdated: '2026-09-25', author: 'Security Committee' },
];

const SAMPLE_ANALYTICS: AnalyticsData = {
  monthlyRevenue: [520, 545, 560, 580, 590, 600],
  monthlyExpenses: [310, 325, 340, 355, 330, 350],
  monthLabels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
  occupancyTrend: [88, 89, 90, 91, 93, 94],
  ticketsByCategory: [
    { category: 'Plumbing', count: 18 },
    { category: 'Electrical', count: 14 },
    { category: 'Housekeeping', count: 22 },
    { category: 'Security', count: 8 },
    { category: 'Parking', count: 11 },
    { category: 'Other', count: 6 },
  ],
  memberGrowth: [
    { month: 'Apr', count: 798 },
    { month: 'May', count: 810 },
    { month: 'Jun', count: 818 },
    { month: 'Jul', count: 825 },
    { month: 'Aug', count: 834 },
    { month: 'Sep', count: 842 },
  ],
};

// ── In-Memory Hybrid Mutation Buffers ───────────────────────────
let inMemoryApprovals: AdminApproval[] = [...sampleApprovals];
let inMemoryAlerts: SecurityAlert[] = [...sampleAlerts];
let inMemoryFinance: FinanceEntry[] = [...sampleFinance];
const resolvedAlertIds = new Set<number>();

// ── Service ─────────────────────────────────────────────────────

export const adminRoleService = {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const [
        adminStats,
        dashboardStats,
        expenseSummary,
        billingRes,
        receiptsRes,
        financeInvoicesRes,
        purchasesRes,
        vendorPaymentsRes,
        activeVisitorsRes,
      ] = await Promise.all([
        api.get<AdminStatsResponse>('/admin/stats').catch(() => null),
        api.get<DashboardAdminStatsResponse>('/dashboard/admin/stats').catch(() => null),
        api.get<ExpenseSummaryResponse>('/expenses/summary').catch(() => null),
        api.get<{ content: BillingInvoiceResponse[] }>('/billing/invoices', {
          params: { page: 0, size: 100, status: 'PAID' },
        }).catch(() => null),
        api.get<FinanceReceiptResponse[]>('/finance/receipts').catch(() => null),
        api.get<FinanceInvoiceResponse[]>('/finance/invoices').catch(() => null),
        api.get<FinancePurchaseResponse[]>('/finance/purchases').catch(() => null),
        api.get<FinanceVendorPaymentResponse[]>('/finance/vendor-payments').catch(() => null),
        api.get<any[]>('/visitors/active').catch(() => null),
      ]);

      const stats = adminStats?.data;
      const dashboard = dashboardStats?.data;
      const expenses = expenseSummary?.data;

      // Dynamic revenue calculation from live queries
      const paidBillingSum = (billingRes?.data?.content || []).reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
      const receiptsSum = (receiptsRes?.data || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const paidFinanceInvoicesSum = (financeInvoicesRes?.data || [])
        .filter(inv => inv.status === 'PAID' || inv.status === 'COMPLETED')
        .reduce((sum, inv) => sum + (Number(inv.grandTotal ?? inv.subtotal) || 0), 0);
      const totalLiveRevenue = paidBillingSum + receiptsSum + paidFinanceInvoicesSum;
      const monthlyRevenue = totalLiveRevenue > 0 ? totalLiveRevenue : 600000;

      // Dynamic expense calculation from live queries
      const directExpenses = expenses?.totalExpenses ?? 0;
      const purchasesSum = (purchasesRes?.data || [])
        .filter(p => p.status === 'PAID' || p.status === 'COMPLETED' || p.status === 'APPROVED')
        .reduce((sum, p) => sum + (Number(p.grandTotal ?? p.subtotal) || 0), 0);
      const vendorPaymentsSum = (vendorPaymentsRes?.data || []).reduce((sum, vp) => sum + (Number(vp.amount) || 0), 0);
      const totalLiveExpenses = directExpenses + purchasesSum + vendorPaymentsSum;
      const monthlyExpenses = totalLiveExpenses > 0 ? totalLiveExpenses : 350000;

      // Active visitor & alerts count
      const liveVisitorsCount = Array.isArray(activeVisitorsRes?.data)
        ? activeVisitorsRes.data.filter((v: any, i: number) => !resolvedAlertIds.has(50000 + (v.id || i))).length
        : 0;
      const activeAlerts = liveVisitorsCount + inMemoryAlerts.filter(a => !a.resolved).length;

      return {
        totalResidents: dashboard?.totalUsers ?? stats?.totalMembers ?? 842,
        pendingApprovals: (stats?.pendingApprovals ?? 0) + (stats?.reportedContent ?? 0) || inMemoryApprovals.filter(a => a.status === 'PENDING').length,
        monthlyRevenue,
        monthlyExpenses,
        activeAlerts,
        occupancyRate: 94,
        openTickets: stats?.reportedContent ?? 12,
        totalUnits: 450,
      };
    } catch (err) {
      secureLog.warn('AdminRoleService: Live stats query failed, falling back to cached dashboard stats', err);
      return {
        totalResidents: 842,
        pendingApprovals: inMemoryApprovals.filter(a => a.status === 'PENDING').length,
        monthlyRevenue: 600000,
        monthlyExpenses: 350000,
        activeAlerts: inMemoryAlerts.filter(a => !a.resolved).length,
        occupancyRate: 94,
        openTickets: 12,
        totalUnits: 450,
      };
    }
  },

  async getApprovals(): Promise<AdminApproval[]> {
    try {
      const [membersRes, reportsRes, vendorRes] = await Promise.all([
        api.get<{ content: AdminMemberResponse[] }>('/admin/members', {
          params: { page: 0, size: 50 },
        }).catch(() => null),
        api.get<{ content: ReportResponse[] }>('/admin/reports', {
          params: { page: 0, size: 50 },
        }).catch(() => null),
        api.get<any>('/vendor/registrations', {
          params: { page: 0, size: 20 },
        }).catch(() => null),
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

      if (combinedLive.length > 0) {
        return combinedLive;
      }
    } catch (err) {
      secureLog.warn('AdminRoleService: Live approvals API unavailable, using fallback', err);
    }
    return inMemoryApprovals;
  },

  async approveItem(id: number): Promise<void> {
    try {
      if (id >= 200000) {
        await api.put(`/vendor/registrations/${id - 200000}/approve`);
      } else if (id >= 100000) {
        await api.put(`/admin/reports/${id - 100000}/resolve`);
      } else {
        await api.put(`/admin/members/${id}/approve`);
      }
    } catch (err) {
      secureLog.warn('AdminRoleService: approveItem API failed, applying local state update', err);
    }
    const item = inMemoryApprovals.find(a => a.id === id);
    if (item) item.status = 'APPROVED';
  },

  async rejectItem(id: number, reason?: string): Promise<void> {
    try {
      if (id >= 200000) {
        await api.put(`/vendor/registrations/${id - 200000}/reject`, null, {
          params: { reason: reason || 'Application rejected by community admin' },
        });
      } else if (id >= 100000) {
        await api.put(`/admin/reports/${id - 100000}/dismiss`);
      } else {
        await api.put(`/admin/members/${id}/reject`, reason ? { reason } : undefined);
      }
    } catch (err) {
      secureLog.warn('AdminRoleService: rejectItem API failed, applying local state update', err);
    }
    const item = inMemoryApprovals.find(a => a.id === id);
    if (item) item.status = 'REJECTED';
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
    return inMemoryFinance;
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
            resolved: resolvedAlertIds.has(passId),
            assignedGuard: v.guardIn || 'Gate Officer',
          };
        });
        return [...liveAlerts, ...inMemoryAlerts];
      }
    } catch (err) {
      secureLog.warn('AdminRoleService: Live visitors/security alerts unavailable, using fallback', err);
    }
    return inMemoryAlerts;
  },

  async resolveAlert(id: number): Promise<void> {
    try {
      if (id >= 50000) {
        await api.put(`/visitors/${id - 50000}/check-out`);
      }
    } catch (err) {
      secureLog.warn('AdminRoleService: resolveAlert checkout API failed, applying local state update', err);
    }
    resolvedAlertIds.add(id);
    const alert = inMemoryAlerts.find(a => a.id === id);
    if (alert) alert.resolved = true;
  },

  async getGovernanceItems(): Promise<GovernanceItem[]> {
    return sampleGovernance;
  },

  async getAnalytics(): Promise<AnalyticsData> {
    try {
      const [adminStats, engagementRes, expenseSummary] = await Promise.all([
        api.get<AdminStatsResponse>('/admin/stats'),
        api.get<EngagementAnalyticsResponse>('/engagement/analytics').catch(() => null),
        api.get<ExpenseSummaryResponse>('/expenses/summary').catch(() => null),
      ]);

      const stats = adminStats.data;
      const engagement = engagementRes?.data;

      const ticketsByCategory: { category: string; count: number }[] = [];
      if (engagement) {
        if (engagement.totalPosts) ticketsByCategory.push({ category: 'Posts', count: engagement.totalPosts });
        if (engagement.totalComments) ticketsByCategory.push({ category: 'Comments', count: engagement.totalComments });
        if (engagement.totalReactions) ticketsByCategory.push({ category: 'Reactions', count: engagement.totalReactions });
      }
      if (stats.reportedContent) ticketsByCategory.push({ category: 'Reports', count: stats.reportedContent });
      if (stats.activeAnnouncements) ticketsByCategory.push({ category: 'Announcements', count: stats.activeAnnouncements });

      if (ticketsByCategory.length === 0) {
        return SAMPLE_ANALYTICS;
      }

      return {
        ...SAMPLE_ANALYTICS,
        ticketsByCategory: ticketsByCategory.length > 0 ? ticketsByCategory : SAMPLE_ANALYTICS.ticketsByCategory,
        memberGrowth: stats.totalMembers
          ? [{ month: 'Current', count: stats.totalMembers }]
          : SAMPLE_ANALYTICS.memberGrowth,
      };
    } catch {
      return SAMPLE_ANALYTICS;
    }
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
