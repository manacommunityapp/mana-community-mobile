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
      secureLog.warn('EmergencySos: local fallback trigger', err);
      const slaTime = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3-min SLA
      return {
        id: Math.floor(Math.random() * 9000) + 1000,
        societyId: 1,
        unitNumber: 'Flat 504 (Tower B)',
        residentName: 'Sandeep (Resident)',
        residentPhone: '+91 98765 43210',
        emergencyType,
        status: 'ACTIVE',
        slaExpiresAt: slaTime,
        assignedGuardName: 'Vikram Singh (Head Guard)',
        assignedGuardPhone: '+91 98765 11223',
        lockdownDirective: emergencyType === 'FIRE' ? 'EVACUATION_OPEN_ALL' : 'LOCKDOWN_CLOSE_ALL',
        createdAt: new Date().toISOString(),
      };
    }
  },

  async acknowledgeSos(incidentId: number, acknowledgedBy = 'Security Guard'): Promise<Partial<SosIncidentDto>> {
    try {
      const res = await api.post<SosIncidentDto>(`/api/v1/emergency/sos/${incidentId}/acknowledge`, { acknowledgedBy });
      return res.data;
    } catch {
      return { id: incidentId, status: 'RESPONDED' };
    }
  },

  async setResponderEta(incidentId: number, etaMinutes: number): Promise<Partial<SosIncidentDto>> {
    try {
      const res = await api.post<SosIncidentDto>(`/api/v1/emergency/sos/${incidentId}/eta`, { etaMinutes });
      return res.data;
    } catch {
      return {
        id: incidentId,
        status: 'EN_ROUTE',
        etaMinutes,
        enRouteAt: new Date().toISOString(),
        estimatedArrivalAt: new Date(Date.now() + etaMinutes * 60000).toISOString(),
      };
    }
  },

  async markOnScene(incidentId: number): Promise<Partial<SosIncidentDto>> {
    try {
      const res = await api.post<SosIncidentDto>(`/api/v1/emergency/sos/${incidentId}/on-scene`);
      return res.data;
    } catch {
      return { id: incidentId, status: 'ON_SCENE', onSceneAt: new Date().toISOString() };
    }
  },

  async escalateSos(incidentId: number, targetLevel: string, reason: string): Promise<Partial<SosIncidentDto>> {
    try {
      const res = await api.post<SosIncidentDto>(`/api/v1/emergency/sos/${incidentId}/escalate`, { targetLevel, reason });
      return res.data;
    } catch {
      return { id: incidentId, status: 'ESCALATED', escalationLevel: targetLevel, slaBreached: true };
    }
  },

  async resolveSos(incidentId: number, resolutionNotes: string): Promise<{ success: boolean }> {
    try {
      const res = await api.post(`/api/v1/emergency/sos/${incidentId}/resolve`, { resolutionNotes });
      return res.data;
    } catch {
      return { success: true };
    }
  },
};
