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

const BADGE_META_MAP: Record<string, { title: string; emoji: string; tier: 'legendary' | 'epic' | 'rare' | 'common' }> = {
  tournament_winner: { title: 'Tournament Champion', emoji: '🏆', tier: 'legendary' },
  runner_up:         { title: 'Runner-up',           emoji: '🥈', tier: 'epic' },
  century_club:      { title: 'Century Club',        emoji: '💯', tier: 'epic' },
  hat_trick:         { title: 'Hat-trick Hero',      emoji: '🎩', tier: 'legendary' },
  five_wickets:      { title: 'Fifer',               emoji: '🌟', tier: 'rare' },
  top_scorer:        { title: 'Top Scorer',          emoji: '🏅', tier: 'rare' },
  most_valuable:     { title: 'MVP',                 emoji: '⭐', tier: 'epic' },
  '10_matches':      { title: 'Veteran',             emoji: '💪', tier: 'common' },
  '50_matches':      { title: 'Legend',              emoji: '🦁', tier: 'rare' },
  first_match:       { title: 'Debut',               emoji: '🌱', tier: 'common' },
  team_player:       { title: 'Team Player',         emoji: '🤝', tier: 'common' },
  good_sport:        { title: 'Good Sport',          emoji: '🏅', tier: 'common' },
};

function logApiWarn(method: string, err?: unknown) {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  secureLog.warn(`[sportsService.${method}] API failed: ${msg}`);
}

function normalizeSportType(raw?: string | null): SportType {
  const s = String(raw || '').toUpperCase().replace(/\s+/g, '_');
  if (s.includes('CRICKET')) return 'CRICKET';
  if (s.includes('BADMINTON')) return 'BADMINTON';
  if (s.includes('TABLE_TENNIS') || s === 'TT' || s.includes('PING_PONG')) return 'TABLE_TENNIS';
  if (s.includes('PICKLEBALL')) return 'PICKLEBALL';
  if (s.includes('TENNIS')) return 'TENNIS';
  if (s.includes('FOOTBALL') || s.includes('SOCCER')) return 'FOOTBALL';
  if (s.includes('BASKETBALL')) return 'BASKETBALL';
  if (s.includes('VOLLEYBALL')) return 'VOLLEYBALL';
  if (s.includes('SWIM')) return 'SWIMMING';
  if (s.includes('CHESS')) return 'CHESS';
  if (s.includes('CARROM')) return 'CARROM';
  return (s || 'OTHER') as SportType;
}

function parseScoreString(raw?: string | number | null): {
  runs: number;
  wickets?: number;
  overs?: string;
  display?: string;
} {
  if (raw == null || raw === '') return { runs: 0 };
  if (typeof raw === 'number') return { runs: raw, display: String(raw) };
  const str = String(raw).trim();
  const ovMatch = str.match(/\(([\d.]+)\s*(?:ov|overs)?\)/i);
  const scoreMatch = str.match(/(\d+)(?:\s*\/\s*(\d+))?/);
  return {
    runs: scoreMatch ? parseInt(scoreMatch[1], 10) || 0 : 0,
    wickets: scoreMatch?.[2] != null ? parseInt(scoreMatch[2], 10) : undefined,
    overs: ovMatch?.[1],
    display: str,
  };
}

function normalizeMatchStatus(status?: string | null): MatchDto['status'] {
  const s = String(status || 'SCHEDULED').toUpperCase().trim();
  if (s === 'IN_PROGRESS' || s === 'INPROGRESS' || s === 'ONGOING' || s === 'ACTIVE') return 'LIVE';
  if (s === 'COMPLETED' || s === 'FINISHED' || s === 'FINAL') return 'COMPLETED';
  if (s === 'CANCELLED') return 'CANCELLED';
  return 'SCHEDULED';
}

function tournamentToDashboardCard(t: any): import('@/types/api').DashboardTournamentCardDto {
  const rawEvents = t.events || t.sportsEvents || t.childEvents || [];
  const mappedEvents: import('@/types/api').DashboardEventCardDto[] = rawEvents.map((ev: any) => ({
    id: ev.id,
    name: ev.name || t.name,
    eventDateStart: ev.eventDateStart || t.eventDateStart || null,
    eventDateEnd: ev.eventDateEnd || t.eventDateEnd || null,
    sportName: ev.sport?.name || ev.sportName || t.sport?.name || t.sportName || t.name || '',
    categoryName: ev.categories?.[0]?.name || ev.categoryName || ev.name || '',
    venueName: ev.venue?.name || ev.venueName || t.venue?.name || t.venueName || '',
    maxParticipants: ev.maxParticipants ?? t.maxParticipants ?? null,
    registeredCount: ev.registeredCount ?? 0,
    registrationStatus: ev.status || ev.registrationStatus || t.registrationStatus || 'REGISTRATION_OPEN',
    auctionStatus: ev.auctionStatus || null,
    teamSport: (ev.minPlayers && ev.minPlayers > 1) || (Array.isArray(ev.format) && ev.format.includes('TEAM')) || false,
    myRegistrationId: ev.myRegistrationId ?? null,
    myRegistrationStatus: ev.myRegistrationStatus ?? null,
  }));

  return {
    id: t.id,
    name: t.name,
    bannerImage: t.bannerImage || null,
    eventDateStart: t.eventDateStart || null,
    eventDateEnd: t.eventDateEnd || null,
    registrationStatus: t.registrationStatus || t.status || 'REGISTRATION_OPEN',
    communityId: t.communityId || t.community?.id || null,
    communityName: t.communityName || t.community?.name || null,
    events: mappedEvents,
  };
}

