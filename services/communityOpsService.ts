import { apiClient } from './apiClient';

export type PassType = 'DELIVERY' | 'DOMESTIC_WORKER' | 'GUEST' | 'VEHICLE' | 'CONTRACTOR';

export interface DigitalPassDto {
  id: number;
  passType: PassType;
  visitorName?: string;
  vehicleNumber?: string;
  purpose?: string;
  token: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  validUntil: string;
}

export interface ParcelLogDto {
  id: number;
  flatNumber: string;
  senderName?: string;
  courierName?: string;
  description?: string;
  status: 'RECEIVED' | 'NOTIFIED' | 'PICKED_UP';
  receivedAt: string;
}

export interface MoveRequestDto {
  id: number;
  moveType: 'MOVE_IN' | 'MOVE_OUT';
  plannedDate: string;
  vehicleNumber?: string;
  moversCompany?: string;
  contactNumber?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
}

export interface OpsControlRoomSummary {
  staffOnDuty: number;
  pendingParcels: number;
  todayVisitors: number;
  overdueMaintenanceTasks: number;
  upcomingMaintenance: number;
  pendingMoveRequests: number;
}

export interface StaffShiftStatus {
  clockedIn: boolean;
  clockedInSince?: string;
  totalMinutesToday: number;
}

export interface WatchlistCheckResult {
  match: boolean;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason?: string;
  addedAt?: string;
}

export interface CreatePassRequest {
  passType: PassType;
  visitorName?: string;
  vehicleNumber?: string;
  purpose?: string;
}

export interface CreateMoveRequest {
  moveType: 'MOVE_IN' | 'MOVE_OUT';
  plannedDate: string;
  vehicleNumber?: string;
  moversCompany?: string;
  contactNumber?: string;
}

export const communityOpsService = {
  getControlRoomSummary: (): Promise<OpsControlRoomSummary> =>
    apiClient.get<OpsControlRoomSummary>('/ops/control-room/summary').then(r => r.data),

  // Digital passes
  getMyPasses: (): Promise<DigitalPassDto[]> =>
    apiClient.get<DigitalPassDto[]>('/digital-pass/my').then(r => r.data),

  createPass: (req: CreatePassRequest): Promise<DigitalPassDto> =>
    apiClient.post<DigitalPassDto>('/digital-pass', req).then(r => r.data),

  revokePass: (id: number): Promise<void> =>
    apiClient.delete(`/digital-pass/${id}`).then(() => {}),

  // Parcels
  getMyParcels: (): Promise<ParcelLogDto[]> =>
    apiClient.get<ParcelLogDto[]>('/parcels/my').then(r => r.data),

  acknowledgeParcels: (id: number, otp: string): Promise<void> =>
    apiClient.post(`/parcels/${id}/acknowledge`, { otp }).then(() => {}),

  // Move requests
  getMyMoveRequests: (): Promise<MoveRequestDto[]> =>
    apiClient.get<MoveRequestDto[]>('/move-requests/my').then(r => r.data),

  createMoveRequest: (req: CreateMoveRequest): Promise<MoveRequestDto> =>
    apiClient.post<MoveRequestDto>('/move-requests', req).then(r => r.data),

  // Staff attendance
  getShiftStatus: (): Promise<StaffShiftStatus> =>
    apiClient.get<StaffShiftStatus>('/staff/attendance/status').then(r => r.data),

  clockIn: (): Promise<StaffShiftStatus> =>
    apiClient.post<StaffShiftStatus>('/staff/attendance/clock-in').then(r => r.data),

  clockOut: (): Promise<StaffShiftStatus> =>
    apiClient.post<StaffShiftStatus>('/staff/attendance/clock-out').then(r => r.data),

  // Watchlist check
  checkWatchlist: (identifier: string): Promise<WatchlistCheckResult> =>
    apiClient.post<WatchlistCheckResult>('/watchlist/check', { identifier }).then(r => r.data),
};
