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
  allowExternalMembers?: boolean;
  maxExternalMembers?: number;
  externalMembersCount?: number;
}

export interface KittyPartyMember {
  memberId: number;
  userId: number;
  fullName: string;
  phone?: string;
  roleCode: MemberRole;
  membershipStatus: MembershipStatus;
  joinedAt?: string;
  flatUnit?: string;
  isExternal?: boolean;
  sponsorUserId?: number;
  sponsorName?: string;
  externalSocietyName?: string;
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
  overdueContributionsCount?: number;
  overdueContributionsAmount?: number;
  currentPeriod: number;
  currentBeneficiaryUserId?: number;
  currentBeneficiaryName?: string;
  beneficiaryUpiId?: string;
  upiDeeplink?: string;
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
  swapReason?: string;
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
  dueDate?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
}

export interface SwapRotationRequest {
  fromPeriod: number;
  toPeriod: number;
  reason: string;
}

export interface ReplaceMemberRequest {
  oldUserId: number;
  newUserId: number;
  reason: string;
}

export interface SendRemindersResponse {
  periodNumber: number;
  remindedCount: number;
  remindedMembers: string[];
  message: string;
}

export interface KittyPartyAuditLog {
  id: number;
  cycleId: number;
  circleId: number;
  eventType: string;
  actorId: number;
  actorName: string;
  description: string;
  metadataJson?: string;
  prevHash?: string;
  currHash: string;
  createdAt: string;
}