function normalizeTournamentDto(t: any): TournamentDto & Record<string, any> {
  const rawEvents = Array.isArray(t.sportsEvents) ? t.sportsEvents : (Array.isArray(t.events) ? t.events : []);
  const firstEv = rawEvents[0];
  const rawSport = typeof t.sport === 'object' ? t.sport?.name : (t.sport || t.sportName || firstEv?.sport?.name || firstEv?.sportName || t.name);
  const rawStatus = String(t.status || t.registrationStatus || 'UPCOMING').toUpperCase();
  const mappedStatus = (rawStatus === 'LIVE' || rawStatus === 'IN_PROGRESS') ? 'ONGOING' : rawStatus;

  const venueObj = t.venue || firstEv?.venue;
  const venueStr = typeof venueObj === 'string'
    ? venueObj
    : venueObj
      ? [venueObj.name, venueObj.area, venueObj.city].filter(Boolean).join(', ') || venueObj.address || ''
      : '';

  const totalReg = rawEvents.reduce((sum: number, ev: any) => sum + (Number(ev?.registeredCount) || 0), 0);
  const rawFmt = Array.isArray(firstEv?.format) ? firstEv.format[0] : (t.format || firstEv?.tournamentType || 'KNOCKOUT');

  return {
    ...t,
    id: t.id,
    name: t.name || t.title || 'Tournament',
    sport: normalizeSportType(rawSport),
    description: t.description || '',
    format: (rawFmt || 'KNOCKOUT') as any,
    status: mappedStatus as any,
    registrationStatus: t.registrationStatus || t.status || mappedStatus,
    startDate: t.startDate || t.eventDateStart || '',
    endDate: t.endDate || t.eventDateEnd || '',
    registrationDeadline: t.registrationDeadline || t.registrationDateEnd || undefined,
    maxTeams: t.maxTeams ?? t.maxParticipants ?? 0,
    registeredTeamsCount: t.registeredTeamsCount ?? totalReg,
    teamSize: t.teamSize ?? firstEv?.minPlayers ?? 1,
    organizerName: t.organizerName || t.contactName || t.communityName || 'Community Arena',
    communityId: t.communityId ?? t.community?.id ?? 0,
    venue: venueStr || undefined,
    myTeamRegistered: Boolean(t.myTeamRegistered),
    createdAt: t.createdAt || '',
    sportsEvents: rawEvents,
    events: rawEvents,
  };
}

function feedMatchToMatchDto(f: any): MatchDto & Record<string, any> {
  const sport = normalizeSportType(f.sportName || f.sport);
  const parsedA = parseScoreString(f.scoreTeamA ?? f.score1 ?? f.homeScore);
  const parsedB = parseScoreString(f.scoreTeamB ?? f.score2 ?? f.awayScore);
  const status = normalizeMatchStatus(f.status);
  return {
    id: Number(f.matchId ?? f.id),
    tournamentId: Number(f.configId ?? f.tournamentId ?? 0),
    configId: f.configId ?? null,
    eventId: f.eventId ?? null,
    tournamentName: f.tournamentName || f.eventName || 'Tournament Match',
    sport,
    rawSportName: f.sportName || f.sport || sport,
    homeTeamId: f.teamAId ?? f.homeTeamId ?? 1,
    homeTeamName: f.teamAName || f.homeTeamName || f.homeName || 'Team A',
    homeTeamEmoji: '🏅',
    awayTeamId: f.teamBId ?? f.awayTeamId ?? 2,
    awayTeamName: f.teamBName || f.awayTeamName || f.awayName || 'Team B',
    awayTeamEmoji: '🏅',
    homeScore: typeof f.homeScore === 'number' ? f.homeScore : parsedA.runs,
    awayScore: typeof f.awayScore === 'number' ? f.awayScore : parsedB.runs,
    homeWickets: f.homeWickets ?? parsedA.wickets,
    awayWickets: f.awayWickets ?? parsedB.wickets,
    homeOvers: f.homeOvers ?? parsedA.overs,
    awayOvers: f.awayOvers ?? parsedB.overs,
    status,
    scheduledAt: f.scheduledAt || new Date().toISOString(),
    endedAt: f.endedAt || f.completedAt || undefined,
    venue: f.venueName || f.courtName || f.venue || '',
    round: f.roundName || f.round || '',
    matchNumber: f.matchNumber,
    winnerTeamName: f.winnerTeamName || f.winnerName || undefined,
    homeScoreDisplay: f.homeScoreDisplay ?? parsedA.display,
    awayScoreDisplay: f.awayScoreDisplay ?? parsedB.display,
  };
}

export interface FeedLiveMatch {
  matchId: number;
  configId?: number | null;
  eventId?: number | null;
  sportName?: string | null;
  tournamentName?: string | null;
  eventName?: string | null;
  roundName?: string | null;
  teamAName: string;
  teamBName: string;
  teamAId?: number | null;
  teamBId?: number | null;
  teamAFlat?: string | null;
  teamBFlat?: string | null;
  scoreTeamA?: string | null;
  scoreTeamB?: string | null;
  status: 'LIVE' | 'COMPLETED' | string;
  winnerName?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  venueName?: string | null;
}

export function doesSportMatchFilter(rawSport?: string | null, selected?: string | null): boolean {
  if (!selected || selected === 'ALL') return true;
  const target = selected.toUpperCase().replace(/\s+/g, '_');
  const norm = normalizeSportType(rawSport);
  if (norm === target) return true;
  const rawUp = String(rawSport || '').toUpperCase().replace(/\s+/g, '_');
  if (!rawUp) return false;
  if (target === 'TENNIS' && rawUp.includes('TABLE_TENNIS')) return false;
  return rawUp.includes(target) || target.includes(rawUp);
}

function doesTournamentStatusMatch(t: any, status?: string): boolean {
  if (!status) return true;
  const req = status.toUpperCase();
  const regStat = String(t.registrationStatus || t.status || '').toUpperCase();
  if (req === 'ONGOING' || req === 'LIVE') {
    return ['ONGOING', 'LIVE', 'IN_PROGRESS', 'ACTIVE'].includes(regStat);
  }
  if (req === 'UPCOMING') {
    return ['UPCOMING', 'SCHEDULED', 'REGISTRATION_OPEN', 'OPEN'].includes(regStat);
  }
  if (req === 'REGISTRATION_OPEN') {
    return ['REGISTRATION_OPEN', 'OPEN'].includes(regStat);
  }
  return regStat === req;
}

