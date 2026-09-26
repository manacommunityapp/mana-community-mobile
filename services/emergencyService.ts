import api from './apiClient';

export interface EmergencyTriggerRequest {
  category: string;
  description?: string;
  tower?: string;
  flatNumber?: string;
  contactNumber?: string;
}

export interface EmergencyAlertDto {
  id: string;
  category: string;
  status: 'DISPATCHED' | 'ACKNOWLEDGED' | 'RESOLVED';
  timestamp: string;
  description?: string;
  requesterName?: string;
  tower?: string;
  flatNumber?: string;
}

export interface EmergencyContact {
  id: string;
  role: string;
  name?: string;
  phone: string;
  available: string;
}

export const emergencyService = {
  async triggerSOS(data: EmergencyTriggerRequest): Promise<EmergencyAlertDto> {
    const res = await api.post<EmergencyAlertDto>('/emergency/sos', data);
    return res.data;
  },

  async getActiveAlerts(): Promise<EmergencyAlertDto[]> {
    const res = await api.get<EmergencyAlertDto[]>('/emergency/active');
    return res.data;
  },

  async resolveAlert(alertId: string, resolutionNotes?: string): Promise<void> {
    await api.post(`/emergency/${alertId}/resolve`, { resolutionNotes });
  },

  async getContacts(): Promise<EmergencyContact[]> {
    const res = await api.get<EmergencyContact[]>('/emergency/contacts');
    return res.data;
  },
};
