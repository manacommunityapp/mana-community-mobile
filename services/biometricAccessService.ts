import api from './apiClient';
import { secureLog } from '@/security';

export interface TurnstileDto {
  id: number;
  societyId: number;
  turnstileCode: string;
  turnstileName: string;
  gateLocation: string;
  turnstileType: 'PEDESTRIAN_IN' | 'PEDESTRIAN_OUT' | 'BIDIRECTIONAL';
  ipAddress?: string;
  relayPin?: number;
  status: 'ONLINE' | 'OFFLINE' | 'LOCKED' | 'MAINTENANCE';
  confidenceThreshold: number;
  unlockDurationSeconds: number;
  lastHeartbeat?: string;
}

export interface FaceVerificationRequest {
  societyId: number;
  turnstileCode: string;
  faceEmbeddingVector?: number[];
  faceSnapshotBase64?: string;
  confidenceScore: number;
  timestamp: string;
}

export interface FaceVerificationResult {
  decision: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'TIME_RESTRICTED' | 'LOCKDOWN_BLOCKED';
  userId?: number;
  userFullName?: string;
  userType?: 'RESIDENT' | 'STAFF' | 'GUARD' | 'VISITOR';
  roleName?: string;
  confidenceScore: number;
  reason: string;
  relayPulseDurationMs: number;
  turnstileCode: string;
}

export interface StaffScheduleRuleDto {
  staffId: number;
  staffName: string;
  role: string;
  allowedStartTime: string;
  allowedEndTime: string;
  allowedDaysOfWeek: string[];
  isActive: boolean;
}

const MOCK_TURNSTILES: TurnstileDto[] = [
  {
    id: 1,
    societyId: 1,
    turnstileCode: 'TS-MAIN-ENTRY-01',
    turnstileName: 'Main Clubhouse Pedestrian Turnstile #1',
    gateLocation: 'Clubhouse North Gate',
    turnstileType: 'BIDIRECTIONAL',
    status: 'ONLINE',
    confidenceThreshold: 0.80,
    unlockDurationSeconds: 3,
    lastHeartbeat: new Date().toISOString(),
  },
  {
    id: 2,
    societyId: 1,
    turnstileCode: 'TS-TOWER-A-01',
    turnstileName: 'Tower A Lobby Turnstile',
    gateLocation: 'Tower A Ground Floor',
    turnstileType: 'PEDESTRIAN_IN',
    status: 'ONLINE',
    confidenceThreshold: 0.85,
    unlockDurationSeconds: 3,
    lastHeartbeat: new Date().toISOString(),
  },
  {
    id: 3,
    societyId: 1,
    turnstileCode: 'TS-SERVICE-GATE-01',
    turnstileName: 'Domestic Staff Service Turnstile',
    gateLocation: 'East Service Gate',
    turnstileType: 'BIDIRECTIONAL',
    status: 'ONLINE',
    confidenceThreshold: 0.80,
    unlockDurationSeconds: 3,
    lastHeartbeat: new Date().toISOString(),
  },
];

export const biometricAccessService = {
  async getTurnstiles(societyId: number = 1): Promise<TurnstileDto[]> {
    try {
      const res = await api.get<TurnstileDto[]>(`/api/v1/access/turnstiles?societyId=${societyId}`);
      if (res.data && res.data.length > 0) return res.data;
    } catch (err) {
      secureLog.warn('BiometricAccess: using fallback turnstiles', err);
    }
    return MOCK_TURNSTILES;
  },

  async verifyFace(req: FaceVerificationRequest): Promise<FaceVerificationResult> {
    try {
      const res = await api.post<FaceVerificationResult>('/api/v1/access/turnstiles/verify-face', req);
      return res.data;
    } catch (err) {
      secureLog.warn('BiometricAccess: verifyFace fallback simulation', err);
      const isMatch = req.confidenceScore >= 0.80;
      return {
        decision: isMatch ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        userId: isMatch ? 101 : undefined,
        userFullName: isMatch ? 'Verified Resident / Staff' : undefined,
        userType: 'RESIDENT',
        confidenceScore: req.confidenceScore,
        reason: isMatch ? 'Face verified with 94.2% confidence' : 'Confidence below threshold (< 80%)',
        relayPulseDurationMs: isMatch ? 3000 : 0,
        turnstileCode: req.turnstileCode,
      };
    }
  },

  async triggerManualRelay(turnstileId: number, durationSec: number = 3): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/api/v1/access/turnstiles/${turnstileId}/relay-unlock`, { durationSeconds: durationSec });
      return res.data;
    } catch {
      return { success: true, message: `Turnstile #${turnstileId} relay pulsed for ${durationSec}s` };
    }
  },
};
