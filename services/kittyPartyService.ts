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
  SwapRotationRequest,
  ReplaceMemberRequest,
  SendRemindersResponse,
  KittyPartyAuditLog,
  KittyPartyDispute,
  CreateDisputeRequest,
  ResolveDisputeRequest,
  MonthlyStatementResponse,
  KittyPartyEvent,
  KittyPartyRsvp,
  KittyPartyAttendance,
  CreateKittyPartyEventRequest,
  KittyPartyRsvpRequest,
  KittyPartyAttendanceRequest,
  KittyPartyPost,
  KittyPartyPostComment,
  CreateKittyPartyPostRequest,
  CreateKittyPartyCommentRequest,
  KittyPartyCircleLeaderboardResponse,
  KittyPartyVendorPackage,
  InquireVendorPackageRequest,
} from '../types/kittyPartyTypes';

export interface CreateCirclePayload {
  circleName: string;
  description?: string;
  categoryCode: string;
  privacyType: string;
  approvalRequired?: boolean;
  maxMembers?: number;
  allowExternalMembers?: boolean;
  maxExternalMembers?: number;
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
  allowGuestPlayers?: boolean;
}

export const kittyPartyService = {
  // Circles
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

  approveJoinRequest: async (circleId: number, requestId: number): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/v1/kitty-circles/${circleId}/join-requests/${requestId}/approve`, {});
    return res.data;
  },

  inviteMember: async (
    circleId: number,
    invitedUserId?: number,
    invitedPhone?: string,
    isExternal?: boolean,
    externalSocietyName?: string
  ): Promise<{ success: boolean; inviteToken: string }> => {
    const res = await apiClient.post<{ success: boolean; inviteToken: string }>(
      `/v1/kitty-circles/${circleId}/invitations`,
      { invitedUserId, invitedPhone, isExternal, externalSocietyName }
    );
    return res.data;
  },

  // Savings Ledger
  createCycle: async (circleId: number, payload: CreateCyclePayload): Promise<KittyPartyCycle> => {
    const res = await apiClient.post<KittyPartyCycle>(`/v1/kitty-ledger/circles/${circleId}/cycles`, payload);
    return res.data;
  },

  getCycleSummary: async (cycleId: number): Promise<KittyPartyCycle> => {
    const res = await apiClient.get<KittyPartyCycle>(`/v1/kitty-ledger/cycles/${cycleId}`);
    return res.data;
  },

  getCircleActiveCycle: async (circleId: number): Promise<KittyPartyCycle> => {
    const res = await apiClient.get<KittyPartyCycle>(`/v1/kitty-ledger/circles/${circleId}/active-cycle`);
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

  // Advanced Workflow Features
  swapRotation: async (cycleId: number, payload: SwapRotationRequest): Promise<KittyPartyCycle> => {
    const res = await apiClient.post<KittyPartyCycle>(`/v1/kitty-ledger/cycles/${cycleId}/swap-rotation`, payload);
    return res.data;
  },

  sendReminders: async (cycleId: number, periodNumber?: number): Promise<SendRemindersResponse> => {
    const res = await apiClient.post<SendRemindersResponse>(`/v1/kitty-ledger/cycles/${cycleId}/remind`, { periodNumber });
    return res.data;
  },

  replaceMember: async (cycleId: number, payload: ReplaceMemberRequest): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/v1/kitty-ledger/cycles/${cycleId}/replace-member`, payload);
    return res.data;
  },

  getStatement: async (cycleId: number, periodNumber?: number): Promise<MonthlyStatementResponse> => {
    const q = periodNumber ? `?periodNumber=${periodNumber}` : '';
    const res = await apiClient.get<MonthlyStatementResponse>(`/v1/kitty-ledger/cycles/${cycleId}/statement${q}`);
    return res.data;
  },

  getAuditTrail: async (cycleId: number): Promise<KittyPartyAuditLog[]> => {
    const res = await apiClient.get<KittyPartyAuditLog[]>(`/v1/kitty-ledger/cycles/${cycleId}/audit-trail`);
    return res.data;
  },

  createDispute: async (circleId: number, payload: CreateDisputeRequest): Promise<KittyPartyDispute> => {
    const res = await apiClient.post<KittyPartyDispute>(`/v1/kitty-ledger/circles/${circleId}/disputes`, payload);
    return res.data;
  },

  getDisputes: async (circleId: number): Promise<KittyPartyDispute[]> => {
    const res = await apiClient.get<KittyPartyDispute[]>(`/v1/kitty-ledger/circles/${circleId}/disputes`);
    return res.data;
  },

  resolveDispute: async (circleId: number, disputeId: number, payload: ResolveDisputeRequest): Promise<KittyPartyDispute> => {
    const res = await apiClient.post<KittyPartyDispute>(`/v1/kitty-ledger/circles/${circleId}/disputes/${disputeId}/resolve`, payload);
    return res.data;
  },

  // Housie
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

  joinGameRoomByCode: async (roomCode: string): Promise<KittyPartyGameRoom> => {
    const res = await apiClient.post<KittyPartyGameRoom>('/v1/kitty-games/rooms/join-by-code', { roomCode });
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

  // Expenses
  splitExpense: async (expenseId: number, participantUserIds: number[], customShareAmount?: number): Promise<KittyPartyExpenseShare[]> => {
    const res = await apiClient.post<KittyPartyExpenseShare[]>('/v1/kitty-expenses/split', { expenseId, participantUserIds, customShareAmount });
    return res.data;
  },

  getExpenseShares: async (expenseId: number): Promise<KittyPartyExpenseShare[]> => {
    const res = await apiClient.get<KittyPartyExpenseShare[]>(`/v1/kitty-expenses/expenses/${expenseId}/shares`);
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

  // Events & RSVP Calendar
  getEvents: async (circleId: number): Promise<KittyPartyEvent[]> => {
    const res = await apiClient.get<KittyPartyEvent[]>(`/v1/kitty-events/circles/${circleId}`);
    return res.data;
  },

  getUpcomingEvents: async (circleId: number): Promise<KittyPartyEvent[]> => {
    const res = await apiClient.get<KittyPartyEvent[]>(`/v1/kitty-events/circles/${circleId}/upcoming`);
    return res.data;
  },

  getEventById: async (eventId: number): Promise<KittyPartyEvent> => {
    const res = await apiClient.get<KittyPartyEvent>(`/v1/kitty-events/${eventId}`);
    return res.data;
  },

  createEvent: async (circleId: number, payload: CreateKittyPartyEventRequest): Promise<KittyPartyEvent> => {
    const res = await apiClient.post<KittyPartyEvent>(`/v1/kitty-events/circles/${circleId}`, payload);
    return res.data;
  },

  submitRsvp: async (eventId: number, payload: KittyPartyRsvpRequest): Promise<KittyPartyRsvp> => {
    const res = await apiClient.post<KittyPartyRsvp>(`/v1/kitty-events/${eventId}/rsvp`, payload);
    return res.data;
  },

  getEventRsvps: async (eventId: number): Promise<KittyPartyRsvp[]> => {
    const res = await apiClient.get<KittyPartyRsvp[]>(`/v1/kitty-events/${eventId}/rsvps`);
    return res.data;
  },

  markAttendance: async (eventId: number, payload: KittyPartyAttendanceRequest): Promise<KittyPartyAttendance> => {
    const res = await apiClient.post<KittyPartyAttendance>(`/v1/kitty-events/${eventId}/attendance`, payload);
    return res.data;
  },

  getEventAttendance: async (eventId: number): Promise<KittyPartyAttendance[]> => {
    const res = await apiClient.get<KittyPartyAttendance[]>(`/v1/kitty-events/${eventId}/attendance`);
    return res.data;
  },

  // Feed: Posts & Comments
  getCirclePosts: async (circleId: number): Promise<KittyPartyPost[]> => {
    const res = await apiClient.get<KittyPartyPost[]>(`/v1/kitty-posts/circles/${circleId}`);
    return res.data;
  },

  createPost: async (circleId: number, payload: CreateKittyPartyPostRequest): Promise<KittyPartyPost> => {
    const res = await apiClient.post<KittyPartyPost>(`/v1/kitty-posts/circles/${circleId}`, payload);
    return res.data;
  },

  togglePinPost: async (postId: number): Promise<KittyPartyPost> => {
    const res = await apiClient.post<KittyPartyPost>(`/v1/kitty-posts/${postId}/pin`, {});
    return res.data;
  },

  deletePost: async (postId: number): Promise<void> => {
    await apiClient.delete(`/v1/kitty-posts/${postId}`);
  },

  getPostComments: async (postId: number): Promise<KittyPartyPostComment[]> => {
    const res = await apiClient.get<KittyPartyPostComment[]>(`/v1/kitty-posts/${postId}/comments`);
    return res.data;
  },

  addComment: async (postId: number, payload: CreateKittyPartyCommentRequest): Promise<KittyPartyPostComment> => {
    const res = await apiClient.post<KittyPartyPostComment>(`/v1/kitty-posts/${postId}/comments`, payload);
    return res.data;
  },

  deleteComment: async (postId: number, commentId: number): Promise<void> => {
    await apiClient.delete(`/v1/kitty-posts/${postId}/comments/${commentId}`);
  },

  // Phase 5: Housie Leaderboard & Trophies
  getLeaderboard: async (circleId: number): Promise<KittyPartyCircleLeaderboardResponse> => {
    const res = await apiClient.get<KittyPartyCircleLeaderboardResponse>(`/v1/kitty-games/circles/${circleId}/leaderboard`);
    return res.data;
  },

  // Phase 5: Curated Party Vendor Packages
  getVendorPackages: async (circleId: number, category?: string): Promise<KittyPartyVendorPackage[]> => {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await apiClient.get<KittyPartyVendorPackage[]>(`/v1/kitty-circles/${circleId}/vendor-packages${q}`);
    return res.data;
  },

  inquireVendorPackage: async (payload: InquireVendorPackageRequest): Promise<{ success: boolean; message: string; contactPhone?: string; contactPerson?: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string; contactPhone?: string; contactPerson?: string }>('/v1/kitty-circles/vendor-packages/inquire', payload);
    return res.data;
  },

  // Phase 5: Poll Voting
  castVote: async (postId: number, optionId: number): Promise<KittyPartyPost> => {
    const res = await apiClient.post<KittyPartyPost>(`/v1/kitty-posts/${postId}/vote`, { optionId });
    return res.data;
  },

  // List game rooms for a circle (used by Housie screen to find the active room)
  getCircleRooms: async (circleId: number): Promise<KittyPartyGameRoom[]> => {
    const res = await apiClient.get<KittyPartyGameRoom[]>(`/v1/kitty-games/circles/${circleId}/rooms`);
    return res.data;
  },

  // Start a Housie game room (host/admin only)
  startGame: async (roomId: number): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/v1/kitty-games/rooms/${roomId}/start`, {});
    return res.data;
  },

  // Accept a circle invitation by token
  acceptInvitation: async (inviteToken: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/v1/kitty-circles/invitations/accept', { inviteToken });
    return res.data;
  },

  // Verify a member's contribution (treasurer/admin)
  verifyContribution: async (contributionId: number): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/v1/kitty-ledger/contributions/${contributionId}/verify`, {});
    return res.data;
  },

  // Disburse payout to the cycle beneficiary (admin)
  disbursePayout: async (cycleId: number, periodNumber?: number): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/v1/kitty-ledger/cycles/${cycleId}/disburse`, { periodNumber });
    return res.data;
  },
};

