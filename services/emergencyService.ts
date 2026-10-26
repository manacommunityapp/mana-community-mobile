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

// Fallback contacts shown when the backend is unreachable — keep these updated
// with the society's real emergency numbers.
const FALLBACK_CONTACTS: EmergencyContact[] = [
  { id: 'ec-1', role: 'Security Control Room', phone: '100', available: '24/7' },
  { id: 'ec-2', role: 'Ambulance / Medical', phone: '108', available: '24/7' },
  { id: 'ec-3', role: 'Fire Brigade', phone: '101', available: '24/7' },
  { id: 'ec-4', role: 'Police', phone: '112', available: '24/7' },
];

// Queue SOS alerts locally so they can be retried when connectivity returns.
const pendingSOSQueue: Array<{ data: EmergencyTriggerRequest; timestamp: string }> = [];

export const emergencyService = {
  async triggerSOS(data: EmergencyTriggerRequest): Promise<EmergencyAlertDto> {
    try {
      const res = await api.post<EmergencyAlertDto>('/emergency/sos', data);
      return res.data;
    } catch (err) {
      // Store locally so the resident has a record, and retry is possible.
      pendingSOSQueue.push({ data, timestamp: new Date().toISOString() });
      // Return a local alert so the UI can show the SOS was recorded.
      return {
        id: `local-sos-${Date.now()}`,
        category: data.category,
        status: 'DISPATCHED',
        timestamp: new Date().toISOString(),
        description: data.description,
        tower: data.tower,
        flatNumber: data.flatNumber,
      };
    }
  },

  async getActiveAlerts(): Promise<EmergencyAlertDto[]> {
    try {
      const res = await api.get<EmergencyAlertDto[]>('/emergency/active');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async resolveAlert(alertId: string, resolutionNotes?: string): Promise<void> {
    try {
      await api.post(`/emergency/${alertId}/resolve`, { resolutionNotes });
    } catch (err) {
      throw new Error('Could not resolve alert — please try again or contact the security desk directly.');
    }
  },

  async getContacts(): Promise<EmergencyContact[]> {
    try {
      const res = await api.get<EmergencyContact[]>('/emergency/contacts');
      const contacts = res.data;
      if (Array.isArray(contacts) && contacts.length > 0) return contacts;
      return FALLBACK_CONTACTS;
    } catch {
      return FALLBACK_CONTACTS;
    }
  },

  getPendingSOSQueue() {
    return [...pendingSOSQueue];
  },
};
