import api from './apiClient';
import { VisitorDto } from './visitorService';

export interface PendingApproval {
  id: number;
  visitorName: string;
  visitorPhone?: string;
  vehicleNumber?: string;
  purpose: string;
  passType: string;
  photo?: string;
  passCode: string;
  arrivedAt: string;
  gate?: string;
  guardName?: string;
  expiresAt?: string;
  flatNumber?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'DENIED';
  approvalDecision?: string;
  denialReason?: string;
}

export interface WalkInRequest {
  visitorName: string;
  visitorPhone?: string;
  purpose: string;
  passType: string;
  vehicleNumber?: string;
  flatNumber: string;
  gate?: string;
  guardName?: string;
}

export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
}

export const visitorApprovalService = {
  async getPendingApprovals(): Promise<PendingApproval[]> {
    try {
      const res = await api.get<PendingApproval[]>('/visitors/mobile/pending');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async approve(id: number): Promise<VisitorDto> {
    try {
      const res = await api.put<VisitorDto>(`/visitors/mobile/${id}/approve`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to approve visitor.');
    }
  },

  async reject(id: number, reason?: string): Promise<VisitorDto> {
    try {
      const res = await api.put<VisitorDto>(`/visitors/mobile/${id}/reject`, { reason });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to reject visitor.');
    }
  },

  async getPendingCount(): Promise<number> {
    try {
      const res = await api.get<PendingApproval[]>('/visitors/mobile/pending');
      return res.data?.length ?? 0;
    } catch {
      return 0;
    }
  },

  async createWalkInRequest(req: WalkInRequest): Promise<PendingApproval> {
    try {
      const res = await api.post<PendingApproval>('/visitors/walk-in', req);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to send approval request to resident.');
    }
  },

  async pollApprovalStatus(id: number): Promise<PendingApproval | null> {
    try {
      const res = await api.get<PendingApproval>(`/visitors/${id}/approval-status`);
      return res.data ?? null;
    } catch {
      return null;
    }
  },
};