function dedupeMatchesById<T extends { id: number }>(list: T[]): T[] {
  const seen = new Map<number, T>();
  for (const item of list) {
    if (!item?.id) continue;
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return Array.from(seen.values());
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

    const filterAndPage = (rawList: any[]): PageResponse<TournamentDto> => {
      const normalized = rawList
        .filter((t: any) => String(t?.registrationStatus || t?.status || '').toUpperCase() !== 'DRAFT')
        .map(normalizeTournamentDto)
        .filter((t: any) => {
          if (status && !doesTournamentStatusMatch(t, status)) return false;
          if (sport) {
            const topMatch = doesSportMatchFilter(t.sport, sport) || doesSportMatchFilter(t.name, sport);
            const evMatch = (t.sportsEvents || []).some((ev: any) =>
              doesSportMatchFilter(ev?.sport?.name || ev?.sportName || ev?.name, sport)
            );
            if (!topMatch && !evMatch) return false;
          }
          return true;
        });
      return {
        content: normalized,
        page: 0,
        size: normalized.length,
        totalElements: normalized.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      } as any;
    };

    // 1. Try community tournaments (open to all authenticated residents)
    try {
      let res = await api.get<any>(`/tournaments/community${qs}`);
      let list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if ((!list || list.length === 0) && communityId) {
        res = await api.get<any>('/tournaments/community');
        list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      }
      if (list.length > 0) {
        return filterAndPage(list);
      }
    } catch (_e) { /* fallback */ }

    // 2. Try all tournaments
    try {
      const res = await api.get<any>('/tournaments/all');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if (list.length > 0) {
        return filterAndPage(list);
      }
    } catch (_e) { /* fallback */ }

    // 3. Fallback to /sports/tournaments if supported
    try {
      const res = await api.get<PageResponse<TournamentDto>>('/sports/tournaments', {
        params: { sport, status, page, size: 20 },
      });
      return res.data;
    } catch (err) {
      logApiWarn('getTournaments', err);
      return { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20, hasNext: false, hasPrevious: false } as any;
    }
  },

  async getTournament(id: number): Promise<TournamentDto> {
    try {
      const res = await api.get<any>(`/tournaments/${id}`);
      if (res.data) return normalizeTournamentDto(res.data);
    } catch (_e) { /* fallback */ }
    try {
      const page = await sportsService.getTournaments();
      const matched = (page.content || []).find((t: any) => {
        if (Number(t.id) === Number(id)) return true;
        const evs = t.sportsEvents || t.events || [];
        return evs.some((ev: any) => Number(ev?.id) === Number(id));
      });
      if (matched) return normalizeTournamentDto(matched);
    } catch (_e) { /* fallback */ }
    const res = await api.get<any>(`/sports/tournaments/${id}`);
    return normalizeTournamentDto(res.data);
  },

  async getMyTournaments(): Promise<TournamentDto[]> {
    try {
      const regs = await sportsService.getMyRegistrations();
      const all = await sportsService.getTournaments();
      const myNames = new Set(regs.map((r: any) => (r.tournamentName || r.eventName || '').toLowerCase()).filter(Boolean));
      return (all.content || []).filter((t: any) =>
        t.myTeamRegistered || myNames.has((t.name || '').toLowerCase())
      );
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  // ── Teams ─────────────────────────────────────────────────────
  async getTeams(tournamentId: number): Promise<TeamDto[]> {
    // 1. Resolve teams via resident-accessible tournament scheduler configs
    try {
      const configs = await sportsService.getTournamentConfigs();
      const matching = configs.filter((c: any) =>
        Number(c.id) === Number(tournamentId) ||
        Number(c.tournamentId) === Number(tournamentId) ||
        Number(c.eventId) === Number(tournamentId)
      );
      const targets = matching.length > 0 ? matching : configs.slice(0, 3);
      if (targets.length > 0) {
        const nested = await Promise.all(
          targets.map(async (cfg: any) => {
            try {
              const res = await api.get<any[]>(`/tournament/${cfg.id}/teams`);
              const rawTeams = Array.isArray(res.data) ? res.data : [];
              return rawTeams.map((tm: any): TeamDto => ({
                id: Number(tm.id ?? tm.teamId),
                name: tm.name || tm.teamName || 'Team',
                captainId: tm.captainId ?? 0,
                captainName: tm.captainName || 'Captain',
                tournamentId,
                sport: normalizeSportType(cfg.sportName || tm.sport),
                members: Array.isArray(tm.members) ? tm.members : [],
                status: tm.status || 'APPROVED',
                wins: tm.wins ?? 0,
                losses: tm.losses ?? 0,
                draws: tm.draws ?? 0,
                points: tm.points ?? 0,
                goalsFor: tm.goalsFor ?? 0,
                goalsAgainst: tm.goalsAgainst ?? 0,
                logoEmoji: tm.logoEmoji || '🏅',
                isMyTeam: Boolean(tm.isMyTeam),
                isCaptain: Boolean(tm.isCaptain),
              }));
            } catch (err) { logApiWarn('api', err);
              return [];
            }
          }),
        );
        const flat = nested.flat();
        if (flat.length > 0) return flat;
      }
    } catch (_e) { /* fallback */ }

    // 2. Fallback to legacy endpoint
    try {
      const res = await api.get<TeamDto[]>(`/sports/tournaments/${tournamentId}/teams`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getMyTeams(): Promise<TeamDto[]> {
    const collected: TeamDto[] = [];
    const seen = new Set<string>();

    // 1. Try auction captain/team registrations (/auction/teams/captain/mine)
    try {
      const res = await api.get<any[]>('/auction/teams/captain/mine');
      if (Array.isArray(res.data)) {
        for (const tm of res.data) {
          const tid = Number(tm.id ?? tm.teamId);
          if (!tid) continue;
          const key = `auction-${tid}`;
          if (seen.has(key)) continue;
          seen.add(key);
          collected.push({
            id: tid,
            name: tm.teamName || tm.name || 'Team',
            captainId: Number(tm.captainUserId ?? tm.captainId ?? 0),
            captainName: tm.captainName || 'Captain',
            tournamentId: Number(tm.tournamentId ?? tm.eventId ?? tm.configId ?? 0),
            sport: normalizeSportType(tm.sportName || tm.sport),
            members: Array.isArray(tm.players)
              ? tm.players.map((p: any) => ({
                  userId: Number(p.userId ?? p.id ?? 0),
                  name: p.playerName || p.fullName || p.name || 'Player',
                  flat: p.flatNumber || p.flatNo,
                  role: p.isCaptain ? 'CAPTAIN' : 'PLAYER',
                }))
              : [],
            status: 'APPROVED',
            wins: tm.wins ?? 0,
            losses: tm.losses ?? 0,
            draws: tm.draws ?? 0,
            points: tm.points ?? 0,
            goalsFor: 0,
            goalsAgainst: 0,
            logoEmoji: tm.logoEmoji || '🏅',
            isMyTeam: true,
            isCaptain: true,
          });
        }
      }
    } catch (_e) { /* fallback */ }

    // 2. Supplement from user sports event registrations & tournament squads (zero 404s; /sports/teams/my does not exist on backend)
    try {
      const [regs, tournsPage] = await Promise.all([
        sportsService.getMyRegistrations(),
        sportsService.getTournaments().catch(() => ({ content: [] } as any)),
      ]);
      const tourns = tournsPage?.content || [];
      for (const r of regs as any[]) {
        if (String(r.status || '').toUpperCase() === 'WITHDRAWN') continue;
        const regTeamName = r.proposedTeamName || r.teamName || r.playerName || r.eventName || 'My Entry';
        const matchedTourn = tourns.find((t: any) =>
          Number(t.id) === Number(r.tournamentId) ||
          (t.sportsEvents || t.events || []).some((ev: any) => Number(ev?.id) === Number(r.eventId))
        );
        const resolvedTournId = Number(r.tournamentId || matchedTourn?.id || r.eventId || 0);
        const key = `reg-${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push({
          id: Number(r.id),
          name: `${regTeamName}${r.categoryName ? ` · ${r.categoryName}` : ''}`,
          captainId: 0,
          captainName: r.playerName || 'Resident',
          tournamentId: resolvedTournId,
          sport: normalizeSportType(r.sportName),
          members: [
            { userId: 0, name: r.playerName || 'You', flat: r.flatNumber || r.flatNo, role: r.captainNomination ? 'CAPTAIN' : 'PLAYER' },
            ...(r.partnerName ? [{ userId: Number(r.partnerUserId ?? 1), name: r.partnerName, flat: r.partnerFlatNumber, role: 'PLAYER' as const }] : []),
          ],
          status: ['CONFIRMED', 'APPROVED', 'REGISTERED', 'ACTIVE'].includes(String(r.status || '').toUpperCase()) ? 'APPROVED' : 'PENDING',
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          logoEmoji: '🏅',
          isMyTeam: true,
          isCaptain: Boolean(r.captainNomination),
        });
      }
    } catch (_e) { /* fallback */ }

    return collected;
  },

  async registerTeam(data: RegisterTeamRequest): Promise<TeamDto> {
    try {
      const res = await api.post<any[]>('/sports/register-team', {
        eventId: data.tournamentId,
        teamName: data.teamName,
        memberUserIds: data.memberUserIds,
      });
      const first = Array.isArray(res.data) ? res.data[0] : res.data;
      return {
        id: Number(first?.id ?? Date.now()),
        name: data.teamName,
        captainId: 0,
        captainName: first?.playerName || 'Captain',
        tournamentId: data.tournamentId,
        sport: 'OTHER' as SportType,
        members: [],
        status: 'PENDING',
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        logoEmoji: data.logoEmoji || '🏅',
        isMyTeam: true,
        isCaptain: true,
      };
    } catch {
      const res = await api.post<TeamDto>('/sports/teams', data);
      return res.data;
    }
  },

  async leaveTeam(teamId: number): Promise<void> {
    try {
      await api.delete(`/auction/teams/${teamId}/leave`);
      return;
    } catch (_e) { /* fallback */ }
    await api.delete(`/sports/teams/${teamId}/leave`);
  },

  async dissolveTeam(teamId: number): Promise<void> {
    try {
      await api.delete(`/auction/teams/${teamId}/dissolve`);
      return;
    } catch (_e) { /* fallback */ }
    await api.delete(`/sports/teams/${teamId}`);
  },

  async addTeamMember(teamId: number, userId: number): Promise<void> {
    await api.post(`/sports/teams/${teamId}/members`, { userId });
  },

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    await api.delete(`/sports/teams/${teamId}/members/${userId}`);
  },

  async fetchConfigMatchesAsDto(opts?: {
    tournamentId?: number;
    maxConfigs?: number;
    maxPerConfig?: number;
  }): Promise<MatchDto[]> {
    const configs = await sportsService.getTournamentConfigs();
    const targetTid = opts?.tournamentId;
    let validConfigs = configs.filter((c: any) => String(c?.status || '').toUpperCase() !== 'DRAFT');
    if (targetTid) {
      const exact = validConfigs.filter((c: any) =>
        Number(c.id) === Number(targetTid) ||
        Number(c.tournamentId) === Number(targetTid) ||
        Number(c.eventId) === Number(targetTid)
      );
      if (exact.length > 0) validConfigs = exact;
    }
    validConfigs = validConfigs.slice(0, opts?.maxConfigs ?? 8);
    if (validConfigs.length === 0) return [];

    const nested = await Promise.all(
      validConfigs.map(async (cfg: any): Promise<MatchDto[]> => {
        const rawList = await sportsService.getMatchesByConfigId(Number(cfg.id));
        return rawList
          .filter((m: any) => {
            const id = Number(m?.id ?? m?.matchId);
            if (!id) return false;
            const st = String(m?.status || '').toUpperCase();
            if (['BYE', 'AUTO_ADVANCED', 'CANCELLED', 'DRAFT'].includes(st)) return false;
            if (m?.isBye) return false;
            return true;
          })
          .slice(0, opts?.maxPerConfig ?? 30)
          .map((m: any) =>
            feedMatchToMatchDto({
              ...m,
              matchId: m.id ?? m.matchId,
              configId: cfg.id,
              eventId: cfg.eventId,
              sportName: cfg.sportName || cfg.eventName || m.sportName || 'Sports',
              tournamentName: cfg.tournamentName || m.tournamentName || 'Tournament',
              venueName: m.venueName || m.courtName || cfg.venueName || '',
            }),
          );
      }),
    );
    return dedupeMatchesById(nested.flat());
  },

  // ── Matches ───────────────────────────────────────────────────
  async getMatches(
    tournamentId?: number,
    date?: string,
    status?: string,
    page = 0,
  ): Promise<PageResponse<MatchDto>> {
    // 1. Gather resident-accessible matches from feeds + tournament configs + optional /sports/matches
    const [upRes, recRes, liveRes, cfgMatches, adminRes] = await Promise.all([
      sportsService.getFeedUpcomingMatches(undefined, 30),
      sportsService.getFeedRecentCompletedMatches(undefined, 30),
      sportsService.getFeedLiveMatches(undefined),
      sportsService.fetchConfigMatchesAsDto({ tournamentId, maxConfigs: 10, maxPerConfig: 30 }),
      api.get<PageResponse<MatchDto>>('/sports/matches', {
        params: { tournamentId, status, page, size: 50 },
      }).then((r) => r.data?.content || []).catch(() => [] as MatchDto[]),
    ]);

    const feedDtos = [
      ...liveRes.map(feedMatchToMatchDto),
      ...upRes.map(feedMatchToMatchDto),
      ...recRes.map(feedMatchToMatchDto),
    ];

    let all = dedupeMatchesById([
      ...cfgMatches,
      ...feedDtos,
      ...adminRes.map((m: any) => feedMatchToMatchDto(m)),
    ]);

    if (tournamentId) {
      all = all.filter((m: any) =>
        Number(m.tournamentId) === Number(tournamentId) ||
        Number(m.configId) === Number(tournamentId) ||
        Number(m.eventId) === Number(tournamentId)
      );
    }
    if (status) {
      const targetSt = normalizeMatchStatus(status);
      all = all.filter((m: any) => normalizeMatchStatus(m.status) === targetSt);
    }
    if (date) {
      const byDate = all.filter((m: any) => String(m.scheduledAt || '').slice(0, 10) === date);
      // Only narrow by date if date filtering was requested; caller handles empty vs all-dates
      all = byDate;
    }

    return {
      content: all,
      page: 0,
      size: all.length,
      totalElements: all.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    } as any;
  },

  async getFeedLiveMatches(communityId?: number | null): Promise<FeedLiveMatch[]> {
    const qs = communityId ? `?communityId=${communityId}` : '';
    try {
      let res = await api.get<FeedLiveMatch[]>(`/sports/live-feed${qs}`);
      if ((!res.data || res.data.length === 0) && communityId) {
        res = await api.get<FeedLiveMatch[]>('/sports/live-feed');
      }
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getFeedUpcomingMatches(communityId?: number | null, limit = 15): Promise<FeedLiveMatch[]> {
    const cid = communityId ? `&communityId=${communityId}` : '';
    try {
      let res = await api.get<FeedLiveMatch[]>(`/sports/upcoming-feed?limit=${limit}${cid}`);
      if ((!res.data || res.data.length === 0) && communityId) {
        res = await api.get<FeedLiveMatch[]>(`/sports/upcoming-feed?limit=${limit}`);
      }
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getFeedRecentCompletedMatches(communityId?: number | null, limit = 30): Promise<FeedLiveMatch[]> {
    const cid = communityId ? `&communityId=${communityId}` : '';
    try {
      let res = await api.get<FeedLiveMatch[]>(`/sports/recent-completed?limit=${limit}${cid}`);
      if ((!res.data || res.data.length === 0) && communityId) {
        res = await api.get<FeedLiveMatch[]>(`/sports/recent-completed?limit=${limit}`);
      }
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getTournamentConfigs(): Promise<any[]> {
    try {
      const res = await api.get<any>('/tournament/configs');
      const d = res.data;
      return Array.isArray(d) ? d : (d?.content || d?.items || []);
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getMatchesByConfigId(configId: number): Promise<any[]> {
    if (!configId) return [];
    try {
      const res = await api.get<any>(`/tournament/${configId}/matches`);
      const d = res.data;
      return Array.isArray(d) ? d : (d?.content || d?.items || []);
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getMatchesAsFeedList(status?: string): Promise<FeedLiveMatch[]> {
    try {
      const res = await api.get<any>('/sports/matches', {
        params: { ...(status ? { status } : {}), page: 0, size: 40 },
      });
      const d = res.data;
      const list: any[] = Array.isArray(d) ? d : (d?.content || d?.items || []);
      return list
        .filter((m) => m && (m.id || m.matchId))
        .map((m): FeedLiveMatch => ({
          matchId: Number(m.matchId ?? m.id),
          configId: m.configId ?? m.tournamentId ?? null,
          eventId: m.eventId ?? null,
          sportName: m.sportName || m.sport || 'Sports',
          tournamentName: m.tournamentName || 'Tournament',
          eventName: m.eventName || null,
          roundName: m.roundName || m.round || null,
          teamAName: m.teamAName || m.homeTeamName || m.homeName || 'Team A',
          teamBName: m.teamBName || m.awayTeamName || m.awayName || 'Team B',
          teamAFlat: m.teamAFlat || m.homeFlat || null,
          teamBFlat: m.teamBFlat || m.awayFlat || null,
          scoreTeamA: m.scoreTeamA ?? m.homeScoreDisplay ?? (m.homeScore != null ? String(m.homeScore) : null),
          scoreTeamB: m.scoreTeamB ?? m.awayScoreDisplay ?? (m.awayScore != null ? String(m.awayScore) : null),
          status: m.status || 'SCHEDULED',
          winnerName: m.winnerName || null,
          scheduledAt: m.scheduledAt || null,
          completedAt: m.completedAt || null,
          venueName: m.venueName || m.venue || null,
        }));
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getLiveMatches(communityId?: number): Promise<MatchDto[]> {
    const qs = communityId ? `?communityId=${communityId}` : '';
    const collected: MatchDto[] = [];

    // 1. Resident-accessible live feed + config live matches in parallel
    const [feedList, cfgList] = await Promise.all([
      (async () => {
        try {
          let res = await api.get<any[]>(`/sports/live-feed${qs}`);
          if ((!res.data || res.data.length === 0) && communityId) {
            res = await api.get<any[]>('/sports/live-feed');
          }
          return Array.isArray(res.data) ? res.data.map(feedMatchToMatchDto) : [];
        } catch (err) { logApiWarn('api', err);
          return [] as MatchDto[];
        }
      })(),
      sportsService.fetchConfigMatchesAsDto({ maxConfigs: 8, maxPerConfig: 30 })
        .then((all) => all.filter((m) => m.status === 'LIVE'))
        .catch(() => [] as MatchDto[]),
    ]);

    collected.push(...feedList.filter((m) => m.status === 'LIVE'), ...cfgList);
    if (collected.length > 0) return dedupeMatchesById(collected);

    // 2. Admin endpoint fallback: /sports/matches/live
    try {
      const res = await api.get<any[]>('/sports/matches/live');
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(feedMatchToMatchDto);
      }
    } catch (_e) { /* fallback */ }

    return [];
  },

  async getTodayMatches(communityId?: number): Promise<MatchDto[]> {
    const qs = communityId ? `&communityId=${communityId}` : '';

    // Gather upcoming feed, recent completed feed, and tournament config matches in parallel
    const [upList, recList, cfgMatches] = await Promise.all([
      (async () => {
        try {
          let res = await api.get<any[]>(`/sports/upcoming-feed?limit=20${qs}`);
          if ((!res.data || res.data.length === 0) && communityId) {
            res = await api.get<any[]>('/sports/upcoming-feed?limit=20');
          }
          return Array.isArray(res.data) ? res.data.map(feedMatchToMatchDto) : [];
        } catch (err) { logApiWarn('api', err);
          return [] as MatchDto[];
        }
      })(),
      (async () => {
        try {
          let res = await api.get<any[]>(`/sports/recent-completed?limit=20${qs}`);
          if ((!res.data || res.data.length === 0) && communityId) {
            res = await api.get<any[]>('/sports/recent-completed?limit=20');
          }
          return Array.isArray(res.data) ? res.data.map(feedMatchToMatchDto) : [];
        } catch (err) { logApiWarn('api', err);
          return [] as MatchDto[];
        }
      })(),
      sportsService.fetchConfigMatchesAsDto({ maxConfigs: 8, maxPerConfig: 30 }).catch(() => [] as MatchDto[]),
    ]);

    const merged = dedupeMatchesById([...upList, ...recList, ...cfgMatches]);
    if (merged.length > 0) return merged;

    // Legacy fallbacks
    try {
      const res = await api.get<MatchDto[]>('/sports/matches/today');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (_e) { /* fallback */ }

    try {
      const res = await api.get<PageResponse<MatchDto>>('/sports/matches', {
        params: { page: 0, size: 50 },
      });
      const all = res.data?.content || [];
      if (all.length > 0) return all.map((m: any) => feedMatchToMatchDto(m));
    } catch (_e) { /* fallback */ }

    return [];
  },

  async getMatch(id: number): Promise<MatchDto> {
    // 1. Try tournament match detail endpoint (/tournament/match/{id}/detail)
    try {
      const res = await api.get<any>(`/tournament/match/${id}/detail`);
      const d = res.data;
      if (d) {
        const inner = d.match || d;
        return feedMatchToMatchDto({
          ...inner,
          matchId: inner.matchId ?? inner.id ?? id,
          sportName: d.sportName || inner.sportName || d.config?.sportName,
          tournamentName: d.tournamentName || inner.tournamentName || d.config?.tournamentName,
          venueName: inner.venueName || d.venueName,
        });
      }
    } catch (_e) { /* fallback */ }

    // 2. Try live match state endpoint
    try {
      const res = await api.get<any>(`/tournament/match/${id}/live`);
      if (res.data) return feedMatchToMatchDto({ ...res.data, matchId: res.data.matchId ?? id });
    } catch (_e) { /* fallback */ }

    // 3. Search combined resident matches list
    try {
      const page = await sportsService.getMatches();
      const found = (page.content || []).find((m) => Number(m.id) === Number(id));
      if (found) return found;
    } catch (_e) { /* fallback */ }

    const res = await api.get<MatchDto>(`/sports/matches/${id}`);
    return feedMatchToMatchDto(res.data);
  },

  async getMatchEvents(matchId: number): Promise<MatchEventDto[]> {
    try {
      const res = await api.get<any>(`/sports/matches/${matchId}/balls`);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.balls || raw?.events || []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((b: any, idx: number): MatchEventDto => ({
          id: Number(b.id ?? idx + 1),
          matchId,
          type: b.isWicket ? 'WICKET' : 'POINT',
          teamName: b.battingTeamName || b.teamName,
          playerName: b.batsmanName || b.playerName,
          description: b.commentary || b.description || `${b.runs ?? 0} run(s)${b.isWicket ? ' · WICKET!' : ''}`,
          over: b.overLabel || (b.overNumber != null ? `${b.overNumber}.${b.ballNumber ?? 0}` : undefined),
          timestamp: b.createdAt || new Date().toISOString(),
        }));
      }
    } catch (_e) { /* fallback */ }
    try {
      const res = await api.get<MatchEventDto[]>(`/sports/matches/${matchId}/events`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  // ── Live Scoring & Umpire Actions ─────────────────────────────
  async getLiveMatchState(matchId: number): Promise<any> {
    try {
      const res = await api.get<any>(`/tournament/match/${matchId}/live`);
      return res.data;
    } catch (err) { logApiWarn('api', err);
      return null;
    }
  },

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
    try {
      const res = await api.put<any>(`/sports/matches/${matchId}/status`, { status });
      return feedMatchToMatchDto(res.data);
    } catch (_e) { /* fallback */ }
    const res = await api.patch<MatchDto>(`/sports/matches/${matchId}`, { status });
    return res.data;
  },

  // ── Standings ─────────────────────────────────────────────────
  async getStandings(tournamentId: number): Promise<StandingDto[]> {
    // 1. Resolve standings from tournament scheduler config schedule
    try {
      const configs = await sportsService.getTournamentConfigs();
      const matching = configs.filter((c: any) =>
        Number(c.id) === Number(tournamentId) ||
        Number(c.tournamentId) === Number(tournamentId) ||
        Number(c.eventId) === Number(tournamentId)
      );
      const target = matching[0];
      if (target?.id) {
        const res = await api.get<any>(`/tournament/${target.id}/schedule`);
        const rawStandings = res.data?.standings || [];
        if (Array.isArray(rawStandings) && rawStandings.length > 0) {
          return rawStandings.map((row: any, idx: number): StandingDto => ({
            position: row.position ?? row.rank ?? idx + 1,
            teamId: Number(row.teamId ?? idx + 1),
            teamName: row.teamName || row.name || 'Team',
            teamEmoji: '🏅',
            played: row.played ?? row.matchesPlayed ?? 0,
            won: row.won ?? row.wins ?? 0,
            drawn: row.drawn ?? row.draws ?? 0,
            lost: row.lost ?? row.losses ?? 0,
            points: row.points ?? 0,
            goalsFor: row.goalsFor ?? 0,
            goalsAgainst: row.goalsAgainst ?? 0,
            goalDifference: row.goalDifference ?? row.netRunRate ?? 0,
          }));
        }
      }
    } catch (_e) { /* fallback */ }

    // 2. Fallback to legacy standings endpoint
    try {
      const res = await api.get<StandingDto[]>(`/sports/tournaments/${tournamentId}/standings`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
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
    } catch (_e) { /* fallback */ }

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
    } catch (err) { logApiWarn('api', err);
      return { yourRegistrations: 0, liveEvents: 0, openRegistrations: 0, upcomingTournaments: 0 };
    }
  },

  async getUpcomingEvents(communityId?: number): Promise<import('@/types/api').DashboardUpcomingEventDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardUpcomingEventDto[]>('/sports/dashboard/upcoming');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (_e) { /* fallback */ }
    try {
      const res = await api.get<import('@/types/api').DashboardUpcomingEventDto[]>('/sports/dashboard/upcoming-events');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (_e) { /* fallback */ }

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
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getOpenTournaments(communityId?: number): Promise<import('@/types/api').DashboardTournamentCardDto[]> {
    // 1. Try dashboard open tournaments (admin / user with sports permission)
    try {
      const res = await api.get<import('@/types/api').DashboardTournamentCardDto[]>('/sports/dashboard/open-tournaments');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (_e) { /* fallback */ }

    // 2. Fallback to community tournaments endpoint and map to DashboardTournamentCardDto
    try {
      const qs = communityId ? `?communityId=${communityId}` : '';
      let res = await api.get<any>(`/tournaments/community${qs}`);
      let list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if ((!list || list.length === 0) && communityId) {
        res = await api.get<any>('/tournaments/community');
        list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      }
      const nonDraft = list.filter((t: any) =>
        !['DRAFT', 'CANCELLED'].includes(String(t?.registrationStatus || t?.status || '').toUpperCase())
      );
      if (nonDraft.length > 0) {
        const openOnly = nonDraft.filter((t: any) =>
          ['REGISTRATION_OPEN', 'OPEN', 'LIVE', 'ONGOING', 'UPCOMING'].includes(
            String(t?.registrationStatus || t?.status || 'REGISTRATION_OPEN').toUpperCase(),
          ),
        );
        return (openOnly.length > 0 ? openOnly : nonDraft).map(tournamentToDashboardCard);
      }
    } catch (_e) { /* fallback */ }

    // 3. Fallback to /sports/tournaments/open
    try {
      const qs = communityId ? `?communityId=${communityId}` : '';
      const res = await api.get<any>(`/sports/tournaments/open${qs}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      if (list.length > 0) {
        return list.map(tournamentToDashboardCard);
      }
    } catch (_e) { /* fallback */ }

    // 4. Fallback to all tournaments
    try {
      const res = await api.get<any>('/tournaments/all');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      const nonDraft = list.filter((t: any) =>
        !['DRAFT', 'CANCELLED'].includes(String(t?.registrationStatus || t?.status || '').toUpperCase())
      );
      if (nonDraft.length > 0) {
        return nonDraft.map(tournamentToDashboardCard);
      }
    } catch (_e) { /* fallback */ }

    return [];
  },

  async getClosedTournaments(): Promise<import('@/types/api').DashboardTournamentCardDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardTournamentCardDto[]>('/sports/dashboard/closed-tournaments');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (_e) { /* fallback */ }
    try {
      const res = await api.get<any>('/sports/tournaments/closed');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getMyRegistrations(): Promise<import('@/types/api').DashboardMyRegistrationDto[]> {
    try {
      const res = await api.get<import('@/types/api').DashboardMyRegistrationDto[]>('/sports/dashboard/my-registrations');
      if (Array.isArray(res.data)) return res.data;
    } catch (_e) { /* fallback */ }
    try {
      const res = await api.get<any>('/sports/schedule/registrations/mine');
      if (Array.isArray(res.data)) return res.data;
    } catch (_e) { /* fallback */ }
    try {
      const res = await api.get<any>('/sports/registrations/mine');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) { logApiWarn('api', err);
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
    const res = await api.get<any>(`/sports/players/${userId}`);
    const d = res.data || {};
    const statsList = Array.isArray(d.stats) ? d.stats : (Array.isArray(d.sportStats) ? d.sportStats : []);
    const computedMatches = statsList.reduce((acc: number, s: any) => acc + (s?.matchesPlayed ?? s?.matches ?? 0), 0);
    const computedTrophies = statsList.reduce((acc: number, s: any) => acc + (s?.trophies ?? 0), 0);
    const rawBadges = Array.isArray(d.badges) ? d.badges : [];
    const enrichedBadges = rawBadges.map((b: any) => {
      const meta = BADGE_META_MAP[String(b?.id || '')] || null;
      return {
        ...b,
        title: b?.title || b?.name || meta?.title || String(b?.id || 'Badge').replace(/_/g, ' '),
        emoji: b?.emoji || meta?.emoji || '🏅',
        tier: b?.tier || b?.rarity || meta?.tier || 'common',
      };
    });
    return {
      ...d,
      stats: statsList,
      sportStats: statsList,
      badges: enrichedBadges,
      totalMatches: d.totalMatches || computedMatches,
      totalTrophies: d.totalTrophies || computedTrophies,
    };
  },

  async getMyProfile(): Promise<PlayerProfileDto> {
    const res = await api.get<any>('/sports/players/me');
    const d = res.data || {};
    const statsList = Array.isArray(d.stats) ? d.stats : (Array.isArray(d.sportStats) ? d.sportStats : []);
    const computedMatches = statsList.reduce((acc: number, s: any) => acc + (s?.matchesPlayed ?? s?.matches ?? 0), 0);
    const computedTrophies = statsList.reduce((acc: number, s: any) => acc + (s?.trophies ?? 0), 0);
    const rawBadges = Array.isArray(d.badges) ? d.badges : [];
    const enrichedBadges = rawBadges.map((b: any) => {
      const meta = BADGE_META_MAP[String(b?.id || '')] || null;
      return {
        ...b,
        title: b?.title || b?.name || meta?.title || String(b?.id || 'Badge').replace(/_/g, ' '),
        emoji: b?.emoji || meta?.emoji || '🏅',
        tier: b?.tier || b?.rarity || meta?.tier || 'common',
      };
    });
    return {
      ...d,
      stats: statsList,
      sportStats: statsList,
      badges: enrichedBadges,
      totalMatches: d.totalMatches || computedMatches,
      totalTrophies: d.totalTrophies || computedTrophies,
    };
  },

  // ── Leaderboard ──────────────────────────────────────────────
  async getLeaderboard(
    sport: SportType | 'ALL',
    category: LeaderboardCategory,
    period: 'MONTH' | 'SEASON' | 'ALL_TIME' = 'ALL_TIME',
  ): Promise<LeaderboardEntryDto[]> {
    try {
      const res = await api.get<any[]>('/sports/leaderboard', {
        params: {
          sport:    sport === 'ALL' ? undefined : sport,
          category,
          period,
        },
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((item: any, idx: number): LeaderboardEntryDto => ({
          ...item,
          rank: item.rank ?? idx + 1,
          playerName: item.playerName || item.name || 'Athlete',
          name: item.name || item.playerName || 'Athlete',
          flatNumber: item.flatNumber || item.flatNo || '',
          score: item.score ?? item.value ?? 0,
          matchesPlayed: item.matchesPlayed ?? 0,
          displayValue: item.displayValue || `${item.score ?? item.value ?? 0} pts`,
        }));
      }
    } catch (_e) { /* fallback */ }

    // Fallback: build leaderboard from /sports/rankings or tournament leaderboard
    try {
      const rankings = await sportsService.getRankings(sport !== 'ALL' ? { sport } : undefined);
      if (Array.isArray(rankings) && rankings.length > 0) {
        return rankings.map((r: any, idx: number): LeaderboardEntryDto => ({
          rank: r.rank ?? idx + 1,
          userId: Number(r.player?.id ?? r.userId ?? idx + 1),
          playerName: r.player?.fullName || r.playerName || `Player ${idx + 1}`,
          name: r.player?.fullName || r.playerName || `Player ${idx + 1}`,
          flatNumber: r.player?.flatNo || '',
          score: r.rating ?? 0,
          matchesPlayed: 0,
          displayValue: r.rating ? `${r.rating} pts` : `#${r.rank ?? idx + 1}`,
          topBadge: r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : undefined,
        }));
      }
    } catch (_e) { /* fallback */ }

    return [];
  },

  // ── Badges ───────────────────────────────────────────────────
  async getAllBadges(): Promise<BadgeDto[]> {
    try {
      const res = await api.get<BadgeDto[]>('/sports/badges');
      return res.data ?? [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  async getPlayerBadges(userId: number): Promise<BadgeDto[]> {
    try {
      const res = await api.get<BadgeDto[]>(`/sports/players/${userId}/badges`);
      return res.data ?? [];
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },

  // ── Match Photo Gallery ──────────────────────────────────────
  async getMatchPhotos(matchId: number): Promise<MatchPhotoDto[]> {
    try {
      const res = await api.get<MatchPhotoDto[]>(`/sports/matches/${matchId}/photos`);
      return res.data ?? [];
    } catch (err) { logApiWarn('api', err);
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
      creatorId: req.creatorId ?? 0,
      creatorName: req.creatorName ?? 'You (Host)',
      creatorFlat: req.creatorFlat ?? 'Resident',
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
      const updated = {
        ...sessionChallenges[idx],
        status: 'ACCEPTED' as const,
        challengerName,
        challengerFlat,
      };
      sessionChallenges.splice(idx, 1, updated);
      return updated;
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
    } catch (err) { logApiWarn('api', err);
      return null;
    }
  },
  async refreshCricHeroesProfile(playerId: number): Promise<SportsCricHeroesProfileResponse> {
    const res = await api.get<SportsCricHeroesProfileResponse>(`/api/cricheroes/profile/${playerId}/refresh`);
    return res.data;
  },
  async refreshCricHeroesProfileAsync(playerId: number): Promise<{ status: string; playerId: number }> {
    const res = await api.post<{ status: string; playerId: number }>(`/api/cricheroes/profile/${playerId}/refresh-async`);
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
    try {
      // Backend /api/sports/rankings requires numeric sportId param
      const metaRes = await api.get<any[]>('/sports/meta').catch(() => ({ data: [] }));
      const sportsMeta = Array.isArray(metaRes.data) ? metaRes.data : [];
      if (sportsMeta.length === 0) return [];

      const season = params?.season || 'CURRENT';
      const targetMeta = params?.sport && params.sport !== 'ALL'
        ? sportsMeta.filter((s: any) => doesSportMatchFilter(s?.name, params.sport))
        : sportsMeta.slice(0, 6);

      if (targetMeta.length === 0) return [];
      const results = await Promise.all(
        targetMeta.map(async (sp: any) => {
          try {
            const res = await api.get<SportsPlayerRankingResponse[]>('/sports/rankings', {
              params: { sportId: sp.id, season },
            });
            return Array.isArray(res.data) ? res.data : [];
          } catch (err) { logApiWarn('api', err);
            return [];
          }
        }),
      );
      return results.flat();
    } catch (err) { logApiWarn('api', err);
      return [];
    }
  },
  async getMyRanking(userId: number): Promise<SportsPlayerRankingResponse | null> {
    try {
      const res = await api.get<any>(`/sports/rankings/user/${userId}`);
      if (Array.isArray(res.data)) return res.data[0] ?? null;
      return res.data ?? null;
    } catch (err) { logApiWarn('getUserRanking', err); return null; }
  },
};

const sessionChallenges: SportsChallengeDto[] = [];

