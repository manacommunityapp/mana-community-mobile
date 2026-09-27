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
  status: 'PENDING' | 'DISCUSSED' | 'VOTING_OPEN' | 'APPROVED';
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
  quorumConfirmed: number;
  quorumRequired: number;
  quorumPercentage: number;
  isQuorumAchieved: boolean;
  hasUserConfirmed: boolean;
  attendanceMode: 'PHYSICAL' | 'ONLINE';
  annualReportUrl?: string;
  agenda: AgendaItemDto[];
}

export interface ProposalDto {
  id: string;
  title: string;
  description: string;
  category: 'INFRASTRUCTURE' | 'ENVIRONMENT' | 'AMENITIES' | 'SECURITY' | 'FINANCE' | 'RULES';
  estimatedCost: string;
  submittedBy: string;
  submittedDate: string;
  supportCount: number;
  hasUserSupported: boolean;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED_FOR_AGM' | 'REJECTED' | 'PASSED';
  pros?: string[];
  cons?: string[];
}

export interface BallotOptionDto {
  id: string;
  text: string;
  votesCount: number;
  percentage: number;
}

export interface BallotDto {
  id: string;
  title: string;
  category: string;
  description: string;
  startDate: string;
  endDate: string;
  totalEligibleVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  minQuorumPercentage: number;
  isQuorumReached: boolean;
  hasUserVoted: boolean;
  userVotedOptionId?: string;
  status: 'ACTIVE' | 'CLOSED' | 'UPCOMING';
  options: BallotOptionDto[];
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
}
