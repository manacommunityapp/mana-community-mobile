import api from './apiClient';
import { secureLog } from '@/security';

export interface SosIncidentDto {
  id: number;
  societyId: number;
  unitNumber: string;
  residentName: string;
  residentPhone: string;
  emergencyType: 'MEDICAL' | 'FIRE' | 'INTRUDER' | 'LIFT_ENTRAPMENT' | 'GENERAL_PANIC';
  status: 'ACTIVE' | 'RESPONDED' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVED' | 'FALSE_ALARM' | 'ESCALATED';
  slaExpiresAt: string;
  assignedGuardName?: string;
  assignedGuardPhone?: string;
  etaMinutes?: number;
  estimatedArrivalAt?: string;
  enRouteAt?: string;
  onSceneAt?: string;
  resolvedAt?: string;
  escalationLevel?: string;
  slaBreached?: boolean;
  lockdownDirective?: 'LOCKDOWN_CLOSE_ALL' | 'EVACUATION_OPEN_ALL' | 'NORMAL_RESTORE';
  createdAt: string;
}

export const emergencySosService = {
  async triggerSos(emergencyType: SosIncidentDto['emergencyType'], notes?: string): Promise<SosIncidentDto> {
    const payload = {
      societyId: 1,
      unitNumber: 'Flat 504',
      emergencyType,
      notes: notes || 'Resident triggered mobile panic button',
    };
    try {
      const res = await api.post<SosIncidentDto>('/api/v1/emergency/sos/trigger', payload);
      return res.data;
    } catch (err) {
      // Incident ids, responders, SLAs and lockdown directives come from the server only.
      // If the trigger did not reach the server, no responder has been assigned.
      secureLog.warn('EmergencySos: trigger failed — SOS was NOT registered', err);
      throw err;
    }
  },

  // Every status transition below is server-owned. A failure propagates so the console
  // never shows a responder state the server does not actually hold.

  async acknowledgeSos(incidentId: number, acknowledgedBy = 'Security Guard'): Promise<Partial<SosIncidentDto>> {
    const res = await api.post<SosIncidentDto>(`/v1/emergency/sos/${incidentId}/acknowledge`, { acknowledgedBy });
    return res.data;
  },

  async setResponderEta(incidentId: number, etaMinutes: number): Promise<Partial<SosIncidentDto>> {
    const res = await api.post<SosIncidentDto>(`/v1/emergency/sos/${incidentId}/eta`, { etaMinutes });
    return res.data;
  },

  async markOnScene(incidentId: number): Promise<Partial<SosIncidentDto>> {
    const res = await api.post<SosIncidentDto>(`/v1/emergency/sos/${incidentId}/on-scene`);
    return res.data;
  },

  async escalateSos(incidentId: number, targetLevel: string, reason: string): Promise<Partial<SosIncidentDto>> {
    const res = await api.post<SosIncidentDto>(`/v1/emergency/sos/${incidentId}/escalate`, { targetLevel, reason });
    return res.data;
  },

  async resolveSos(incidentId: number, resolutionNotes: string): Promise<{ success: boolean }> {
    const res = await api.post(`/v1/emergency/sos/${incidentId}/resolve`, { resolutionNotes });
    return res.data;
  },
};
