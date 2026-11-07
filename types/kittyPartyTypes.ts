export type CircleCategory = 'KITTY' | 'LADIES_CLUB' | 'FAMILY' | 'FRIENDS' | 'HOBBY' | 'PROFESSIONAL';
export type PrivacyType = 'COMMUNITY_PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type CircleStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type MemberRole = 'OWNER' | 'ADMIN' | 'TREASURER' | 'HOST' | 'MEMBER';
export type MembershipStatus = 'REQUESTED' | 'INVITED' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'LEFT' | 'REMOVED';

export interface KittyPartyCircleSummary {
  id: number;
  communityId: number;
  circleName: string;
  description?: string;
  categoryCode: CircleCategory;
  privacyType: PrivacyType;
  approvalRequired: boolean;
  maxMembers: number;
  currentMembersCount: number;
  status: CircleStatus;
  createdById: number;
  createdByName: string;
  createdAt: string;
  currentUserRole?: MemberRole;
}

export interface KittyPartyMember {
  memberId: number;
  userId: number;
  fullName: string;
  phone?: string;
  roleCode: MemberRole;
  membershipStatus: MembershipStatus;
  joinedAt?: string;
}

export interface KittyPartyCycle {
  id: number;
  circleId: number;
  cycleName: string;
  contributionAmount: number;
  frequency: string;
  memberCount: number;
  startDate: string;
  endDate?: string;
  financialMode: string;
  status: string;
  totalExpectedPerPeriod: number;
  totalExpectedFullCycle?: number;
  totalCollectedCurrentPeriod?: number;
  totalCollectedFullCycle?: number;
  pendingContributionsAmount?: number;
  pendingContributionsCount?: number;
  paidContributionsCount?: number;
  currentPeriod: number;
  currentBeneficiaryUserId?: number;
  currentBeneficiaryName?: string;
  nextBeneficiaryUserId?: number;
  nextBeneficiaryName?: string;
  previousPayoutsCount?: number;
  previousPayoutsTotalAmount?: number;
  cycleProgressPercent?: number;
  rotations: KittyPartyRotationEntry[];
}

export interface KittyPartyRotationEntry {
  periodNumber: number;
  beneficiaryUserId: number;
  beneficiaryName: string;
  rotationStatus: 'PLANNED' | 'DISBURSED' | 'SKIPPED' | 'SWAPPED';
  disbursedAt?: string;
  externalPayoutRef?: string;
}

export interface KittyPartyContribution {
  id: number;
  cycleId: number;
  memberUserId: number;
  memberName: string;
  periodNumber: number;
  expectedAmount: number;
  recordedAmount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'VERIFIED' | 'DEFAULTED';
  externalRef?: string;
  receiptUrl?: string;
  notes?: string;
  verifiedByName?: string;
  verifiedAt?: string;
}

export interface KittyPartyGameRoom {
  id: number;
  circleId: number;
  roomName: string;
  gameType: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  maxPlayers: number;
  activePlayersCount: number;
  createdById: number;
  createdByName: string;
  startedAt?: string;
  completedAt?: string;
  lastCalledNumber?: number;
  calledNumbers: number[];
  winners: KittyPartyWinnerClaim[];
}

export interface KittyPartyTicket {
  ticketId: number;
  roomId: number;
  playerId: number;
  matrix: number[][]; // 3x9 grid
  ticketHash: string;
}

export interface KittyPartyWinnerClaim {
  id: number;
  roomId: number;
  ticketId: number;
  userId: number;
  userName: string;
  claimType: 'EARLY_FIVE' | 'FOUR_CORNERS' | 'TOP_LINE' | 'MIDDLE_LINE' | 'BOTTOM_LINE' | 'FULL_HOUSE';
  claimStatus: 'PENDING' | 'VALIDATED' | 'BOGUS';
  claimedAt: string;
}

export interface KittyPartyExpenseShare {
  id: number;
  expenseId: number;
  expenseDescription: string;
  totalExpenseAmount: number;
  userId: number;
  userName: string;
  shareAmount: number;
  settlementStatus: 'PENDING' | 'SETTLED' | 'WAIVED';
  settledAt?: string;
  settlementRef?: string;
}
