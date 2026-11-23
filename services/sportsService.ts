import api from './apiClient';
import { inferMimeType, secureLog } from '@/security';
import type {
  TournamentDto, TeamDto, MatchDto, MatchEventDto,
  StandingDto, RegisterTeamRequest, PageResponse, SportType,
  CricketScorecardDto, PlayerProfileDto, BadgeDto,
  LeaderboardEntryDto, LeaderboardCategory, MatchPhotoDto,
  MatchRatingSummaryDto, SubmitRatingsRequest,
  SportsChallengeDto, CreateSportsChallengeRequest,
  SportsStreamResponse, StreamCameraRequest, StreamChatRequest,
  SportsCricHeroesLinkRequest, SportsCricHeroesProfileResponse,
  SportsRaceResultResponse,
  SportsTournamentAnnouncement, SportsTournamentGalleryImage, SportsTournamentTimelineEntry,
  SportsGenericLeaderboardEntry, SportsPlayerRankingResponse,
} from '@/types/api';

function tournamentToDashboardCard(t: any): import('@/types/api').DashboardTournamentCardDto {
  const rawEvents = t.events || t.sportsEvents || t.childEvents || [];
  const mappedEvents: import('@/types/api').DashboardEventCardDto[] = rawEvents.map((ev: any) => ({
    id: ev.id,
    name: ev.name || t.name,
    eventDateStart: ev.eventDateStart || t.eventDateStart || null,
    eventDateEnd: ev.eventDateEnd || t.eventDateEnd || null,
    sportName: ev.sport?.name || ev.sportName || t.name || '',
    categoryName: ev.categories?.[0]?.name || ev.categoryName || '',
    venueName: ev.venue?.name || ev.venueName || '',
    maxParticipants: ev.maxParticipants ?? t.maxParticipants ?? null,
    registeredCount: ev.registeredCount ?? 0,
    registrationStatus: ev.status || ev.registrationStatus || t.registrationStatus || 'REGISTRATION_OPEN',
    auctionStatus: ev.auctionStatus || null,
    teamSport: (ev.minPlayers && ev.minPlayers > 1) || false,
    myRegistrationId: null,
    myRegistrationStatus: null,
  }));

  return {
    id: t.id,
    name: t.name,
    bannerImage: t.bannerImage || null,
    eventDateStart: t.eventDateStart || null,
    eventDateEnd: t.eventDateEnd || null,
    registrationStatus: t.registrationStatus || 'REGISTRATION_OPEN',
    communityId: t.communityId || null,
    communityName: t.communityName || null,
    events: mappedEvents,
  };
}

function feedMatchToMatchDto(f: any): MatchDto {
  return {
    id: f.matchId ?? f.id,
    tournamentId: f.configId ?? 0,
    tournamentName: f.tournamentName || f.eventName || 'Tournament Match',
    sport: ((f.sportName || 'CRICKET').toUpperCase().replace(/\s+/g, '_')) as SportType,
    homeTeamId: 1,
    homeTeamName: f.teamAName || 'Team A',
    homeTeamEmoji: '🏏',
    awayTeamId: 2,
    awayTeamName: f.teamBName || 'Team B',
    awayTeamEmoji: '🏏',
    homeScore: parseInt(f.scoreTeamA || '0', 10) || 0,
    awayScore: parseInt(f.scoreTeamB || '0', 10) || 0,
    status: (f.status || 'SCHEDULED') as any,
    scheduledAt: f.scheduledAt || new Date().toISOString(),
    venue: f.venueName || '',
    round: f.roundName || '',
    homeScoreDisplay: f.scoreTeamA,
    awayScoreDisplay: f.scoreTeamB,
  } as any;
}

