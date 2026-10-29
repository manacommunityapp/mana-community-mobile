import api from './apiClient';
import type {
  GovernanceStatsDto,
  MeetingDto,
  ProposalDto,
  BallotDto,
  ResolutionDto,
  VaultDocumentDto,
} from '@/types/governance';

export type ElectionPhase = 'NOMINATION' | 'VOTING' | 'RESULTS' | 'UPCOMING';
export type MCPosition = 'PRESIDENT' | 'SECRETARY' | 'TREASURER' | 'JOINT_SECRETARY' | 'GENERAL_MEMBER';

export interface ElectionCandidate {
  id: string;
  name: string;
  flat: string;
  position: MCPosition;
  yearsInSociety: number;
  manifesto: string;
  votesCount?: number;
  hasUserVoted?: boolean;
  isWinner?: boolean;
}

export interface ElectionDto {
  id: string;
  title: string;
  phase: ElectionPhase;
  nominationDeadline: string;
  votingStart: string;
  votingEnd: string;
  totalEligibleVoters: number;
  totalVotesCast: number;
  hasUserVoted: boolean;
  userVotedCandidateId?: string;
  candidates: ElectionCandidate[];
  positions: MCPosition[];
  year: number;
}

const POSITION_LABELS: Record<MCPosition, string> = {
  PRESIDENT: 'President',
  SECRETARY: 'Secretary',
  TREASURER: 'Treasurer',
  JOINT_SECRETARY: 'Joint Secretary',
  GENERAL_MEMBER: 'General Member',
};

let inMemoryElections: ElectionDto[] = [
  {
    id: 'elect-2025',
    title: 'Managing Committee Elections 2025–26',
    phase: 'VOTING',
    nominationDeadline: new Date(Date.now() - 7 * 86400_000).toISOString(),
    votingStart: new Date(Date.now() - 2 * 86400_000).toISOString(),
    votingEnd: new Date(Date.now() + 5 * 86400_000).toISOString(),
    totalEligibleVoters: 180,
    totalVotesCast: 73,
    hasUserVoted: false,
    positions: ['PRESIDENT', 'SECRETARY', 'TREASURER', 'JOINT_SECRETARY', 'GENERAL_MEMBER'],
    year: 2025,
    candidates: [
      { id: 'c1', name: 'Ramesh Gupta', flat: 'A-1204', position: 'PRESIDENT', yearsInSociety: 8, manifesto: 'Committed to transparent governance, timely maintenance, and digital-first society management. Will establish monthly open-house sessions for all residents.', votesCount: 31 },
      { id: 'c2', name: 'Sunita Krishnaswamy', flat: 'B-0603', position: 'PRESIDENT', yearsInSociety: 5, manifesto: 'Bringing 15 years of corporate management experience. Focus on cost reduction, vendor accountability, and green initiatives across the campus.', votesCount: 26 },
      { id: 'c3', name: 'Priya Menon', flat: 'C-0902', position: 'SECRETARY', yearsInSociety: 6, manifesto: 'Seamless communication, MoM within 48 hrs, and a resident helpdesk with guaranteed response times. Every voice matters.', votesCount: 42 },
      { id: 'c4', name: 'Arjun Patel', flat: 'A-0301', position: 'SECRETARY', yearsInSociety: 3, manifesto: 'Digital-first record keeping and paperless AGMs. Let\'s make governance accessible for every resident, including those who are outstation.', votesCount: 18 },
      { id: 'c5', name: 'Vikram Joshi', flat: 'D-1501', position: 'TREASURER', yearsInSociety: 10, manifesto: 'Chartered accountant with 10 years in the society. Zero-leakage maintenance fund, quarterly audited statements, and zero arrears policy.', votesCount: 48 },
      { id: 'c6', name: 'Neha Sharma', flat: 'B-1102', position: 'JOINT_SECRETARY', yearsInSociety: 4, manifesto: 'Bridge between residents and the MC. Fast grievance redressal, active WhatsApp community management, and regular society events.', votesCount: 55 },
      { id: 'c7', name: 'Suresh Iyer', flat: 'C-0204', position: 'GENERAL_MEMBER', yearsInSociety: 7, manifesto: 'Focus on infrastructure — lifts, generators, water supply. Preventive maintenance schedules so residents are never surprised by breakdowns.', votesCount: 37 },
      { id: 'c8', name: 'Divya Nair', flat: 'A-0805', position: 'GENERAL_MEMBER', yearsInSociety: 2, manifesto: 'Young resident, fresh ideas. Community garden, children\'s zone upgrade, EV charging bays, and a resident app for everything.', votesCount: 29 },
    ],
  },
  {
    id: 'elect-2024',
    title: 'Managing Committee Elections 2024–25',
    phase: 'RESULTS',
    nominationDeadline: new Date('2024-03-01').toISOString(),
    votingStart: new Date('2024-03-10').toISOString(),
    votingEnd: new Date('2024-03-17').toISOString(),
    totalEligibleVoters: 175,
    totalVotesCast: 141,
    hasUserVoted: true,
    positions: ['PRESIDENT', 'SECRETARY', 'TREASURER', 'GENERAL_MEMBER'],
    year: 2024,
    candidates: [
      { id: 'p1', name: 'Ramesh Gupta', flat: 'A-1204', position: 'PRESIDENT', yearsInSociety: 7, manifesto: '', votesCount: 89, isWinner: true },
      { id: 'p2', name: 'Kavitha Reddy', flat: 'C-1103', position: 'PRESIDENT', yearsInSociety: 4, manifesto: '', votesCount: 52 },
      { id: 'p3', name: 'Priya Menon', flat: 'C-0902', position: 'SECRETARY', yearsInSociety: 5, manifesto: '', votesCount: 110, isWinner: true },
      { id: 'p4', name: 'Vikram Joshi', flat: 'D-1501', position: 'TREASURER', yearsInSociety: 9, manifesto: '', votesCount: 128, isWinner: true },
      { id: 'p5', name: 'Suresh Iyer', flat: 'C-0204', position: 'GENERAL_MEMBER', yearsInSociety: 6, manifesto: '', votesCount: 98, isWinner: true },
    ],
  },
];

