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
  validFrom?: string;
  validUntil?: string;
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
  async getVisitors(params?: { status?: string }): Promise<VisitorDto[]> {
    try {
      const res = await api.get<VisitorDto[]>('/visitors', { params });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getActivePasses(): Promise<VisitorDto[]> {
    try {
      const res = await api.get<VisitorDto[]>('/visitors/active');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getTodaysPasses(): Promise<VisitorDto[]> {
    try {
      const res = await api.get<VisitorDto[]>('/visitors/today');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getMyVisitors(): Promise<VisitorDto[]> {
    try {
      const res = await api.get<VisitorDto[]>('/visitors/my-visitors');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getPendingApprovals(): Promise<VisitorDto[]> {
    try {
      const res = await api.get<VisitorDto[]>('/visitors/pending');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getByPassCode(passCode: string): Promise<VisitorDto> {
    const res = await api.get<VisitorDto>(`/visitors/code/${encodeURIComponent(passCode)}`);
    return res.data;
  },

  async getById(id: number): Promise<VisitorDto> {
    const res = await api.get<VisitorDto>(`/visitors/${id}`);
    return res.data;
  },

  async preApprove(data: PreApproveVisitorRequest): Promise<VisitorDto> {
    try {
      const res = await api.post<VisitorDto>('/visitors/pre-approve', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to pre-approve visitor. Please try again.');
    }
  },

  async createWalkIn(data: PreApproveVisitorRequest): Promise<VisitorDto> {
    try {
      const res = await api.post<VisitorDto>('/visitors/walk-in', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create walk-in pass. Please try again.');
    }
  },

  async approve(id: number): Promise<VisitorDto> {
    try {
      const res = await api.put<VisitorDto>(`/visitors/${id}/approve`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to approve visitor.');
    }
  },

  async checkIn(id: number, gate?: string, guard?: string, visitorPhoto?: string): Promise<VisitorDto> {
    try {
      const res = await api.put<VisitorDto>(`/visitors/${id}/check-in`, { visitorPhoto }, {
        params: { gate, guard },
      });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Check-in failed. Please try again.');
    }
  },

  async checkInByCode(passCode: string): Promise<VisitorDto> {
    try {
      const res = await api.put<VisitorDto>(`/visitors/code/${encodeURIComponent(passCode)}/check-in`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Check-in by code failed. Please verify the pass code.');
    }
  },

  async checkOut(id: number, gate?: string, guard?: string): Promise<VisitorDto> {
    try {
      const res = await api.put<VisitorDto>(`/visitors/${id}/check-out`, null, {
        params: { gate, guard },
      });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Check-out failed. Please try again.');
    }
  },

  async denyEntry(id: number): Promise<VisitorDto> {
    try {
      const res = await api.put<VisitorDto>(`/visitors/${id}/reject`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to deny entry.');
    }
  },

  async verifyPass(query: string): Promise<VisitorDto> {
    const res = await api.get<VisitorDto>('/visitors/verify', { params: { query } });
    return res.data;
  },

  async getAnalytics(): Promise<VisitorAnalyticsDto> {
    try {
      const res = await api.get<VisitorAnalyticsDto>('/visitors/analytics');
      return res.data;
    } catch {
      return {};
    }
  },

  async getAuditLogs(): Promise<VisitorAuditLogDto[]> {
    try {
      const res = await api.get<VisitorAuditLogDto[]>('/visitors/audit-logs');
      return res.data ?? [];
    } catch {
      return [];
    }
  },
};
