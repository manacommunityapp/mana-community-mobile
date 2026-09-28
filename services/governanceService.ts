import api from './apiClient';
import type {
  GovernanceStatsDto,
  MeetingDto,
  ProposalDto,
  BallotDto,
  ResolutionDto,
  VaultDocumentDto,
} from '@/types/governance';

export const governanceService = {
  async getStats(): Promise<GovernanceStatsDto> {
    const res = await api.get<GovernanceStatsDto>('/governance/stats');
    return res.data;
  },

  async getMeetings(type?: 'AGM' | 'EGM' | 'PAST'): Promise<MeetingDto[]> {
    const res = await api.get<MeetingDto[]>('/governance/meetings', {
      params: { type },
    });
    return res.data;
  },

  async confirmAttendance(meetingId: string, mode: 'PHYSICAL' | 'ONLINE'): Promise<void> {
    await api.post(`/governance/meetings/${meetingId}/rsvp`, { mode });
  },

  async getProposals(category?: string): Promise<ProposalDto[]> {
    const res = await api.get<ProposalDto[]>('/governance/proposals', {
      params: { category },
    });
    return res.data;
  },

  async supportProposal(proposalId: string): Promise<void> {
    await api.post(`/governance/proposals/${proposalId}/support`);
  },

  async createProposal(data: Partial<ProposalDto>): Promise<ProposalDto> {
    const res = await api.post<ProposalDto>('/governance/proposals', data);
    return res.data;
  },

  async getBallots(): Promise<BallotDto[]> {
    const res = await api.get<BallotDto[]>('/governance/ballots');
    return res.data;
  },

  async castVote(ballotId: string, optionId: string): Promise<void> {
    await api.post(`/governance/ballots/${ballotId}/vote`, { optionId });
  },

  async getResolutions(): Promise<ResolutionDto[]> {
    const res = await api.get<ResolutionDto[]>('/governance/resolutions');
    return res.data;
  },

  async getVaultDocuments(category?: string): Promise<VaultDocumentDto[]> {
    const res = await api.get<VaultDocumentDto[]>('/governance/vault', {
      params: { category },
    });
    return res.data;
  },
};