// Fallback Mock Data for resilient offline / standalone experience
const MOCK_STATS: GovernanceStatsDto = {
  activeProposals: 0,
  openVotes: 0,
  upcomingMeetings: 0,
  passedResolutions: 0,
  communityQuorumRate: 0,
};

const MOCK_MEETINGS: MeetingDto[] = [];
const MOCK_PROPOSALS: ProposalDto[] = [];
const MOCK_BALLOTS: BallotDto[] = [];
const MOCK_RESOLUTIONS: ResolutionDto[] = [];
const MOCK_VAULT_DOCS: VaultDocumentDto[] = [];

let inMemoryProposals: ProposalDto[] = [];
let inMemoryBallots: BallotDto[] = [];
let inMemoryMeetings: MeetingDto[] = [];
export const governanceService = {
  async getStats(): Promise<GovernanceStatsDto> {
    try {
      const res = await api.get<GovernanceStatsDto>('/governance/stats');
      return res.data;
    } catch {
      return {
        ...MOCK_STATS,
        activeProposals: inMemoryProposals.length,
        openVotes: inMemoryBallots.filter((b) => b.status === 'ACTIVE').length,
        passedResolutions: MOCK_RESOLUTIONS.length,
      };
    }
  },

  async getMeetings(type?: 'AGM' | 'EGM' | 'PAST'): Promise<MeetingDto[]> {
    try {
      const res = await api.get<MeetingDto[]>('/governance/meetings', {
        params: { type },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getMeetingById(id: string): Promise<MeetingDto | undefined> {
    try {
      const res = await api.get<MeetingDto>(`/governance/meetings/${id}`);
      return res.data;
    } catch {
      return inMemoryMeetings.find((m) => m.id === id) || inMemoryMeetings[0];
    }
  },

  async confirmAttendance(meetingId: string, mode: 'PHYSICAL' | 'ONLINE' | 'PROXY', proxyNominee?: string): Promise<void> {
    try {
      await api.post(`/governance/meetings/${meetingId}/rsvp`, { mode, proxyNominee });
    } catch {
      inMemoryMeetings = inMemoryMeetings.map((m) => {
        if (m.id === meetingId) {
          const wasConfirmed = m.hasUserConfirmed;
          const nextCount = wasConfirmed ? m.quorumConfirmed : m.quorumConfirmed + 1;
          const nextPct = Number(((nextCount / m.quorumRequired) * 50).toFixed(1));
          return {
            ...m,
            hasUserConfirmed: true,
            attendanceMode: mode,
            proxyNominee: proxyNominee || m.proxyNominee,
            quorumConfirmed: nextCount,
            quorumPercentage: nextPct,
            isQuorumAchieved: nextCount >= m.quorumRequired,
          };
        }
        return m;
      });
    }
  },

  async getProposals(category?: string): Promise<ProposalDto[]> {
    try {
      const res = await api.get<ProposalDto[]>('/governance/proposals', {
        params: { category },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async supportProposal(proposalId: string): Promise<{ success: boolean; supportCount: number; hasUserSupported: boolean }> {
    try {
      const res = await api.post<{ success: boolean; supportCount: number; hasUserSupported: boolean }>(
        `/governance/proposals/${proposalId}/support`
      );
      return res.data;
    } catch {
      let count = 0;
      let supported = false;
      inMemoryProposals = inMemoryProposals.map((p) => {
        if (p.id === proposalId) {
          const willSupport = !p.hasUserSupported;
          const nextCount = willSupport ? p.supportCount + 1 : p.supportCount - 1;
          count = nextCount;
          supported = willSupport;
          return {
            ...p,
            supportCount: nextCount,
            hasUserSupported: willSupport,
            status: nextCount >= p.supportThreshold ? 'APPROVED_FOR_AGM' : p.status,
          };
        }
        return p;
      });
      return { success: true, supportCount: count, hasUserSupported: supported };
    }
  },

  async createProposal(data: Partial<ProposalDto>): Promise<ProposalDto> {
    try {
      const res = await api.post<ProposalDto>('/governance/proposals', data);
      return res.data;
    } catch {
      const newProp: ProposalDto = {
        id: `prop-${Date.now().toString().slice(-4)}`,
        title: data.title || 'Untitled Proposal',
        description: data.description || '',
        category: data.category || 'AMENITIES',
        type: data.type || 'PROPOSAL',
        estimatedCost: data.estimatedCost || '₹0',
        submittedBy: 'You (Owner)',
        submittedByFlat: 'Tower B - 1204',
        submittedDate: 'Just now',
        supportCount: 1,
        supportThreshold: 50,
        hasUserSupported: true,
        status: 'SUBMITTED',
        pros: data.pros && data.pros.length > 0 ? data.pros : ['Community enhancement initiative'],
        cons: data.cons && data.cons.length > 0 ? data.cons : [],
        committeeNotes: 'Awaiting initial sub-committee review.',
      };
      inMemoryProposals = [newProp, ...inMemoryProposals];
      return newProp;
    }
  },

  async getBallots(status?: 'ACTIVE' | 'CLOSED' | 'UPCOMING'): Promise<BallotDto[]> {
    try {
      const res = await api.get<BallotDto[]>('/governance/ballots', {
        params: { status },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async castVote(ballotId: string, optionId: string): Promise<{ receiptHash: string }> {
    const generatedHash = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    try {
      const res = await api.post<{ receiptHash: string }>(`/governance/ballots/${ballotId}/vote`, { optionId });
      return res.data;
    } catch {
      inMemoryBallots = inMemoryBallots.map((b) => {
        if (b.id === ballotId) {
          const totalVotes = b.totalVotesCast + 1;
          const nextTurnout = Number(((totalVotes / b.totalEligibleVoters) * 100).toFixed(1));
          const updatedOptions = b.options.map((opt) => {
            const isChosen = opt.id === optionId;
            const votes = isChosen ? opt.votesCount + 1 : opt.votesCount;
            return {
              ...opt,
              votesCount: votes,
              percentage: Number(((votes / totalVotes) * 100).toFixed(1)),
            };
          });
          return {
            ...b,
            hasUserVoted: true,
            userVotedOptionId: optionId,
            voteReceiptHash: generatedHash,
            totalVotesCast: totalVotes,
            turnoutPercentage: nextTurnout,
            isQuorumReached: nextTurnout >= b.minQuorumPercentage,
            options: updatedOptions,
          };
        }
        return b;
      });
      return { receiptHash: generatedHash };
    }
  },

  async getResolutions(search?: string): Promise<ResolutionDto[]> {
    try {
      const res = await api.get<ResolutionDto[]>('/governance/resolutions', {
        params: { search },
      });
      return res.data;
    } catch {
      return [];
    }
  },

  async getVaultDocuments(category?: string, search?: string): Promise<VaultDocumentDto[]> {
    try {
      const res = await api.get<VaultDocumentDto[]>('/governance/vault', {
        params: { category, search },
      });
      return res.data;
    } catch {
      return [];
    }
  },

  async getElections(): Promise<ElectionDto[]> {
    try {
      const res = await api.get<ElectionDto[]>('/governance/elections');
      return res.data ?? inMemoryElections;
    } catch {
      return inMemoryElections;
    }
  },

  async castElectionVote(
    electionId: string,
    votes: { position: MCPosition; candidateId: string }[],
  ): Promise<{ receiptHash: string }> {
    const hash = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    try {
      const res = await api.post<{ receiptHash: string }>(`/governance/elections/${electionId}/vote`, { votes });
      return res.data;
    } catch {
      inMemoryElections = inMemoryElections.map(e => {
        if (e.id !== electionId) return e;
        const votedIds = new Set(votes.map(v => v.candidateId));
        return {
          ...e,
          hasUserVoted: true,
          totalVotesCast: e.totalVotesCast + 1,
          candidates: e.candidates.map(c => ({
            ...c,
            votesCount: votedIds.has(c.id) ? (c.votesCount ?? 0) + 1 : c.votesCount,
          })),
        };
      });
      return { receiptHash: hash };
    }
  },

  POSITION_LABELS,
};

