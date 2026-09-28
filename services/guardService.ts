import api from './apiClient';

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

// ── Sample Data (until backend endpoints are wired) ──────────────

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
    // TODO: wire to GET /api/guard/dashboard
    return {
      visitorsToday: 12,
      pendingEntry: 4,
      vehiclesIn: 8,
      deliveries: 3,
      openIncidents: 2,
    };
  },

  getVisitors: async (): Promise<GuardVisitor[]> => {
    // TODO: wire to GET /api/guard/visitors
    return SAMPLE_VISITORS;
  },

  checkInVisitor: async (id: number): Promise<void> => {
    // TODO: wire to POST /api/guard/visitors/{id}/check-in
  },

  checkOutVisitor: async (id: number): Promise<void> => {
    // TODO: wire to POST /api/guard/visitors/{id}/check-out
  },

  denyVisitor: async (id: number): Promise<void> => {
    // TODO: wire to POST /api/guard/visitors/{id}/deny
  },

  getIncidents: async (): Promise<GuardIncident[]> => {
    // TODO: wire to GET /api/guard/incidents
    return SAMPLE_INCIDENTS;
  },

  createIncident: async (data: Omit<GuardIncident, 'id' | 'reportedAt' | 'status'>): Promise<GuardIncident> => {
    // TODO: wire to POST /api/guard/incidents
    return { ...data, id: Date.now(), reportedAt: new Date().toISOString(), status: 'OPEN' } as GuardIncident;
  },

  getPatrolSession: async (): Promise<PatrolSession> => {
    // TODO: wire to GET /api/guard/patrol/current
    return {
      id: 1,
      startedAt: '2026-09-28T06:00:00',
      checkpoints: SAMPLE_CHECKPOINTS,
      guardName: 'Kumar Singh',
    };
  },

  scanCheckpoint: async (checkpointId: number): Promise<void> => {
    // TODO: wire to POST /api/guard/patrol/scan/{checkpointId}
  },

  raiseAlert: async (message: string): Promise<void> => {
    // TODO: wire to POST /api/guard/alert
  },
};
