export interface GovernanceStatsDto {
  upcomingMeetings: number;
  activeProposals: number;
  openVotes: number;
  passedResolutions: number;
  actionItemsOpen: number;
  myMeetingsAttended: number;
  myVotesRecorded: number;
}

export interface AgendaItemDto {
  id: number;
  order: number;
  title: string;
  presenter: string;
  duration: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DISCUSSED' | 'VOTING_OPEN' | 'APPROVED';
  notes?: string;
  attachmentName?: string;
}

export interface MeetingDto {
  id: string;
  type: 'AGM' | 'EGM' | 'COMMITTEE';
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  meetingLink?: string;
  status: 'UPCOMING' | 'LIVE_NOW' | 'CONCLUDED';
  quorumConfirmed: number;
  quorumRequired: number;
  quorumPercentage: number;
  isQuorumAchieved: boolean;
  hasUserConfirmed: boolean;
  attendanceMode: 'PHYSICAL' | 'ONLINE' | 'PROXY';
  proxyNominee?: string;
  annualReportUrl?: string;
  minutesUrl?: string;
  agenda: AgendaItemDto[];
  liveMinutes?: {
    id: string;
    timestamp: string;
    speaker: string;
    content: string;
  }[];
}

export interface ProposalDto {
  id: string;
  title: string;
  description: string;
  category: 'INFRASTRUCTURE' | 'ENVIRONMENT' | 'AMENITIES' | 'SECURITY' | 'FINANCE' | 'RULES';
  type: 'PROPOSAL' | 'GRIEVANCE';
  estimatedCost: string;
  submittedBy: string;
  submittedByFlat?: string;
  submittedDate: string;
  supportCount: number;
  supportThreshold: number;
  hasUserSupported: boolean;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED_FOR_AGM' | 'REJECTED' | 'PASSED';
  pros?: string[];
  cons?: string[];
  committeeNotes?: string;
}

export interface BallotOptionDto {
  id: string;
  text: string;
  votesCount: number;
  percentage: number;
  description?: string;
}

export interface BallotDto {
  id: string;
  title: string;
  category: string;
  description: string;
  resolutionMotionText: string;
  startDate: string;
  endDate: string;
  totalEligibleVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  minQuorumPercentage: number;
  isQuorumReached: boolean;
  hasUserVoted: boolean;
  userVotedOptionId?: string;
  voteReceiptHash?: string;
  status: 'ACTIVE' | 'CLOSED' | 'UPCOMING';
  options: BallotOptionDto[];
  wingBreakdown?: {
    wing: string;
    voted: number;
    total: number;
  }[];
}

export interface ResolutionDto {
  id: string;
  resolutionNumber: string;
  title: string;
  meetingReference: string;
  passedDate: string;
  category: string;
  approvedBudget?: string;
  status: 'PASSED' | 'IN_IMPLEMENTATION' | 'COMPLETED';
  votingSummary: {
    forVotes: number;
    againstVotes: number;
    abstained: number;
    totalPercentageFor: number;
  };
  keyProvisions: string[];
  presidingOfficer: string;
  legalBindingStatement?: string;
  documentUrl?: string;
}

export interface VaultDocumentDto {
  id: string;
  title: string;
  category: 'BYLAWS' | 'AUDIT' | 'MINUTES' | 'FORMS' | 'LEGAL';
  fileSize: string;
  fileFormat: string;
  lastUpdated: string;
  documentUrl: string;
  isConfidential: boolean;
  resolutionRef?: string;
  digitalSealVerified: boolean;
}