export const sportsService = {
  // ── Tournaments ───────────────────────────────────────────────
  async getTournaments(
    sport?: SportType,
    status?: string,
    page = 0,
    communityId?: number,
  ): Promise<PageResponse<TournamentDto>> {
    const qs = communityId ? `?communityId=${communityId}` : '';
    // 1. Try community tournaments (open to all authenticated residents)
    try {
      let res = await api.get<any>(`/tournaments/community${qs}`);
      let list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if ((!list || list.length === 0) && communityId) {
        res = await api.get<any>('/tournaments/community');
        list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      }
      if (list.length > 0) {
        let filtered = list;
        if (status) {
          filtered = filtered.filter((t: any) =>
            t.registrationStatus === status || t.status === status
          );
        }
        return {
          content: filtered,
          page: 0,
          size: filtered.length,
          totalElements: filtered.length,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        } as any;
      }
    } catch {}

    // 2. Try all tournaments
    try {
      const res = await api.get<any>('/tournaments/all');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if (list.length > 0) {
        let filtered = list;
        if (status) {
          filtered = filtered.filter((t: any) =>
            t.registrationStatus === status || t.status === status
          );
        }
        return {
          content: filtered,
          page: 0,
          size: filtered.length,
          totalElements: filtered.length,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        } as any;
      }
    } catch {}

    // 3. Fallback to /sports/tournaments if supported
    try {
      const res = await api.get<PageResponse<TournamentDto>>('/sports/tournaments', {
        params: { sport, status, page, size: 20 },
      });
      return res.data;
    } catch {
      return { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20, hasNext: false, hasPrevious: false } as any;
    }
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
    // 1. Try standard matches endpoint
    try {
      const res = await api.get<PageResponse<MatchDto>>('/sports/matches', {
        params: { tournamentId, date, status, page, size: 30 },
      });
      if (res.data?.content && res.data.content.length > 0) return res.data;
    } catch {}

    // 2. Resident-accessible fallback: upcoming and recent-completed feeds
    try {
      const [upRes, recRes] = await Promise.all([
        api.get<any[]>('/sports/upcoming-feed').catch(() => ({ data: [] })),
        api.get<any[]>('/sports/recent-completed').catch(() => ({ data: [] })),
      ]);
      const combined = [
        ...(Array.isArray(upRes.data) ? upRes.data : []),
        ...(Array.isArray(recRes.data) ? recRes.data : []),
      ];
      let mapped = combined.map(feedMatchToMatchDto);
      if (status) {
        mapped = mapped.filter((m: any) => m.status === status);
      }
      return {
        content: mapped,
        page: 0,
        size: mapped.length,
        totalElements: mapped.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      } as any;
    } catch {
      return { content: [], totalElements: 0, totalPages: 0, page: 0, size: 30, hasNext: false, hasPrevious: false } as any;
    }
  },

  async getLiveMatches(communityId?: number): Promise<MatchDto[]> {
    const qs = communityId ? `?communityId=${communityId}` : '';
    // 1. Resident-accessible endpoint: /sports/live-feed (matches web LiveMatchesStrip)
    try {
      let res = await api.get<any[]>(`/sports/live-feed${qs}`);
      if ((!res.data || res.data.length === 0) && communityId) {
        res = await api.get<any[]>('/sports/live-feed');
      }
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(feedMatchToMatchDto);
      }
    } catch {}

    // 2. Admin endpoint: /sports/matches/live
    try {
      const res = await api.get<MatchDto[]>('/sports/matches/live');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}

    return [];
  },

  async getTodayMatches(communityId?: number): Promise<MatchDto[]> {
    const qs = communityId ? `&communityId=${communityId}` : '';
    // 1. Resident-accessible upcoming feed + recent completed
    try {
      let [upRes, recRes] = await Promise.all([
        api.get<any[]>(`/sports/upcoming-feed?limit=15${qs}`).catch(() => ({ data: [] })),
        api.get<any[]>(`/sports/recent-completed?limit=15${qs}`).catch(() => ({ data: [] })),
      ]);
      if ((!upRes.data || upRes.data.length === 0) && communityId) {
        upRes = await api.get<any[]>('/sports/upcoming-feed?limit=15').catch(() => ({ data: [] }));
      }
      const combined = [
        ...(Array.isArray(upRes.data) ? upRes.data : []),
        ...(Array.isArray(recRes.data) ? recRes.data : []),
      ];
      if (combined.length > 0) {
        return combined.map(feedMatchToMatchDto);
      }
    } catch {}

    // 2. Try /sports/matches/today
    try {
      const res = await api.get<MatchDto[]>('/sports/matches/today');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}

    // 3. Try /sports/matches
    try {
      const res = await api.get<PageResponse<MatchDto>>('/sports/matches', {
        params: { page: 0, size: 50 },
      });
      const all = res.data?.content || [];
      if (all.length > 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayList = all.filter((m: any) => {
          const sched = m.scheduledAt || m.date;
          return sched && sched.slice(0, 10) === todayStr;
        });
        if (todayList.length > 0) return todayList;
        return all.slice(0, 6);
      }
    } catch {}

    return [];
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
      if (res.data) return res.data;
    } catch {}

    // Resident-accessible fallback: compute stats from available tournaments & matches
    try {
      const [tournaments, liveMatches] = await Promise.all([
        sportsService.getOpenTournaments().catch(() => []),
        sportsService.getLiveMatches().catch(() => []),
      ]);
      return {
        yourRegistrations: 0,
        liveEvents: liveMatches.length,
        openRegistrations: tournaments.length,
        upcomingTournaments: tournaments.length,
      };
    } catch {
      return { yourRegistrations: 0, liveEvents: 0, openRegistrations: 0, upcomingTournaments: 0 };
    }
  },

  async getUpcomingEvents(communityId?: number): Promise<import('@/types/api').DashboardUpcomingEventDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardUpcomingEventDto[]>('/sports/dashboard/upcoming');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
    try {
      const res = await api.get<import('@/types/api').DashboardUpcomingEventDto[]>('/sports/dashboard/upcoming-events');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}

    // Resident-accessible fallback: extract upcoming events from /tournaments/community
    try {
      const qs = communityId ? `?communityId=${communityId}` : '';
      let res = await api.get<any>(`/tournaments/community${qs}`);
      let list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if ((!list || list.length === 0) && communityId) {
        res = await api.get<any>('/tournaments/community');
        list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      }
      const events: import('@/types/api').DashboardUpcomingEventDto[] = [];
      for (const t of list) {
        const tEvents = t.events || t.sportsEvents || [];
        for (const ev of tEvents) {
          events.push({
            id: ev.id,
            name: ev.name || t.name,
            sportName: ev.sport?.name || ev.sportName || '',
            categoryName: ev.categories?.[0]?.name || '',
            eventDateStart: ev.eventDateStart || t.eventDateStart || '',
            eventDateEnd: ev.eventDateEnd || t.eventDateEnd || '',
            venueName: ev.venue?.name || ev.venueName || '',
            tournamentName: t.name,
            registeredCount: ev.registeredCount || 0,
            maxParticipants: ev.maxParticipants || 0,
            registrationStatus: ev.status || t.registrationStatus || 'OPEN',
          } as any);
        }
      }
      return events;
    } catch {
      return [];
    }
  },

  async getOpenTournaments(communityId?: number): Promise<import('@/types/api').DashboardTournamentCardDto[]> {
    // 1. Try dashboard open tournaments (admin / user with sports permission)
    try {
      const res = await api.get<import('@/types/api').DashboardTournamentCardDto[]>('/sports/dashboard/open-tournaments');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}

    // 2. Fallback to community tournaments endpoint and map to DashboardTournamentCardDto
    try {
      const qs = communityId ? `?communityId=${communityId}` : '';
      let res = await api.get<any>(`/tournaments/community${qs}`);
      let list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if ((!list || list.length === 0) && communityId) {
        res = await api.get<any>('/tournaments/community');
        list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      }
      if (list.length > 0) {
        return list.map(tournamentToDashboardCard);
      }
    } catch {}

    // 3. Fallback to /sports/tournaments/open
    try {
      const qs = communityId ? `?communityId=${communityId}` : '';
      const res = await api.get<any>(`/sports/tournaments/open${qs}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if (list.length > 0) {
        return list.map(tournamentToDashboardCard);
      }
    } catch {}

    // 4. Fallback to all tournaments
    try {
      const res = await api.get<any>('/tournaments/all');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if (list.length > 0) {
        return list.map(tournamentToDashboardCard);
      }
    } catch {}

    return [];
  },

  async getClosedTournaments(): Promise<import('@/types/api').DashboardTournamentCardDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardTournamentCardDto[]>('/sports/dashboard/closed-tournaments');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
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

  // ── Live Streaming ─────────────────────────────────────────────
  async getStream(matchId: number): Promise<SportsStreamResponse> {
    const res = await api.get<SportsStreamResponse>(`/sports/matches/${matchId}/stream`);
    return res.data;
  },
  async startStream(matchId: number, title?: string): Promise<SportsStreamResponse> {
    const res = await api.post<SportsStreamResponse>(`/sports/matches/${matchId}/stream/start`, title ? { title } : undefined);
    return res.data;
  },
  async endStream(matchId: number): Promise<SportsStreamResponse> {
    const res = await api.put<SportsStreamResponse>(`/sports/matches/${matchId}/stream/end`);
    return res.data;
  },
  async addStreamCamera(matchId: number, req: StreamCameraRequest): Promise<SportsStreamResponse> {
    const res = await api.post<SportsStreamResponse>(`/sports/matches/${matchId}/stream/cameras`, req);
    return res.data;
  },
  async removeStreamCamera(matchId: number, cameraId: number): Promise<SportsStreamResponse> {
    const res = await api.delete<SportsStreamResponse>(`/sports/matches/${matchId}/stream/cameras/${cameraId}`);
    return res.data;
  },
  async switchStreamCamera(matchId: number, cameraId: number): Promise<SportsStreamResponse> {
    const res = await api.put<SportsStreamResponse>(`/sports/matches/${matchId}/stream/cameras/${cameraId}/active`);
    return res.data;
  },
  async postStreamMessage(matchId: number, req: StreamChatRequest): Promise<SportsStreamResponse> {
    const res = await api.post<SportsStreamResponse>(`/sports/matches/${matchId}/stream/chat`, req);
    return res.data;
  },

  // ── CricHeroes ────────────────────────────────────────────────
  async linkCricHeroes(req: SportsCricHeroesLinkRequest): Promise<SportsCricHeroesProfileResponse> {
    const res = await api.post<SportsCricHeroesProfileResponse>('/api/cricheroes/link', req);
    return res.data;
  },
  async unlinkCricHeroes(playerId: number): Promise<void> {
    await api.delete(`/api/cricheroes/${playerId}/unlink`);
  },
  async previewCricHeroes(url: string): Promise<SportsCricHeroesProfileResponse> {
    const res = await api.get<SportsCricHeroesProfileResponse>('/api/cricheroes/preview', { params: { url } });
    return res.data;
  },
  async getCricHeroesProfile(playerId: number): Promise<SportsCricHeroesProfileResponse | null> {
    try {
      const res = await api.get<SportsCricHeroesProfileResponse>(`/api/cricheroes/profile/${playerId}`);
      return res.data;
    } catch {
      return null;
    }
  },
  async refreshCricHeroesProfile(playerId: number): Promise<SportsCricHeroesProfileResponse> {
    const res = await api.get<SportsCricHeroesProfileResponse>(`/api/cricheroes/profile/${playerId}/refresh`);
    return res.data;
  },

  // ── Race Results ──────────────────────────────────────────────
  async getRaceResults(matchId: number): Promise<SportsRaceResultResponse[]> {
    const res = await api.get<SportsRaceResultResponse[]>(`/api/tournament/match/race/${matchId}/results`);
    return res.data;
  },
  async getRaceHeat(matchId: number, heatNumber: number): Promise<SportsRaceResultResponse[]> {
    const res = await api.get<SportsRaceResultResponse[]>(`/api/tournament/match/race/${matchId}/results/heat/${heatNumber}`);
    return res.data;
  },

  // ── Tournament Content ────────────────────────────────────────
  async getTournamentAnnouncements(tournamentId: number): Promise<SportsTournamentAnnouncement[]> {
    const res = await api.get<SportsTournamentAnnouncement[]>(`/api/tournaments/${tournamentId}/announcements`);
    return res.data;
  },
  async getTournamentGallery(tournamentId: number): Promise<SportsTournamentGalleryImage[]> {
    const res = await api.get<SportsTournamentGalleryImage[]>(`/api/tournaments/${tournamentId}/gallery`);
    return res.data;
  },
  async getTournamentTimeline(tournamentId: number): Promise<SportsTournamentTimelineEntry[]> {
    const res = await api.get<SportsTournamentTimelineEntry[]>(`/api/tournaments/${tournamentId}/timeline`);
    return res.data;
  },

  // ── Generic Leaderboard ───────────────────────────────────────
  async getGenericLeaderboard(configId: number, category?: string): Promise<SportsGenericLeaderboardEntry[]> {
    const res = await api.get<SportsGenericLeaderboardEntry[]>(
      `/api/tournament/${configId}/leaderboard/generic`,
      category ? { params: { category } } : undefined,
    );
    return res.data;
  },
  async getLeaderboardCategories(configId: number): Promise<string[]> {
    const res = await api.get<string[]>(`/api/tournament/${configId}/leaderboard/generic/categories`);
    return res.data;
  },

  // ── Player Rankings ───────────────────────────────────────────
  async getRankings(params?: { sport?: string; season?: string }): Promise<SportsPlayerRankingResponse[]> {
    const res = await api.get<SportsPlayerRankingResponse[]>('/api/sports/rankings', params ? { params } : undefined);
    return res.data;
  },
  async getMyRanking(userId: number): Promise<SportsPlayerRankingResponse | null> {
    try {
      const res = await api.get<SportsPlayerRankingResponse>(`/api/sports/rankings/user/${userId}`);
      return res.data;
    } catch { return null; }
  },
};

const sessionChallenges: SportsChallengeDto[] = [];

