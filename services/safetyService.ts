import api from './apiClient';
import { secureLog } from '@/security';

// ── SOS / Emergency Types ──────────────────────────────────────

export type EmergencyType = 'MEDICAL' | 'FIRE' | 'SECURITY_INTRUDER' | 'GAS_LEAK' | 'LIFT_STUCK' | 'GENERAL_PANIC' | 'THEFT';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SosStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'ON_SITE' | 'RESOLVED' | 'FALSE_ALARM';

export interface SosTriggerRequest {
  emergencyType: EmergencyType;
  severity: Severity;
  flatNumber?: string;
  buildingBlock?: string;
  latitude?: number;
  longitude?: number;
  locationDetails?: string;
  notes?: string;
  triggerGateLockdown?: boolean;
}

export interface SosIncidentResponse {
  id: number;
  communityId?: number;
  residentId?: number;
  residentName?: string;
  residentPhone?: string;
  flatNumber?: string;
  buildingBlock?: string;
  emergencyType: EmergencyType;
  severity: Severity;
  status: SosStatus;
  latitude?: number;
  longitude?: number;
  locationDetails?: string;
  notes?: string;
  lockdownInitiated?: boolean;
  slaTargetSeconds?: number;
  triggeredAt: string;
  acknowledgedAt?: string;
  arrivedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// ── ANPR Types ─────────────────────────────────────────────────

export type BarrierAction = 'OPEN' | 'HOLD' | 'DENY';

export interface AnprGateEvent {
  id: number;
  gateId: string;
  direction: string;
  plateNumber: string;
  confidence: number;
  anprStatus: string;
  barrierAction: BarrierAction;
  matchedResidentName?: string;
  matchedVehicleId?: number;
  matchedVisitorPassId?: number;
  processingMs?: number;
  createdAt: string;
}

export interface AnprSummary {
  totalEventsToday: number;
  openCount: number;
  holdCount: number;
  denyCount: number;
  pendingAlerts: number;
}

// ── Incident Types ─────────────────────────────────────────────

export type IncidentStatus = 'OPEN' | 'ESCALATED' | 'RESOLVED';
export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityIncident {
  id: number;
  title: string;
  description: string;
  location: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  reportedAt: string;
  reportedBy: string;
  resolvedAt?: string;
  assignedTo?: string;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  location: string;
  priority: IncidentPriority;
}

// ── Patrol Types ───────────────────────────────────────────────

export type CheckpointStatus = 'COMPLETED' | 'PENDING' | 'SKIPPED';

export interface PatrolCheckpoint {
  id: number;
  name: string;
  location: string;
  order: number;
  scannedAt?: string;
  status: CheckpointStatus;
}

export interface PatrolSession {
  id: number;
  startedAt: string;
  endedAt?: string;
  checkpoints: PatrolCheckpoint[];
  guardName: string;
}

export interface GuardShift {
  id: number;
  guardId: number;
  guardName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  gate?: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
}

// ── Service ────────────────────────────────────────────────────

export const safetyService = {
  // ── SOS ──────────────────────────────────────────────────────

  async triggerSOS(data: SosTriggerRequest): Promise<SosIncidentResponse> {
    try {
      const res = await api.post<SosIncidentResponse>('/emergency/sos/trigger', data);
      return res.data;
    } catch (err) {
      secureLog.warn('[safetyService] /emergency/sos/trigger failed, trying /emergency/sos', err);
      const res = await api.post<SosIncidentResponse>('/emergency/sos', {
        category: data.emergencyType,
        description: data.notes,
        tower: data.buildingBlock,
        flatNumber: data.flatNumber,
      });
      return res.data as SosIncidentResponse;
    }
  },

  async getActiveAlerts(): Promise<SosIncidentResponse[]> {
    try {
      const res = await api.get<SosIncidentResponse[]>('/emergency/sos/active');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('[safetyService] /emergency/sos/active failed, trying /emergency/active', err);
      try {
        const res = await api.get('/emergency/active');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    }
  },

  async getMyAlerts(): Promise<SosIncidentResponse[]> {
    try {
      const res = await api.get<SosIncidentResponse[]>('/emergency/sos/my');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getAlertHistory(page = 0): Promise<{ content: SosIncidentResponse[]; totalElements: number }> {
    try {
      const res = await api.get('/emergency/sos/history', { params: { page, size: 20 } });
      return res.data;
    } catch {
      return { content: [], totalElements: 0 };
    }
  },

  async acknowledgeAlert(id: number): Promise<SosIncidentResponse> {
    const res = await api.post<SosIncidentResponse>(`/emergency/sos/${id}/acknowledge`);
    return res.data;
  },

  async resolveAlert(id: number, resolutionNotes?: string, falseAlarm = false): Promise<SosIncidentResponse> {
    const res = await api.post<SosIncidentResponse>(`/emergency/sos/${id}/resolve`, {
      status: falseAlarm ? 'FALSE_ALARM' : 'RESOLVED',
      resolutionNotes,
    });
    return res.data;
  },

  // ── ANPR ─────────────────────────────────────────────────────

  async getAnprSummary(): Promise<AnprSummary> {
    try {
      const res = await api.get<AnprSummary>('/parking/anpr/summary');
      return res.data;
    } catch {
      return { totalEventsToday: 0, openCount: 0, holdCount: 0, denyCount: 0, pendingAlerts: 0 };
    }
  },

  async getAnprEvents(page = 0, gateId?: string): Promise<{ content: AnprGateEvent[]; totalElements: number }> {
    try {
      const res = await api.get('/parking/anpr/events', {
        params: { page, size: 30, ...(gateId ? { gateId } : {}) },
      });
      const data = res.data;
      if (data.content) return data;
      if (Array.isArray(data)) return { content: data, totalElements: data.length };
      return { content: [], totalElements: 0 };
    } catch {
      return { content: [], totalElements: 0 };
    }
  },

  async getAnprPendingAlerts(): Promise<AnprGateEvent[]> {
    try {
      const res = await api.get<AnprGateEvent[]>('/parking/anpr/alerts/pending');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getPlateHistory(plate: string): Promise<AnprGateEvent[]> {
    try {
      const res = await api.get<AnprGateEvent[]>(`/parking/anpr/plates/${encodeURIComponent(plate)}/history`);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  // ── Incidents ────────────────────────────────────────────────

  async getIncidents(): Promise<SecurityIncident[]> {
    try {
      const res = await api.get('/guard/incidents');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      try {
        const res = await api.get('/security/incidents');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    }
  },

  async createIncident(data: CreateIncidentRequest): Promise<SecurityIncident> {
    try {
      const res = await api.post<SecurityIncident>('/guard/incidents', data);
      return res.data;
    } catch {
      const res = await api.post<SecurityIncident>('/security/incidents', data);
      return res.data;
    }
  },

  async updateIncidentStatus(id: number, status: IncidentStatus): Promise<SecurityIncident> {
    try {
      const res = await api.put<SecurityIncident>(`/guard/incidents/${id}/status`, null, {
        params: { status },
      });
      return res.data;
    } catch {
      const res = await api.put<SecurityIncident>(`/security/incidents/${id}/status`, null, {
        params: { status },
      });
      return res.data;
    }
  },

  // ── Patrol ───────────────────────────────────────────────────

  async getPatrolSession(): Promise<PatrolSession | null> {
    try {
      const res = await api.get<PatrolSession>('/guard/patrol/session');
      return res.data;
    } catch {
      try {
        const res = await api.get<PatrolSession>('/security/patrol/session');
        return res.data;
      } catch {
        return null;
      }
    }
  },

  async scanCheckpoint(checkpointId: number): Promise<PatrolCheckpoint> {
    try {
      const res = await api.post<PatrolCheckpoint>('/guard/patrol/scan', { checkpointId });
      return res.data;
    } catch {
      const res = await api.post<PatrolCheckpoint>('/security/patrol/scan', { checkpointId });
      return res.data;
    }
  },

  // ── Guard Shifts ─────────────────────────────────────────────

  async getGuardShifts(date?: string): Promise<GuardShift[]> {
    try {
      const res = await api.get<GuardShift[]>('/guards/shifts', {
        params: date ? { date } : {},
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },
};
