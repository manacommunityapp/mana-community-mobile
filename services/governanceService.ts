import api from './apiClient';
import type {
  GovernanceStatsDto,
  MeetingDto,
  ProposalDto,
  BallotDto,
  ResolutionDto,
  VaultDocumentDto,
} from '@/types/governance';

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
};

