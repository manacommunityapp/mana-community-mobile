import api from './apiClient';

export type VisitorType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE';
export type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'DENIED';

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

export const visitorService = {
  /**
   * List community visitor log
   */
  async getVisitors(params?: { status?: string }): Promise<VisitorDto[]> {
    const res = await api.get<VisitorDto[]>('/visitors', { params });
    return res.data;
  },

  /**
   * Pre-approve an expected visitor
   */
  async preApprove(data: PreApproveVisitorRequest): Promise<VisitorDto> {
    const res = await api.post<VisitorDto>('/visitors/pre-approve', data);
    return res.data;
  },

  /**
   * Guard/resident checks in a visitor
   */
  async checkIn(id: number, gate?: string, guard?: string, visitorPhoto?: string): Promise<VisitorDto> {
    const res = await api.put<VisitorDto>(`/visitors/${id}/check-in`, { visitorPhoto }, {
      params: { gate, guard },
    });
    return res.data;
  },

  /**
   * Record visitor departure (check-out)
   */
  async checkOut(id: number, gate?: string, guard?: string): Promise<VisitorDto> {
    const res = await api.put<VisitorDto>(`/visitors/${id}/check-out`, null, {
      params: { gate, guard },
    });
    return res.data;
  },

  /**
   * Resident's visitor history
   */
  async getMyVisitors(): Promise<VisitorDto[]> {
    const res = await api.get<VisitorDto[]>('/visitors/my-visitors');
    return res.data;
  },

  /**
   * Deny entry or reject pass
   */
  async denyEntry(id: number): Promise<VisitorDto> {
    const res = await api.put<VisitorDto>(`/visitors/${id}/reject`);
    return res.data;
  },
};
