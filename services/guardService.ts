import api from './apiClient';
import type { VisitorDto } from './visitorService';

// ── Types ────────────────────────────────────────────────────────

export type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'DENIED';
export type IncidentStatus = 'OPEN' | 'ESCALATED' | 'RESOLVED';
export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CheckpointStatus = 'COMPLETED' | 'PENDING' | 'SKIPPED';

export interface GuardVisitor {
  id: number;
  name: string;
  purpose: string;
  flat: string;
  vehicleNumber?: string;
  phone?: string;
  photoUrl?: string;
  expectedAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  status: VisitorStatus;
  preApproved: boolean;
  approvedBy?: string;
}

export interface GuardIncident {
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

export interface GuardDashboardStats {
  visitorsToday: number;
  pendingEntry: number;
  vehiclesIn: number;
  deliveries: number;
  openIncidents: number;
}

// ── Mapping: backend VisitorDto → GuardVisitor ──────────────────

function mapVisitorDtoToGuard(dto: VisitorDto): GuardVisitor {
  return {
    id: dto.id,
    name: dto.visitorName,
    purpose: dto.purpose,
    flat: dto.flatNumber ?? '',
    vehicleNumber: dto.vehicleNumber,
    phone: dto.visitorPhone,
    expectedAt: dto.expectedAt ?? dto.createdAt ?? '',
    checkedInAt: dto.checkedInAt,
    checkedOutAt: dto.checkedOutAt,
    status: (dto.status as VisitorStatus) ?? 'EXPECTED',
    preApproved: dto.status === 'EXPECTED' && !!dto.residentId,
    approvedBy: dto.residentName,
  };
}

// ── Sample Data (fallback when API unavailable) ─────────────────

const SAMPLE_VISITORS: GuardVisitor[] = [
  { id: 1, name: 'Amit Verma', purpose: 'Guest Visit', flat: 'A-201', vehicleNumber: 'MH-04-AB-1234', expectedAt: '2026-09-28T10:00:00', status: 'CHECKED_IN', preApproved: true, approvedBy: 'Rahul Sharma', checkedInAt: '2026-09-28T10:02:00' },
  { id: 2, name: 'Rajesh Kumar', purpose: 'Plumber - Kitchen repair', flat: 'C-102', phone: '9876543210', expectedAt: '2026-09-28T11:00:00', status: 'EXPECTED', preApproved: false },
  { id: 3, name: 'Amazon Delivery', purpose: 'Package Delivery', flat: 'B-502', expectedAt: '2026-09-28T09:30:00', status: 'CHECKED_OUT', preApproved: false, checkedInAt: '2026-09-28T09:32:00', checkedOutAt: '2026-09-28T09:45:00' },
  { id: 4, name: 'Swiggy Delivery', purpose: 'Food Delivery', flat: 'A-105', expectedAt: '2026-09-28T12:30:00', status: 'EXPECTED', preApproved: false },
  { id: 5, name: 'Priya Sharma', purpose: 'Guest Visit', flat: 'B-301', vehicleNumber: 'KA-01-CD-5678', expectedAt: '2026-09-27T15:00:00', status: 'CHECKED_OUT', preApproved: true, approvedBy: 'Meera Patel', checkedInAt: '2026-09-27T15:05:00', checkedOutAt: '2026-09-27T18:30:00' },
  { id: 6, name: 'Unknown Person', purpose: 'Delivery - refused ID', flat: 'D-110', expectedAt: '2026-09-28T08:00:00', status: 'DENIED', preApproved: false },
];

const SAMPLE_INCIDENTS: GuardIncident[] = [
  { id: 1, title: 'Unauthorized parking — Lot B', description: 'Unregistered vehicle parked in reserved slot B-12. No contact number on windshield.', location: 'Parking Lot B', status: 'OPEN', priority: 'MEDIUM', reportedAt: '2026-09-28T08:30:00', reportedBy: 'Kumar Singh' },
  { id: 2, title: 'Broken light — Stairwell C', description: 'Light fixture broken on 3rd floor landing of C block.', location: 'C Block, 3rd Floor', status: 'ESCALATED', priority: 'LOW', reportedAt: '2026-09-28T07:00:00', reportedBy: 'Kumar Singh', assignedTo: 'Maintenance Team' },
  { id: 3, title: 'Suspicious activity near generator', description: 'Unknown person seen near generator room at night. CCTV footage captured.', location: 'Generator Room', status: 'OPEN', priority: 'HIGH', reportedAt: '2026-09-28T06:15:00', reportedBy: 'Night Shift Guard' },
  { id: 4, title: 'Noise complaint — A-block', description: 'Loud music from A-402 after 11 PM. Resident warned.', location: 'A Block, 4th Floor', status: 'RESOLVED', priority: 'LOW', reportedAt: '2026-09-27T23:15:00', reportedBy: 'Kumar Singh', resolvedAt: '2026-09-27T23:30:00' },
];

const SAMPLE_CHECKPOINTS: PatrolCheckpoint[] = [
  { id: 1, name: 'Gate A — Main Entrance', location: 'Main Gate', order: 1, scannedAt: '2026-09-28T06:05:00', status: 'COMPLETED' },
  { id: 2, name: 'Parking Lot B', location: 'Basement B', order: 2, scannedAt: '2026-09-28T06:15:00', status: 'COMPLETED' },
  { id: 3, name: 'Swimming Pool Area', location: 'Amenity Block', order: 3, status: 'PENDING' },
  { id: 4, name: 'Generator Room', location: 'Utility Block', order: 4, status: 'PENDING' },
  { id: 5, name: 'Children\'s Play Area', location: 'Garden', order: 5, status: 'PENDING' },
  { id: 6, name: 'Gate B — Service Entrance', location: 'Rear Gate', order: 6, status: 'PENDING' },
];

// ── Service ──────────────────────────────────────────────────────

export const guardService = {
  getDashboardStats: async (): Promise<GuardDashboardStats> => {
    try {
      const visitors = await guardService.getVisitors();
      const today = new Date().toISOString().split('T')[0];
      const todayVisitors = visitors.filter(v => v.expectedAt.startsWith(today));
      return {
        visitorsToday: todayVisitors.length,
        pendingEntry: visitors.filter(v => v.status === 'EXPECTED').length,
        vehiclesIn: visitors.filter(v => v.status === 'CHECKED_IN' && v.vehicleNumber).length,
        deliveries: visitors.filter(v =>
          v.purpose.toLowerCase().includes('delivery') &&
          v.expectedAt.startsWith(today)
        ).length,
        openIncidents: SAMPLE_INCIDENTS.filter(i => i.status !== 'RESOLVED').length,
      };
    } catch {
      return {
        visitorsToday: 12,
        pendingEntry: 4,
        vehiclesIn: 8,
        deliveries: 3,
        openIncidents: 2,
      };
    }
  },

  getVisitors: async (): Promise<GuardVisitor[]> => {
    try {
      const res = await api.get<VisitorDto[]>('/visitors');
      return res.data.map(mapVisitorDtoToGuard);
    } catch {
      return SAMPLE_VISITORS;
    }
  },

  checkInVisitor: async (id: number): Promise<void> => {
    await api.put(`/visitors/${id}/check-in`, {});
  },

  checkOutVisitor: async (id: number): Promise<void> => {
    await api.put(`/visitors/${id}/check-out`);
  },

  denyVisitor: async (id: number): Promise<void> => {
    await api.put(`/visitors/${id}/reject`);
  },

  getIncidents: async (): Promise<GuardIncident[]> => {
    try {
      const res = await api.get<GuardIncident[]>('/security/incidents');
      return res.data;
    } catch {
      return SAMPLE_INCIDENTS;
    }
  },

  createIncident: async (data: Omit<GuardIncident, 'id' | 'reportedAt' | 'status'>): Promise<GuardIncident> => {
    try {
      const res = await api.post<GuardIncident>('/security/incidents', data);
      return res.data;
    } catch {
      const newInc: GuardIncident = {
        ...data,
        id: Date.now(),
        reportedAt: new Date().toISOString(),
        status: 'OPEN',
      };
      SAMPLE_INCIDENTS.unshift(newInc);
      return newInc;
    }
  },

  getPatrolSession: async (): Promise<PatrolSession> => {
    try {
      const res = await api.get<PatrolSession>('/security/patrol/session');
      return res.data;
    } catch {
      return {
        id: 1,
        startedAt: '2026-09-28T06:00:00',
        checkpoints: SAMPLE_CHECKPOINTS,
        guardName: 'Kumar Singh',
      };
    }
  },

  scanCheckpoint: async (checkpointId: number): Promise<void> => {
    try {
      await api.post('/security/patrol/scan', { checkpointId });
    } catch {
      const cp = SAMPLE_CHECKPOINTS.find((c) => c.id === checkpointId);
      if (cp) {
        cp.status = 'COMPLETED';
        cp.scannedAt = new Date().toISOString();
      }
    }
  },

  raiseAlert: async (message: string): Promise<void> => {
    try {
      await api.post('/security/alerts', { message });
    } catch {
      console.warn('Security alert broadcast locally:', message);
    }
  },
};
