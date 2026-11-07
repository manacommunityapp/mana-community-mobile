import { apiClient } from './apiClient';
import type {
  KittyPartyCircleSummary,
  KittyPartyMember,
  KittyPartyCycle,
  KittyPartyContribution,
  KittyPartyGameRoom,
  KittyPartyTicket,
  KittyPartyWinnerClaim,
  KittyPartyExpenseShare,
} from '@/types/kittyPartyTypes';

export interface CreateCirclePayload {
  circleName: string;
  description?: string;
  categoryCode: string;
  privacyType: string;
  approvalRequired?: boolean;
  maxMembers?: number;
}

export interface CreateCyclePayload {
  cycleName: string;
  contributionAmount: number;
  frequency?: string;
  memberCount: number;
  startDate: string;
  beneficiaryRotationUserIds?: number[];
}

export interface RecordContributionPayload {
  periodNumber: number;
  recordedAmount: number;
  externalRef?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface CreateGameRoomPayload {
  roomName: string;
  maxPlayers?: number;
}

export const kittyPartyService = {
  getMyCircles: async (): Promise<{ content: KittyPartyCircleSummary[] }> => {
    const res = await apiClient.get<{ content: KittyPartyCircleSummary[] }>('/v1/kitty-circles/my');
    return res.data;
  },

  discoverCircles: async (categoryCode?: string): Promise<{ content: KittyPartyCircleSummary[] }> => {
    const q = categoryCode ? `?categoryCode=${categoryCode}` : '';
    const res = await apiClient.get<{ content: KittyPartyCircleSummary[] }>(`/v1/kitty-circles/discover${q}`);
    return res.data;
  },

  getCircleDetails: async (circleId: number): Promise<KittyPartyCircleSummary> => {
    const res = await apiClient.get<KittyPartyCircleSummary>(`/v1/kitty-circles/${circleId}`);
    return res.data;
  },

  createCircle: async (payload: CreateCirclePayload): Promise<KittyPartyCircleSummary> => {
    const res = await apiClient.post<KittyPartyCircleSummary>('/v1/kitty-circles', payload);
    return res.data;
  },

  getCircleMembers: async (circleId: number): Promise<KittyPartyMember[]> => {
    const res = await apiClient.get<KittyPartyMember[]>(`/v1/kitty-circles/${circleId}/members`);
    return res.data;
  },

  requestToJoin: async (circleId: number, message?: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/v1/kitty-circles/${circleId}/join`, { requestMessage: message });
    return res.data;
  },

  inviteMember: async (circleId: number, invitedUserId?: number, invitedPhone?: string): Promise<{ success: boolean; inviteToken: string }> => {
    const res = await apiClient.post<{ success: boolean; inviteToken: string }>(`/v1/kitty-circles/${circleId}/invitations`, { invitedUserId, invitedPhone });
    return res.data;
  },

  createCycle: async (circleId: number, payload: CreateCyclePayload): Promise<KittyPartyCycle> => {
    const res = await apiClient.post<KittyPartyCycle>(`/v1/kitty-ledger/circles/${circleId}/cycles`, payload);
    return res.data;
  },

  getCycleSummary: async (cycleId: number): Promise<KittyPartyCycle> => {
    const res = await apiClient.get<KittyPartyCycle>(`/v1/kitty-ledger/cycles/${cycleId}`);
    return res.data;
  },

  getContributions: async (cycleId: number, periodNumber?: number): Promise<KittyPartyContribution[]> => {
    const q = periodNumber ? `?periodNumber=${periodNumber}` : '';
    const res = await apiClient.get<KittyPartyContribution[]>(`/v1/kitty-ledger/cycles/${cycleId}/contributions${q}`);
    return res.data;
  },

  recordContribution: async (cycleId: number, payload: RecordContributionPayload): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/v1/kitty-ledger/cycles/${cycleId}/contributions`, payload);
    return res.data;
  },

  createGameRoom: async (circleId: number, payload: CreateGameRoomPayload): Promise<KittyPartyGameRoom> => {
    const res = await apiClient.post<KittyPartyGameRoom>(`/v1/kitty-games/circles/${circleId}/rooms`, payload);
    return res.data;
  },

  getRoomDetails: async (roomId: number): Promise<KittyPartyGameRoom> => {
    const res = await apiClient.get<KittyPartyGameRoom>(`/v1/kitty-games/rooms/${roomId}`);
    return res.data;
  },

  joinGameRoom: async (roomId: number): Promise<{ success: boolean }> => {
    const res = await apiClient.post<{ success: boolean }>(`/v1/kitty-games/rooms/${roomId}/join`, {});
    return res.data;
  },

  generateTicket: async (roomId: number): Promise<KittyPartyTicket> => {
    const res = await apiClient.post<KittyPartyTicket>(`/v1/kitty-games/rooms/${roomId}/tickets`, {});
    return res.data;
  },

  getMyTickets: async (roomId: number): Promise<KittyPartyTicket[]> => {
    const res = await apiClient.get<KittyPartyTicket[]>(`/v1/kitty-games/rooms/${roomId}/my-tickets`);
    return res.data;
  },

  callNextNumber: async (roomId: number): Promise<{ roomId: number; sequenceNum: number; calledNumber: number }> => {
    const res = await apiClient.post<{ roomId: number; sequenceNum: number; calledNumber: number }>(`/v1/kitty-games/rooms/${roomId}/call-number`, {});
    return res.data;
  },

  claimPrize: async (roomId: number, ticketId: number, claimType: string): Promise<KittyPartyWinnerClaim> => {
    const res = await apiClient.post<KittyPartyWinnerClaim>(`/v1/kitty-games/rooms/${roomId}/claim`, { ticketId, claimType });
    return res.data;
  },

  getMyPendingShares: async (): Promise<KittyPartyExpenseShare[]> => {
    const res = await apiClient.get<KittyPartyExpenseShare[]>('/v1/kitty-expenses/my-pending');
    return res.data;
  },

  settleShare: async (shareId: number, settlementRef: string): Promise<KittyPartyExpenseShare> => {
    const res = await apiClient.post<KittyPartyExpenseShare>(`/v1/kitty-expenses/shares/${shareId}/settle`, { settlementRef });
    return res.data;
  },
};
