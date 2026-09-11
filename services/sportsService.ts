import api from './apiClient';
import type {
  TournamentDto, TeamDto, MatchDto, MatchEventDto,
  StandingDto, RegisterTeamRequest, PageResponse, SportType,
} from '@/types/api';

export const sportsService = {
  // ── Tournaments ───────────────────────────────────────────────
  async getTournaments(
    sport?: SportType,
    status?: string,
    page = 0,
  ): Promise<PageResponse<TournamentDto>> {
    const res = await api.get<PageResponse<TournamentDto>>('/sports/tournaments', {
      params: { sport, status, page, size: 20 },
    });
    return res.data;
  },

  async getTournament(id: number): Promise<TournamentDto> {
    const res = await api.get<TournamentDto>(`/sports/tournaments/${id}`);
    return res.data;
  },

  async getMyTournaments(): Promise<TournamentDto[]> {
    const res = await api.get<TournamentDto[]>('/sports/tournaments/my');
    return res.data;
  },

  // ── Teams ─────────────────────────────────────────────────────
  async getTeams(tournamentId: number): Promise<TeamDto[]> {
    const res = await api.get<TeamDto[]>(`/sports/tournaments/${tournamentId}/teams`);
    return res.data;
  },

  async getMyTeams(): Promise<TeamDto[]> {
    const res = await api.get<TeamDto[]>('/sports/teams/my');
    return res.data;
  },

  async registerTeam(data: RegisterTeamRequest): Promise<TeamDto> {
    const res = await api.post<TeamDto>('/sports/teams', data);
    return res.data;
  },

  async leaveTeam(teamId: number): Promise<void> {
    await api.delete(`/sports/teams/${teamId}/leave`);
  },

  async dissolveTeam(teamId: number): Promise<void> {
    await api.delete(`/sports/teams/${teamId}`);
  },

  async addTeamMember(teamId: number, userId: number): Promise<void> {
    await api.post(`/sports/teams/${teamId}/members`, { userId });
  },

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    await api.delete(`/sports/teams/${teamId}/members/${userId}`);
  },

  // ── Matches ───────────────────────────────────────────────────
  async getMatches(
    tournamentId?: number,
    date?: string,
    status?: string,
    page = 0,
  ): Promise<PageResponse<MatchDto>> {
    const res = await api.get<PageResponse<MatchDto>>('/sports/matches', {
      params: { tournamentId, date, status, page, size: 30 },
    });
    return res.data;
  },

  async getLiveMatches(): Promise<MatchDto[]> {
    const res = await api.get<MatchDto[]>('/sports/matches/live');
    return res.data;
  },

  async getTodayMatches(): Promise<MatchDto[]> {
    const res = await api.get<MatchDto[]>('/sports/matches/today');
    return res.data;
  },

  async getMatch(id: number): Promise<MatchDto> {
    const res = await api.get<MatchDto>(`/sports/matches/${id}`);
    return res.data;
  },

  async getMatchEvents(matchId: number): Promise<MatchEventDto[]> {
    const res = await api.get<MatchEventDto[]>(`/sports/matches/${matchId}/events`);
    return res.data;
  },

  // ── Standings ─────────────────────────────────────────────────
  async getStandings(tournamentId: number): Promise<StandingDto[]> {
    const res = await api.get<StandingDto[]>(`/sports/tournaments/${tournamentId}/standings`);
    return res.data;
  },
};
