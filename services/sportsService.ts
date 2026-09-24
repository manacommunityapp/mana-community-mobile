import api from './apiClient';
import type {
  TournamentDto, TeamDto, MatchDto, MatchEventDto,
  StandingDto, RegisterTeamRequest, PageResponse, SportType,
  CricketScorecardDto, PlayerProfileDto, BadgeDto,
  LeaderboardEntryDto, LeaderboardCategory, MatchPhotoDto,
  MatchRatingSummaryDto, SubmitRatingsRequest,
} from '@/types/api';

export const sportsService = {
  // ── Tournaments ───────────────────────────────────────────────
  // Backend: GET /api/sports/tournaments/community (with filters as query params)
  async getTournaments(
    sport?: SportType,
    status?: string,
    page = 0,
  ): Promise<PageResponse<TournamentDto>> {
    const res = await api.get<PageResponse<TournamentDto>>('/sports/tournaments/community', {
      params: { sport, status, page, size: 20 },
    });
    return res.data;
  },

  // Backend: GET /api/sports/events/{id}
  async getTournament(id: number): Promise<TournamentDto> {
    const res = await api.get<TournamentDto>(`/sports/events/${id}`);
    return res.data;
  },

  async getMyTournaments(): Promise<TournamentDto[]> {
    const res = await api.get<TournamentDto[]>('/sports/tournaments/mine');
    return res.data;
  },

  // ── Teams ─────────────────────────────────────────────────────
  // Backend: GET /api/sports/events/{tournamentId}/registrations
  async getTeams(tournamentId: number): Promise<TeamDto[]> {
    const res = await api.get<TeamDto[]>(`/sports/events/${tournamentId}/registrations`);
    return res.data;
  },

  // Backend: GET /api/sports/registrations/mine
  async getMyTeams(): Promise<TeamDto[]> {
    const res = await api.get<TeamDto[]>('/sports/registrations/mine');
    return res.data;
  },

  // Backend: POST /api/sports/register
  async registerTeam(data: RegisterTeamRequest): Promise<TeamDto> {
    const res = await api.post<TeamDto>('/sports/register', data);
    return res.data;
  },

  async leaveTeam(teamId: number): Promise<void> {
    await api.delete(`/sports/register/${teamId}`);
  },

  async dissolveTeam(teamId: number): Promise<void> {
    await api.delete(`/sports/register/${teamId}`);
  },

  // ── Matches ───────────────────────────────────────────────────
  // Mobile bridge endpoints (SportsMobileController)
  async getMatches(
    tournamentId?: number,
    date?: string,
    status?: string,
    page = 0,
  ): Promise<PageResponse<MatchDto>> {
    const res = await api.get<PageResponse<MatchDto>>('/sports/mobile/matches', {
      params: { tournamentId, date, status, page, size: 30 },
    });
    return res.data;
  },

  async getLiveMatches(): Promise<MatchDto[]> {
    const res = await api.get<MatchDto[]>('/sports/mobile/matches/live');
    return res.data;
  },

  async getTodayMatches(): Promise<MatchDto[]> {
    const res = await api.get<MatchDto[]>('/sports/mobile/matches/today');
    return res.data;
  },

  async getMatch(id: number): Promise<MatchDto> {
    const res = await api.get<MatchDto>(`/sports/mobile/matches/${id}`);
    return res.data;
  },

  async getMatchEvents(matchId: number): Promise<MatchEventDto[]> {
    const res = await api.get<MatchEventDto[]>(`/sports/mobile/matches/${matchId}/events`);
    return res.data;
  },

  // ── Standings ─────────────────────────────────────────────────
  // Backend: GET /api/sports/rankings
  async getStandings(tournamentId: number): Promise<StandingDto[]> {
    const res = await api.get<StandingDto[]>('/sports/rankings', {
      params: { tournamentId },
    });
    return res.data;
  },

  // ── Scorecard ─────────────────────────────────────────────────
  async getScorecard(matchId: number): Promise<CricketScorecardDto> {
    const res = await api.get<CricketScorecardDto>(`/sports/matches/${matchId}/scorecard`);
    return res.data;
  },

  async saveScorecard(matchId: number, data: any): Promise<CricketScorecardDto> {
    const res = await api.put<CricketScorecardDto>(`/sports/matches/${matchId}/scorecard`, data);
    return res.data;
  },

  // ── Player Profile ────────────────────────────────────────────
  async getPlayerProfile(userId: number): Promise<PlayerProfileDto> {
    const res = await api.get<PlayerProfileDto>(`/sports/players/${userId}`);
    return res.data;
  },

  async getMyProfile(): Promise<PlayerProfileDto> {
    const res = await api.get<PlayerProfileDto>('/sports/players/me');
    return res.data;
  },

  // ── Leaderboard ───────────────────────────────────────────────
  async getLeaderboard(
    sport: SportType | 'ALL',
    category: LeaderboardCategory,
    period: 'MONTH' | 'SEASON' | 'ALL_TIME' = 'ALL_TIME',
  ): Promise<LeaderboardEntryDto[]> {
    const res = await api.get<LeaderboardEntryDto[]>('/sports/leaderboard', {
      params: { sport: sport === 'ALL' ? undefined : sport, category, period },
    });
    return res.data;
  },

  // ── Badges ────────────────────────────────────────────────────
  async getAllBadges(): Promise<BadgeDto[]> {
    const res = await api.get<BadgeDto[]>('/sports/badges');
    return res.data;
  },

  async getPlayerBadges(userId: number): Promise<BadgeDto[]> {
    const res = await api.get<BadgeDto[]>(`/sports/players/${userId}/badges`);
    return res.data;
  },

  // ── Photos ────────────────────────────────────────────────────
  async getMatchPhotos(matchId: number): Promise<MatchPhotoDto[]> {
    const res = await api.get<MatchPhotoDto[]>(`/sports/matches/${matchId}/photos`);
    return res.data;
  },

  async uploadMatchPhoto(matchId: number, localUri: string, caption?: string): Promise<MatchPhotoDto> {
    const filename = localUri.split('/').pop() ?? 'photo.jpg';
    const form = new FormData();
    form.append('file', { uri: localUri, name: filename, type: 'image/jpeg' } as any);
    if (caption) form.append('caption', caption);
    const res = await api.post<MatchPhotoDto>(`/sports/matches/${matchId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async togglePhotoLike(matchId: number, photoId: number): Promise<void> {
    await api.post(`/sports/matches/${matchId}/photos/${photoId}/like`);
  },

  async deleteMatchPhoto(matchId: number, photoId: number): Promise<void> {
    await api.delete(`/sports/matches/${matchId}/photos/${photoId}`);
  },

  // ── Peer Ratings ──────────────────────────────────────────────
  async getMatchRatings(matchId: number): Promise<MatchRatingSummaryDto> {
    const res = await api.get<MatchRatingSummaryDto>(`/sports/matches/${matchId}/ratings`);
    return res.data;
  },

  async submitMatchRatings(matchId: number, data: SubmitRatingsRequest): Promise<void> {
    await api.post(`/sports/matches/${matchId}/ratings`, data);
  },
};

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

  // ── Live Scoring & Umpire Actions ─────────────────────────────
  async recordCricketBall(matchId: number, data: import('@/types/api').BallEventRequest): Promise<any> {
    try {
      const res = await api.post(`/tournament/match/${matchId}/ball`, data);
      return res.data;
    } catch {
      // Fallback for standalone / mock mode
      const res = await api.post(`/sports/matches/${matchId}/events`, data);
      return res.data;
    }
  },

  async undoCricketBall(matchId: number, inningsNumber = 1): Promise<any> {
    const res = await api.post(`/tournament/match/${matchId}/undo`, null, {
      params: { inningsNumber },
    });
    return res.data;
  },

  async recordGenericScore(data: import('@/types/api').GenericScoreRequest): Promise<any> {
    try {
      const res = await api.post('/tournament/match/generic/score', data);
      return res.data;
    } catch {
      const res = await api.post(`/sports/matches/${data.matchId}/events`, data);
      return res.data;
    }
  },

  async undoGenericScore(matchId: number): Promise<any> {
    const res = await api.post(`/tournament/match/generic/${matchId}/undo`);
    return res.data;
  },

  async completeGenericPeriod(matchId: number, periodNumber: number): Promise<void> {
    await api.post(`/tournament/match/generic/${matchId}/period/${periodNumber}/complete`);
  },

  async recordPeriodScore(matchId: number, periodNumber: number, scoreA: number, scoreB: number): Promise<any> {
    const res = await api.post(`/tournament/match/generic/${matchId}/period/${periodNumber}/score`, { scoreA, scoreB });
    return res.data;
  },

  async updateMatchStatus(matchId: number, status: string): Promise<MatchDto> {
    const res = await api.patch<MatchDto>(`/sports/matches/${matchId}`, { status });
    return res.data;
  },

  // ── Standings ─────────────────────────────────────────────────
  async getStandings(tournamentId: number): Promise<StandingDto[]> {
    const res = await api.get<StandingDto[]>(`/sports/tournaments/${tournamentId}/standings`);
    return res.data;
  },

  // ── Dashboard & Event Registrations ───────────────────────────
  async getDashboard(): Promise<import('@/types/api').SportsDashboardResponseDto> {
    const res = await api.get<import('@/types/api').SportsDashboardResponseDto>('/sports/dashboard');
    return res.data;
  },

  async getDashboardStats(): Promise<import('@/types/api').DashboardStatsDto> {
    const res = await api.get<import('@/types/api').DashboardStatsDto>('/sports/dashboard/stats');
    return res.data;
  },

  async getUpcomingEvents(): Promise<import('@/types/api').DashboardUpcomingEventDto[]> {
    const res = await api.get<import('@/types/api').DashboardUpcomingEventDto[]>('/sports/dashboard/upcoming-events');
    return res.data;
  },

  async getOpenTournaments(): Promise<import('@/types/api').DashboardTournamentCardDto[]> {
    const res = await api.get<import('@/types/api').DashboardTournamentCardDto[]>('/sports/tournaments/open');
    return res.data;
  },

  async getClosedTournaments(): Promise<import('@/types/api').DashboardTournamentCardDto[]> {
    const res = await api.get<import('@/types/api').DashboardTournamentCardDto[]>('/sports/tournaments/closed');
    return res.data;
  },

  async getMyRegistrations(): Promise<import('@/types/api').DashboardMyRegistrationDto[]> {
    const res = await api.get<import('@/types/api').DashboardMyRegistrationDto[]>('/sports/dashboard/my-registrations');
    return res.data;
  },

  async registerForEvent(
    eventId: number,
    data: import('@/types/api').SportsEventRegistrationRequest
  ): Promise<import('@/types/api').SportsRegistrationResponseDto> {
    const res = await api.post<import('@/types/api').SportsRegistrationResponseDto>(`/sports/events/${eventId}/register`, data);
    return res.data;
  },
};

  // ── Cricket Scorecard ────────────────────────────────────────
  async getScorecard(matchId: number): Promise<CricketScorecardDto> {
    const res = await api.get<CricketScorecardDto>(`/sports/matches/${matchId}/scorecard`);
    return res.data;
  },

  async saveScorecard(matchId: number, data: any): Promise<CricketScorecardDto> {
    const res = await api.put<CricketScorecardDto>(`/sports/matches/${matchId}/scorecard`, data);
    return res.data;
  },

  // ── Player Profile & Career Stats ────────────────────────────
  async getPlayerProfile(userId: number): Promise<PlayerProfileDto> {
    const res = await api.get<PlayerProfileDto>(`/sports/players/${userId}`);
    return res.data;
  },

  async getMyProfile(): Promise<PlayerProfileDto> {
    const res = await api.get<PlayerProfileDto>('/sports/players/me');
    return res.data;
  },

  // ── Leaderboard ──────────────────────────────────────────────
  async getLeaderboard(
    sport: SportType | 'ALL',
    category: LeaderboardCategory,
    period: 'MONTH' | 'SEASON' | 'ALL_TIME' = 'ALL_TIME',
  ): Promise<LeaderboardEntryDto[]> {
    const res = await api.get<LeaderboardEntryDto[]>('/sports/leaderboard', {
      params: {
        sport:    sport === 'ALL' ? undefined : sport,
        category,
        period,
      },
    });
    return res.data;
  },

  // ── Badges ───────────────────────────────────────────────────
  async getAllBadges(): Promise<BadgeDto[]> {
    const res = await api.get<BadgeDto[]>('/sports/badges');
    return res.data;
  },

  async getPlayerBadges(userId: number): Promise<BadgeDto[]> {
    const res = await api.get<BadgeDto[]>(`/sports/players/${userId}/badges`);
    return res.data;
  },

  // ── Match Photo Gallery ──────────────────────────────────────
  async getMatchPhotos(matchId: number): Promise<MatchPhotoDto[]> {
    const res = await api.get<MatchPhotoDto[]>(`/sports/matches/${matchId}/photos`);
    return res.data;
  },

  async uploadMatchPhoto(matchId: number, localUri: string, caption?: string): Promise<MatchPhotoDto> {
    const filename = localUri.split('/').pop() ?? 'photo.jpg';
    const form = new FormData();
    form.append('file', { uri: localUri, name: filename, type: 'image/jpeg' } as any);
    if (caption) form.append('caption', caption);
    const res = await api.post<MatchPhotoDto>(`/sports/matches/${matchId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async togglePhotoLike(matchId: number, photoId: number): Promise<void> {
    await api.post(`/sports/matches/${matchId}/photos/${photoId}/like`);
  },

  async deleteMatchPhoto(matchId: number, photoId: number): Promise<void> {
    await api.delete(`/sports/matches/${matchId}/photos/${photoId}`);
  },

  // ── Peer Ratings ─────────────────────────────────────────────
  async getMatchRatings(matchId: number): Promise<MatchRatingSummaryDto> {
    const res = await api.get<MatchRatingSummaryDto>(`/sports/matches/${matchId}/ratings`);
    return res.data;
  },

  async submitMatchRatings(matchId: number, data: SubmitRatingsRequest): Promise<void> {
    await api.post(`/sports/matches/${matchId}/ratings`, data);
  },
