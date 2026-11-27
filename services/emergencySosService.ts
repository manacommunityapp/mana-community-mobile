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

  encodeCompactSosFrame(params: {
    communityId: number;
    residentId: number;
    towerBlock: string;
    locationCode: string;
    typeCode: 'L' | 'F' | 'G' | 'M' | 'S' | 'P';
    epochSec?: number;
    idempotencyKey: string;
  }): string {
    const ts = params.epochSec ?? Math.floor(Date.now() / 1000);
    return `SOS1|${params.communityId}|${params.residentId}|${params.towerBlock}|${params.locationCode}|${params.typeCode}|${ts}|${params.idempotencyKey}`;
  },

  async triggerCompactLiftSos(params: {
    communityId: number;
    residentId: number;
    towerBlock: string;
    locationCode: string;
    typeCode?: 'L' | 'F' | 'G' | 'M' | 'S' | 'P';
    idempotencyKey?: string;
    nearestGuardId?: number;
    smsGatewayNumber?: string;
  }): Promise<{ deliveredVia: 'COMPACT_2G' | 'SMS_FALLBACK'; frame: string; response?: any }> {
    const idem = params.idempotencyKey ?? `sos-${Date.now().toString(36)}`;
    const frame = this.encodeCompactSosFrame({
      communityId: params.communityId,
      residentId: params.residentId,
      towerBlock: params.towerBlock,
      locationCode: params.locationCode,
      typeCode: params.typeCode ?? 'L',
      idempotencyKey: idem,
    });
    try {
      const res = await api.post(
        '/api/v1/emergency/sos/compact',
        { rawFrame: frame, ingestChannel: 'COMPACT_2G', nearestGuardId: params.nearestGuardId },
        { timeout: 2500 },
      );
      return { deliveredVia: 'COMPACT_2G', frame, response: res.data };
    } catch {
      return { deliveredVia: 'SMS_FALLBACK', frame };
    }
  },

  async broadcastTowerEvacuation(payload: {
    towerBlock: string;
    emergencyType: string;
    message: string;
    assemblyPoint?: string;
  }): Promise<any> {
    const res = await api.post('/api/v1/emergency/evacuation/broadcast', payload);
    return res.data;
  },
};
