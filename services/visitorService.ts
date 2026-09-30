import api from './apiClient';

export type VisitorType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE' | 'FAMILY' | 'FRIEND' | 'CONTRACTOR' | 'COURIER' | 'VENDOR' | 'EVENT_GUEST' | 'OTHER';
export type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'DENIED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface VisitorDto {
  id: number;
  passCode: string;
  visitorName: string;
  visitorPhone?: string;
  vehicleNumber?: string;
  purpose: string;
  passType: VisitorType | string;
  status: VisitorStatus | string;
  expectedAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  flatNumber?: string;
  residentId?: number;
  residentName?: string;
  communityId?: number;
  createdAt?: string;
  otpOnCreation?: string;
  otpExpiresAt?: string;
  gateIn?: string;
  gateOut?: string;
  guardIn?: string;
  guardOut?: string;
  visitorPhoto?: string;
}

export interface PreApproveVisitorRequest {
  visitorName: string;
  visitorPhone?: string;
  vehicleNumber?: string;
  purpose?: string;
  passType: VisitorType | string;
  expectedAt?: string;
  flatNumber?: string;
}

export interface VisitorAuditLogDto {
  id: number;
  passId?: number;
  passCode?: string;
  action: string;
  performedBy?: string;
  role?: string;
  gate?: string;
  notes?: string;
  timestamp?: string;
}

export interface VisitorAnalyticsDto {
  totalToday?: number;
  currentlyInside?: number;
  pendingExpected?: number;
  deniedToday?: number;
  peakHour?: string;
  typeBreakdown?: Record<string, number>;
}

export const visitorService = {
  // ── 1. List All Community Passes ─────────────────────────────────
  async getVisitors(params?: { status?: string }): Promise<VisitorDto[]> {
    const res = await api.get<VisitorDto[]>('/visitors', { params });
    return res.data;
  },

  // ── 2. Get Active Passes Inside Gate ─────────────────────────────
  async getActivePasses(): Promise<VisitorDto[]> {
    const res = await api.get<VisitorDto[]>('/visitors/active');
    return res.data;
  },

  // ── 3. Get Today's Expected/Active Passes ────────────────────────
  async getTodaysPasses(): Promise<VisitorDto[]> {
    const res = await api.get<VisitorDto[]>('/visitors/today');
    return res.data;
  },

  // ── 4. Resident's Visitor Log / History ──────────────────────────
  async getMyVisitors(): Promise<VisitorDto[]> {
    const res = await api.get<VisitorDto[]>('/visitors/my-visitors');
    return res.data;
  },

  // ── 5. Pending Approval Passes ───────────────────────────────────
  async getPendingApprovals(): Promise<VisitorDto[]> {
    const res = await api.get<VisitorDto[]>('/visitors/pending');
    return res.data;
  },

  // ── 6. Get Single Pass by Passcode ───────────────────────────────
  async getByPassCode(passCode: string): Promise<VisitorDto> {
    const res = await api.get<VisitorDto>(`/visitors/code/${encodeURIComponent(passCode)}`);
    return res.data;
  },

  // ── 7. Get Pass by Database ID ───────────────────────────────────
  async getById(id: number): Promise<VisitorDto> {
    const res = await api.get<VisitorDto>(`/visitors/${id}`);
    return res.data;
  },

  // ── 8. Pre-Approve Expected Visitor (Resident) ───────────────────
  async preApprove(data: PreApproveVisitorRequest): Promise<VisitorDto> {
    const res = await api.post<VisitorDto>('/visitors/pre-approve', data);
    return res.data;
  },

  // ── 9. Create Walk-in Pass at Gate (Guard) ───────────────────────
  async createWalkIn(data: PreApproveVisitorRequest): Promise<VisitorDto> {
    const res = await api.post<VisitorDto>('/visitors/walk-in', data);
    return res.data;
  },

  // ── 10. Approve Pending Pass (Resident) ──────────────────────────
  async approve(id: number): Promise<VisitorDto> {
    const res = await api.put<VisitorDto>(`/visitors/${id}/approve`);
    return res.data;
  },

  // ── 11. Check-In Visitor by ID (Guard/Gate) ──────────────────────
  async checkIn(id: number, gate?: string, guard?: string, visitorPhoto?: string): Promise<VisitorDto> {
    const res = await api.put<VisitorDto>(`/visitors/${id}/check-in`, { visitorPhoto }, {
      params: { gate, guard },
    });
    return res.data;
  },

  // ── 12. Check-In Visitor by Pass Code (Guard QR Scan) ───────────
  async checkInByCode(passCode: string): Promise<VisitorDto> {
    const res = await api.put<VisitorDto>(`/visitors/code/${encodeURIComponent(passCode)}/check-in`);
    return res.data;
  },

  // ── 13. Check-Out Visitor (Departure) ────────────────────────────
  async checkOut(id: number, gate?: string, guard?: string): Promise<VisitorDto> {
    const res = await api.put<VisitorDto>(`/visitors/${id}/check-out`, null, {
      params: { gate, guard },
    });
    return res.data;
  },

  // ── 14. Deny / Reject Pass ───────────────────────────────────────
  async denyEntry(id: number): Promise<VisitorDto> {
    const res = await api.put<VisitorDto>(`/visitors/${id}/reject`);
    return res.data;
  },

  // ── 15. Verify Pass Code, OTP, or Phone (Gate Lookup) ────────────
  async verifyPass(query: string): Promise<VisitorDto> {
    const res = await api.get<VisitorDto>('/visitors/verify', {
      params: { query },
    });
    return res.data;
  },

  // ── 16. Visitor Analytics ────────────────────────────────────────
  async getAnalytics(): Promise<VisitorAnalyticsDto> {
    const res = await api.get<VisitorAnalyticsDto>('/visitors/analytics');
    return res.data;
  },

  // ── 17. Audit Logs ───────────────────────────────────────────────
  async getAuditLogs(): Promise<VisitorAuditLogDto[]> {
    const res = await api.get<VisitorAuditLogDto[]>('/visitors/audit-logs');
    return res.data;
  },
};
