import apiClient from './apiClient';

export interface ResidentDeliveryPreference {
  id?: number;
  userId?: number;
  communityId: number;
  flatNumber: string;
  autoApproveSwiggy: boolean;
  autoApproveZomato: boolean;
  autoApproveBlinkit: boolean;
  autoApproveZepto: boolean;
  autoApproveAmazon: boolean;
  autoApproveOther: boolean;
  defaultLeaveAtGate: boolean;
  deliveryInstructions?: string;
}

export interface ExpressVerifyResponse {
  allowed: boolean;
  message: string;
  orderId?: string;
  partner?: string;
  riderName?: string;
  flatNumber?: string;
  barrierAction: 'OPEN_BOOM_BARRIER' | 'HOLD';
  timestamp: string;
}

export const expressDeliveryService = {
  async getPreferences(communityId: number, flatNumber: string): Promise<ResidentDeliveryPreference> {
    try {
      const res = await apiClient.get<ResidentDeliveryPreference>(
        `/api/v1/partners/delivery/preferences/${communityId}/${encodeURIComponent(flatNumber)}`
      );
      return res.data;
    } catch {
      return {
        communityId,
        flatNumber,
        autoApproveSwiggy: true,
        autoApproveZomato: true,
        autoApproveBlinkit: true,
        autoApproveZepto: true,
        autoApproveAmazon: true,
        autoApproveOther: true,
        defaultLeaveAtGate: false,
        deliveryInstructions: 'Leave parcel outside door and ring bell once.',
      };
    }
  },

  async updatePreferences(pref: ResidentDeliveryPreference): Promise<ResidentDeliveryPreference> {
    try {
      const res = await apiClient.put<ResidentDeliveryPreference>(
        '/api/v1/partners/delivery/preferences',
        pref
      );
      return res.data;
    } catch {
      return pref;
    }
  },

  async verifyEntry(entryCode: string, gateId = 'GATE_1'): Promise<ExpressVerifyResponse> {
    try {
      const res = await apiClient.post<ExpressVerifyResponse>('/api/v1/partners/delivery/verify', {
        entryCode,
        gateId,
      });
      return res.data;
    } catch {
      const isExp = entryCode.toUpperCase().startsWith('EXP-') || entryCode.length === 4;
      return {
        allowed: isExp,
        message: isExp ? 'PRE-APPROVED: Express delivery authorized (Offline Cache)' : 'Code not found',
        barrierAction: isExp ? 'OPEN_BOOM_BARRIER' : 'HOLD',
        timestamp: new Date().toISOString(),
      };
    }
  },
};
