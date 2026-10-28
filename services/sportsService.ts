import api from './apiClient';
import { inferMimeType, secureLog } from '@/security';
import type {
  TournamentDto, TeamDto, MatchDto, MatchEventDto,
  StandingDto, RegisterTeamRequest, PageResponse, SportType,
  CricketScorecardDto, PlayerProfileDto, BadgeDto,
  LeaderboardEntryDto, LeaderboardCategory, MatchPhotoDto,
  MatchRatingSummaryDto, SubmitRatingsRequest,
  SportsChallengeDto, CreateSportsChallengeRequest,
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
    try {
      const res = await api.get<MatchDto[]>('/sports/matches/today');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {
      // Backend provides /sports/matches (PagedResponse<SportsMatchResponse>)
    }
    try {
      const res = await api.get<PageResponse<MatchDto>>('/sports/matches', {
        params: { page: 0, size: 50 },
      });
      const all = res.data?.content || [];
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayList = all.filter((m: any) => {
        const sched = m.scheduledAt || m.date;
        return sched && sched.slice(0, 10) === todayStr;
      });
      return todayList.length > 0 ? todayList : all.slice(0, 6);
    } catch {
      return [];
    }
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
    const res = await api.post(`/tournament/match/${matchId}/ball`, data);
    return res.data;
  },

  async undoCricketBall(matchId: number, inningsNumber = 1): Promise<any> {
    const res = await api.post(`/tournament/match/${matchId}/undo`, null, {
      params: { inningsNumber },
    });
    return res.data;
  },

  async recordGenericScore(data: import('@/types/api').GenericScoreRequest): Promise<any> {
    const res = await api.post('/tournament/match/generic/score', data);
    return res.data;
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
    try {
      const res = await api.get<import('@/types/api').DashboardStatsDto>('/sports/dashboard/stats');
      return res.data;
    } catch {
      return { yourRegistrations: 0, liveEvents: 0, openRegistrations: 0, upcomingTournaments: 0 };
    }
  },

  async getUpcomingEvents(): Promise<import('@/types/api').DashboardUpcomingEventDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardUpcomingEventDto[]>('/sports/dashboard/upcoming');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    try {
      const res = await api.get<import('@/types/api').DashboardUpcomingEventDto[]>('/sports/dashboard/upcoming-events');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getOpenTournaments(): Promise<import('@/types/api').DashboardTournamentCardDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardTournamentCardDto[]>('/sports/dashboard/open-tournaments');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    try {
      const res = await api.get<any>('/sports/tournaments/open');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getClosedTournaments(): Promise<import('@/types/api').DashboardTournamentCardDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardTournamentCardDto[]>('/sports/dashboard/closed-tournaments');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    try {
      const res = await api.get<any>('/sports/tournaments/closed');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getMyRegistrations(): Promise<import('@/types/api').DashboardMyRegistrationDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardMyRegistrationDto[]>('/sports/dashboard/my-registrations');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    try {
      const res = await api.get<any>('/sports/registrations/mine');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async registerForEvent(
    eventId: number,
    data: import('@/types/api').SportsEventRegistrationRequest
  ): Promise<import('@/types/api').SportsRegistrationResponseDto> {
    const res = await api.post<import('@/types/api').SportsRegistrationResponseDto>(`/sports/events/${eventId}/register`, data);
    return res.data;
  },

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
    try {
      const res = await api.get<LeaderboardEntryDto[]>('/sports/leaderboard', {
        params: {
          sport:    sport === 'ALL' ? undefined : sport,
          category,
          period,
        },
      });
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return [];
  },

  // ── Badges ───────────────────────────────────────────────────
  async getAllBadges(): Promise<BadgeDto[]> {
    try {
      const res = await api.get<BadgeDto[]>('/sports/badges');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getPlayerBadges(userId: number): Promise<BadgeDto[]> {
    try {
      const res = await api.get<BadgeDto[]>(`/sports/players/${userId}/badges`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  // ── Match Photo Gallery ──────────────────────────────────────
  async getMatchPhotos(matchId: number): Promise<MatchPhotoDto[]> {
    try {
      const res = await api.get<MatchPhotoDto[]>(`/sports/matches/${matchId}/photos`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async uploadMatchPhoto(
    matchId: number,
    localUri: string,
    caption?: string,
    declaredMimeType?: string,
  ): Promise<MatchPhotoDto> {
    const filename = localUri.split('/').pop() ?? 'photo.jpg';
    const mimeType = inferMimeType(localUri, declaredMimeType);
    const form = new FormData();
    form.append('file', { uri: localUri, name: filename, type: mimeType } as any);
    if (caption) form.append('caption', caption);
    const res = await api.post<MatchPhotoDto>(`/sports/matches/${matchId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!res.data || !res.data.id) {
      throw new Error('Server did not return a valid match photo record.');
    }
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

  // ── Community Open Challenges ────────────────────────────────
  async getChallenges(sport?: SportType): Promise<SportsChallengeDto[]> {
    try {
      const res = await api.get<SportsChallengeDto[]>('/sports/challenges', {
        params: { sport },
      });
      if (Array.isArray(res.data)) {
        return sport ? res.data.filter((c) => c.sport === sport) : res.data;
      }
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        secureLog.warn('[sportsService] Challenges API unavailable', err?.message);
      }
    }
    return sport
      ? sessionChallenges.filter((c) => c.sport === sport)
      : [...sessionChallenges];
  },

  async createChallenge(req: CreateSportsChallengeRequest): Promise<SportsChallengeDto> {
    try {
      const res = await api.post<SportsChallengeDto>('/sports/challenges', req);
      if (res.data) {
        sessionChallenges.unshift(res.data);
        return res.data;
      }
    } catch (err: any) {
      secureLog.warn('[sportsService] Create challenge API unavailable, saving to session', err?.message);
    }
    const emojiMap: Record<string, { emoji: string; color: string; bg: string }> = {
      BADMINTON:    { emoji: '🏸', color: '#7C3AED', bg: '#F5F3FF' },
      CRICKET:      { emoji: '🏏', color: '#2563EB', bg: '#EFF6FF' },
      TABLE_TENNIS: { emoji: '🏓', color: '#4F46E5', bg: '#EEF2FF' },
      TENNIS:       { emoji: '🎾', color: '#059669', bg: '#ECFDF5' },
      FOOTBALL:     { emoji: '⚽', color: '#EA580C', bg: '#FFF7ED' },
      BASKETBALL:   { emoji: '🏀', color: '#D97706', bg: '#FFFBEB' },
      VOLLEYBALL:   { emoji: '🏐', color: '#0891B2', bg: '#ECFEFF' },
    };
    const style = emojiMap[req.sport] || { emoji: '🏅', color: '#4F46E5', bg: '#EEF2FF' };
    const newChallenge: SportsChallengeDto = {
      id: Date.now(),
      title: req.title,
      sport: req.sport,
      creatorId: 1,
      creatorName: 'You (Host)',
      creatorFlat: 'Resident',
      format: req.format,
      venue: req.venue || 'Clubhouse Sports Arena',
      scheduledTime: req.scheduledTime || 'Scheduled',
      status: 'OPEN',
      emoji: style.emoji,
      color: style.color,
      bg: style.bg,
      notes: req.notes,
      createdAt: new Date().toISOString(),
    };
    sessionChallenges.unshift(newChallenge);
    return newChallenge;
  },

  async acceptChallenge(challengeId: number, challengerName = 'You', challengerFlat = 'Resident'): Promise<SportsChallengeDto> {
    try {
      const res = await api.post<SportsChallengeDto>(`/sports/challenges/${challengeId}/accept`);
      if (res.data) return res.data;
    } catch (err: any) {
      secureLog.warn(`[sportsService] Accept challenge API failed for ${challengeId}`, err?.message);
    }
    const idx = sessionChallenges.findIndex((c) => c.id === challengeId);
    if (idx !== -1) {
      sessionChallenges[idx] = {
        ...sessionChallenges[idx],
        status: 'ACCEPTED',
        challengerName,
        challengerFlat,
      };
      return sessionChallenges[idx];
    }
    throw new Error('Challenge not found');
  },
};

const sessionChallenges: SportsChallengeDto[] = [];