export interface KittyPartyDispute {
  id: number;
  circleId: number;
  cycleId?: number;
  raisedById: number;
  raisedByName: string;
  disputeType: 'PAYMENT_UNRECOGNIZED' | 'PAYOUT_DELAY' | 'AMOUNT_MISMATCH' | 'RULE_VIOLATION' | 'OTHER';
  title: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes?: string;
  resolvedById?: number;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisputeRequest {
  cycleId?: number;
  disputeType: string;
  title: string;
  description: string;
}

export interface ResolveDisputeRequest {
  status: string;
  resolutionNotes: string;
}

export interface StatementLineItem {
  memberUserId: number;
  memberName: string;
  expectedAmount: number;
  recordedAmount?: number;
  paymentStatus: string;
  externalRef?: string;
  receiptUrl?: string;
  notes?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
}

export interface MonthlyStatementResponse {
  cycleId: number;
  circleId: number;
  circleName: string;
  cycleName: string;
  periodNumber: number;
  periodStartDate: string;
  periodDueDate: string;
  contributionAmount: number;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  beneficiaryUserId?: number;
  beneficiaryName?: string;
  payoutStatus: string;
  externalPayoutRef?: string;
  payoutDisbursedAt?: string;
  lineItems: StatementLineItem[];
  legalDisclaimer: string;
}

export interface KittyPartyGameRoom {
  id: number;
  circleId: number;
  roomName: string;
  gameType: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  roomCode?: string;
  allowGuestPlayers?: boolean;
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

export type KittyPartyEventType = 'KITTY_MONTHLY' | 'THEMED_PARTY' | 'CASUAL_MEETUP' | 'FESTIVAL_CELEBRATION' | 'OTHER';
export type KittyPartyVenueType = 'HOST_HOME' | 'COMMUNITY_HALL' | 'RESTAURANT' | 'ONLINE_VIRTUAL' | 'OTHER';
export type KittyPartyEventStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type KittyPartyRsvpResponse = 'GOING' | 'NOT_GOING' | 'MAYBE' | 'WAITLISTED';
export type KittyPartyAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface KittyPartyEvent {
  id: number;
  circleId: number;
  circleName: string;
  eventName: string;
  description?: string;
  eventType: KittyPartyEventType;
  startTime: string;
  endTime: string;
  timezone: string;
  venueType: KittyPartyVenueType;
  venueAddress?: string;
  hostUserId?: number;
  hostName?: string;
  maxAttendees?: number;
  recurrenceRule: string;
  status: KittyPartyEventStatus;
  goingCount: number;
  maybeCount: number;
  notGoingCount: number;
  currentUserRsvp?: KittyPartyRsvpResponse;
  gatePassCode?: string;
  gatePassGeneratedAt?: string;
  createdById: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KittyPartyRsvp {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  response: KittyPartyRsvpResponse;
  guestCount: number;
  notes?: string;
  gatePassCode?: string;
  gatePassGeneratedAt?: string;
  updatedAt: string;
}

export interface KittyPartyAttendance {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  attendanceStatus: KittyPartyAttendanceStatus;
  markedById?: number;
  markedByName?: string;
  markedAt: string;
}

export interface CreateKittyPartyEventRequest {
  eventName: string;
  description?: string;
  eventType?: KittyPartyEventType;
  startTime: string;
  endTime: string;
  timezone?: string;
  venueType?: KittyPartyVenueType;
  venueAddress?: string;
  hostUserId?: number;
  maxAttendees?: number;
  recurrenceRule?: string;
}

export interface KittyPartyRsvpRequest {
  response: KittyPartyRsvpResponse;
  guestCount?: number;
  notes?: string;
}

export interface KittyPartyAttendanceRequest {
  userId: number;
  attendanceStatus: KittyPartyAttendanceStatus;
}

export type KittyPartyPostType = 'TEXT' | 'ANNOUNCEMENT' | 'PHOTO' | 'POLL';
export type KittyPartyPostStatus = 'PUBLISHED' | 'PINNED' | 'ARCHIVED' | 'DELETED';

export interface KittyPartyPollOption {
  id: number;
  optionText: string;
  voteCount: number;
  percentage: number;
  userVoted: boolean;
}

export interface KittyPartyPost {
  id: number;
  circleId: number;
  circleName: string;
  authorId: number;
  authorName: string;
  postType: KittyPartyPostType;
  title?: string;
  content: string;
  attachmentUrl?: string;
  isPinned: boolean;
  status: KittyPartyPostStatus;
  commentsCount: number;
  pollOptions?: KittyPartyPollOption[];
  userVotedOptionId?: number;
  totalVotes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KittyPartyPostComment {
  id: number;
  postId: number;
  userId: number;
  userName: string;
  commentText: string;
  createdAt: string;
}

export interface CreateKittyPartyPostRequest {
  postType?: KittyPartyPostType;
  title?: string;
  content: string;
  attachmentUrl?: string;
  isPinned?: boolean;
  pollOptions?: string[];
}

export interface CreateKittyPartyCommentRequest {
  commentText: string;
}

export interface CastVoteRequest {
  optionId: number;
}

// Phase 5: Housie Circle Leaderboard & Trophies
export interface KittyPartyLeaderboardEntry {
  userId: number;
  userName: string;
  flatDetails?: string;
  avatarUrl?: string;
  rank: number;
  totalGamesPlayed: number;
  totalWins: number;
  totalPoints: number;
  winBreakdown: Record<string, number>;
  badges: string[];
}

export interface KittyPartyCircleLeaderboardResponse {
  circleId: number;
  circleName: string;
  totalGamesInCircle: number;
  entries: KittyPartyLeaderboardEntry[];
}

// Phase 5: Curated Party Vendor Packages
export type VendorPackageCategory = 'CATERING' | 'CAKES_DESSERTS' | 'BALLOON_DECOR' | 'EMCEE_ENTERTAINMENT' | 'PHOTOGRAPHY' | 'OTHER';

export interface KittyPartyVendorPackage {
  id: number;
  communityId: number;
  vendorId?: number;
  category: VendorPackageCategory;
  packageName: string;
  description?: string;
  priceRange?: string;
  contactPerson?: string;
  contactPhone?: string;
  sampleMenu?: string;
  rating?: number;
  isActive: boolean;
}

export interface InquireVendorPackageRequest {
  packageId: number;
  eventId?: number;
  preferredDate?: string;
  estimatedGuests?: number;
  notes?: string;
}

export interface JoinByCodeRequest {
  roomCode: string;
}


