import apiClient from './apiClient';
import type {
  HealthProfileDto,
  EmergencyContactDto,
  EmergencyIncidentDto,
  TriggerSosRequest,
} from '../types/healthguard';

const BASE = '/api/healthguard';

// Seed data for offline/demo mode
const SEED_PROFILE: HealthProfileDto = {
  id: 1,
  userId: 1,
  bloodGroup: 'O_POSITIVE',
  allergies: 'Penicillin',
  medicalConditions: 'None',
  emergencyNotes: 'Carry EpiPen',
  heightCm: 170,
  weightKg: 70,
  organDonorConsent: false,
  physicianName: 'Dr. Sharma',
  physicianPhone: '+91-9876543210',
};

const SEED_CONTACTS: EmergencyContactDto[] = [
  { id: 1, name: 'Priya Sharma', phone: '+91-9876543210', relationship: 'SPOUSE', priority: 1, notifyOnSos: true, notifyOnAlert: true, consentGiven: true, isActive: true },
  { id: 2, name: 'Raj Kumar', phone: '+91-9765432109', relationship: 'PARENT', priority: 2, notifyOnSos: true, notifyOnAlert: false, consentGiven: true, isActive: true },
];

const SEED_INCIDENTS: EmergencyIncidentDto[] = [
  {
    id: 1,
    incidentUuid: 'demo-uuid-001',
    severity: 'LEVEL_3_POSSIBLE_EMERGENCY',
    status: 'RESOLVED',
    description: 'Chest pain reported',
    triggerType: 'MANUAL_SOS',
    triggeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    alertsSent: 2,
  },
];

// In-memory state for seed mode
let profileState: HealthProfileDto = { ...SEED_PROFILE };
let contactsState: EmergencyContactDto[] = [...SEED_CONTACTS];
let incidentsState: EmergencyIncidentDto[] = [...SEED_INCIDENTS];
let activeIncident: EmergencyIncidentDto | null = null;

export const healthGuardService = {
  async getProfile(): Promise<HealthProfileDto> {
    try {
      const res = await apiClient.get<HealthProfileDto>(`${BASE}/profile`);
      return res.data;
    } catch {
      return profileState;
    }
  },

  async saveProfile(dto: HealthProfileDto): Promise<HealthProfileDto> {
    try {
      const res = await apiClient.put<HealthProfileDto>(`${BASE}/profile`, dto);
      return res.data;
    } catch {
      profileState = { ...profileState, ...dto };
      return profileState;
    }
  },

  async getContacts(): Promise<EmergencyContactDto[]> {
    try {
      const res = await apiClient.get<EmergencyContactDto[]>(`${BASE}/contacts`);
      return res.data;
    } catch {
      return contactsState.filter(c => c.isActive !== false);
    }
  },

  async addContact(dto: EmergencyContactDto): Promise<EmergencyContactDto> {
    try {
      const res = await apiClient.post<EmergencyContactDto>(`${BASE}/contacts`, dto);
      return res.data;
    } catch {
      const newContact = { ...dto, id: Date.now(), isActive: true };
      contactsState = [...contactsState, newContact];
      return newContact;
    }
  },

  async updateContact(id: number, dto: EmergencyContactDto): Promise<EmergencyContactDto> {
    try {
      const res = await apiClient.put<EmergencyContactDto>(`${BASE}/contacts/${id}`, dto);
      return res.data;
    } catch {
      contactsState = contactsState.map(c => c.id === id ? { ...c, ...dto } : c);
      return { ...dto, id };
    }
  },

  async deleteContact(id: number): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/contacts/${id}`);
    } catch {
      contactsState = contactsState.map(c => c.id === id ? { ...c, isActive: false } : c);
    }
  },

  async triggerSos(request: TriggerSosRequest): Promise<EmergencyIncidentDto> {
    try {
      const res = await apiClient.post<EmergencyIncidentDto>(`${BASE}/sos`, request);
      return res.data;
    } catch {
      const incident: EmergencyIncidentDto = {
        id: Date.now(),
        incidentUuid: `local-${Date.now()}`,
        severity: request.severity ?? 'LEVEL_3_POSSIBLE_EMERGENCY',
        status: 'ACTIVE',
        description: request.description,
        triggerType: request.triggerType ?? 'MANUAL_SOS',
        latitude: request.latitude,
        longitude: request.longitude,
        locationAddress: request.locationAddress,
        triggeredAt: new Date().toISOString(),
        alertsSent: contactsState.filter(c => c.notifyOnSos && c.isActive).length,
        notifications: [],
      };
      activeIncident = incident;
      incidentsState = [incident, ...incidentsState];
      return incident;
    }
  },

  async getActiveIncident(): Promise<EmergencyIncidentDto | null> {
    try {
      const res = await apiClient.get<EmergencyIncidentDto>(`${BASE}/incidents/active`);
      return res.status === 204 ? null : res.data;
    } catch {
      return activeIncident;
    }
  },

  async getIncidentHistory(): Promise<EmergencyIncidentDto[]> {
    try {
      const res = await apiClient.get<EmergencyIncidentDto[]>(`${BASE}/incidents`);
      return res.data;
    } catch {
      return incidentsState;
    }
  },

  async resolveIncident(id: number, notes?: string): Promise<EmergencyIncidentDto> {
    try {
      const res = await apiClient.put<EmergencyIncidentDto>(`${BASE}/incidents/${id}/resolve`, { notes });
      return res.data;
    } catch {
      incidentsState = incidentsState.map(i =>
        i.id === id ? { ...i, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString(), notes } : i
      );
      if (activeIncident?.id === id) activeIncident = null;
      return incidentsState.find(i => i.id === id)!;
    }
  },

  async cancelIncident(id: number): Promise<EmergencyIncidentDto> {
    try {
      const res = await apiClient.put<EmergencyIncidentDto>(`${BASE}/incidents/${id}/cancel`, {});
      return res.data;
    } catch {
      incidentsState = incidentsState.map(i =>
        i.id === id ? { ...i, status: 'CANCELLED' as const, resolvedAt: new Date().toISOString() } : i
      );
      if (activeIncident?.id === id) activeIncident = null;
      return incidentsState.find(i => i.id === id)!;
    }
  },
};

export default healthGuardService;
