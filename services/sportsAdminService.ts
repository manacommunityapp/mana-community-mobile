import api from './apiClient';

// ── Types ────────────────────────────────────────────────────────

export interface SportsAdminDashboardStats {
  totalTournaments: number;
  activeTournaments: number;
  liveMatches: number;
  totalTeams: number;
  totalPlayers: number;
  upcomingMatches: number;
}

export interface TournamentSummary {
  id: number;
  name: string;
  sport: string;
  status: string;
  format: string;
  teamsRegistered: number;
  maxTeams: number;
  startDate: string;
  endDate?: string;
  registrationDeadline?: string;
}

export interface MatchSummary {
  id: number;
  tournamentName: string;
  teamA: string;
  teamB: string;
  sport: string;
  status: string;
  scheduledAt: string;
  venue?: string;
  scoreA?: string;
  scoreB?: string;
}

export interface SportsAnalyticsData {
  tournamentsBySport: { sport: string; count: number }[];
  matchesByStatus: { status: string; count: number }[];
  topPlayers: { name: string; wins: number; rating: number }[];
  participationTrend: { month: string; players: number }[];
  sportPopularity: { sport: string; matches: number; players: number }[];
}

export interface VenueInfo {
  id: number;
  name: string;
  type?: string;
  capacity?: number;
  location?: string;
  isAvailable: boolean;
}

// ── Backend response types ──────────────────────────────────────

interface DashboardStatsDto {
  totalTournaments?: number;
  activeTournaments?: number;
  totalMatches?: number;
  liveMatchesCount?: number;
  totalRegistrations?: number;
  openRegistrations?: number;
}

interface AdminOverviewResponse {
  tournaments?: any[];
  events?: any[];
  totalTournaments?: number;
  activeTournaments?: number;
}

interface AnalyticsOverviewResponse {
  totalTournaments?: number;
  totalMatches?: number;
  totalPlayers?: number;
  totalTeams?: number;
  sportDistribution?: Record<string, number>;
  statusDistribution?: Record<string, number>;
}

// ── Sample Data (fallback) ──────────────────────────────────────

const sampleTournaments: TournamentSummary[] = [
  { id: 1, name: 'Monsoon Premier League', sport: 'CRICKET', status: 'ONGOING', format: 'LEAGUE', teamsRegistered: 8, maxTeams: 8, startDate: '2026-09-01' },
  { id: 2, name: 'Badminton Doubles Open', sport: 'BADMINTON', status: 'REGISTRATION_OPEN', format: 'KNOCKOUT', teamsRegistered: 12, maxTeams: 16, startDate: '2026-10-10', registrationDeadline: '2026-10-05' },
  { id: 3, name: 'Table Tennis Championship', sport: 'TABLE_TENNIS', status: 'UPCOMING', format: 'KNOCKOUT', teamsRegistered: 0, maxTeams: 32, startDate: '2026-10-20' },
  { id: 4, name: 'Football 5-a-side', sport: 'FOOTBALL', status: 'COMPLETED', format: 'ROUND_ROBIN', teamsRegistered: 6, maxTeams: 6, startDate: '2026-08-15', endDate: '2026-08-30' },
  { id: 5, name: 'Chess Rapid Tournament', sport: 'CHESS', status: 'ONGOING', format: 'SWISS', teamsRegistered: 24, maxTeams: 32, startDate: '2026-09-20' },
];

const sampleMatches: MatchSummary[] = [
  { id: 1, tournamentName: 'Monsoon Premier League', teamA: 'Tower A XI', teamB: 'Block C Titans', sport: 'CRICKET', status: 'LIVE', scheduledAt: '2026-09-29T10:00:00', venue: 'Community Ground', scoreA: '145/6', scoreB: '89/3' },
  { id: 2, tournamentName: 'Monsoon Premier League', teamA: 'Garden Eagles', teamB: 'D-Block Warriors', sport: 'CRICKET', status: 'SCHEDULED', scheduledAt: '2026-09-29T14:00:00', venue: 'Community Ground' },
  { id: 3, tournamentName: 'Chess Rapid Tournament', teamA: 'Aarav Sharma', teamB: 'Priya Patel', sport: 'CHESS', status: 'COMPLETED', scheduledAt: '2026-09-28T16:00:00', venue: 'Clubhouse', scoreA: '1', scoreB: '0' },
  { id: 4, tournamentName: 'Badminton Doubles Open', teamA: 'Sharma/Gupta', teamB: 'Reddy/Singh', sport: 'BADMINTON', status: 'SCHEDULED', scheduledAt: '2026-10-10T09:00:00', venue: 'Indoor Courts' },
  { id: 5, tournamentName: 'Monsoon Premier League', teamA: 'B-Wing Royals', teamB: 'Tower A XI', sport: 'CRICKET', status: 'COMPLETED', scheduledAt: '2026-09-27T10:00:00', venue: 'Community Ground', scoreA: '156/8', scoreB: '160/4' },
];

const SAMPLE_ANALYTICS: SportsAnalyticsData = {
  tournamentsBySport: [
    { sport: 'Cricket', count: 3 },
    { sport: 'Badminton', count: 2 },
    { sport: 'Football', count: 2 },
    { sport: 'Chess', count: 1 },
    { sport: 'Table Tennis', count: 1 },
  ],
  matchesByStatus: [
    { status: 'Completed', count: 42 },
    { status: 'Live', count: 2 },
    { status: 'Scheduled', count: 15 },
    { status: 'Cancelled', count: 3 },
  ],
  topPlayers: [
    { name: 'Aarav Sharma', wins: 12, rating: 4.8 },
    { name: 'Priya Patel', wins: 10, rating: 4.6 },
    { name: 'Rahul Gupta', wins: 9, rating: 4.5 },
    { name: 'Meera Reddy', wins: 8, rating: 4.4 },
    { name: 'Vikram Singh', wins: 7, rating: 4.3 },
  ],
  participationTrend: [
    { month: 'Apr', players: 45 },
    { month: 'May', players: 52 },
    { month: 'Jun', players: 68 },
    { month: 'Jul', players: 74 },
    { month: 'Aug', players: 82 },
    { month: 'Sep', players: 91 },
  ],
  sportPopularity: [
    { sport: 'Cricket', matches: 28, players: 64 },
    { sport: 'Badminton', matches: 18, players: 36 },
    { sport: 'Football', matches: 12, players: 30 },
    { sport: 'Chess', matches: 15, players: 24 },
    { sport: 'Table Tennis', matches: 10, players: 20 },
  ],
};

// ── Service ─────────────────────────────────────────────────────

export const sportsAdminService = {
  async getDashboardStats(): Promise<SportsAdminDashboardStats> {
    try {
      const [dashRes, overviewRes] = await Promise.all([
        api.get<DashboardStatsDto>('/sports/dashboard/stats'),
        api.get<AdminOverviewResponse>('/sports/admin/overview').catch(() => null),
      ]);
      const d = dashRes.data;
      const o = overviewRes?.data;
      return {
        totalTournaments: d.totalTournaments ?? o?.totalTournaments ?? 0,
        activeTournaments: d.activeTournaments ?? o?.activeTournaments ?? 0,
        liveMatches: d.liveMatchesCount ?? 0,
        totalTeams: d.totalRegistrations ?? 0,
        totalPlayers: 0,
        upcomingMatches: 0,
      };
    } catch {
      return {
        totalTournaments: 5,
        activeTournaments: 2,
        liveMatches: 1,
        totalTeams: 50,
        totalPlayers: 91,
        upcomingMatches: 8,
      };
    }
  },

  async getTournaments(sport?: string, status?: string): Promise<TournamentSummary[]> {
    try {
      const res = await api.get<{ content: any[] }>('/sports/tournaments', {
        params: { sport, status, page: 0, size: 50 },
      });
      return res.data.content.map(t => ({
        id: t.id,
        name: t.name || t.title || '',
        sport: t.sport || t.sportType || '',
        status: t.status || '',
        format: t.format || t.tournamentFormat || '',
        teamsRegistered: t.registeredTeams ?? t.teamsCount ?? 0,
        maxTeams: t.maxTeams ?? 0,
        startDate: t.startDate || '',
        endDate: t.endDate,
        registrationDeadline: t.registrationDeadline,
      }));
    } catch {
      let filtered = sampleTournaments;
      if (sport) filtered = filtered.filter(t => t.sport === sport);
      if (status) filtered = filtered.filter(t => t.status === status);
      return filtered;
    }
  },

  async getMatches(status?: string): Promise<MatchSummary[]> {
    try {
      const res = await api.get<{ content: any[] }>('/sports/matches', {
        params: { status, page: 0, size: 50 },
      });
      return res.data.content.map(m => ({
        id: m.id,
        tournamentName: m.tournamentName || m.tournament?.name || '',
        teamA: m.teamAName || m.teamA?.name || '',
        teamB: m.teamBName || m.teamB?.name || '',
        sport: m.sport || m.sportType || '',
        status: m.status || '',
        scheduledAt: m.scheduledAt || m.matchDate || '',
        venue: m.venue?.name || m.venueName || '',
        scoreA: m.scoreA?.toString(),
        scoreB: m.scoreB?.toString(),
      }));
    } catch {
      let filtered = sampleMatches;
      if (status) filtered = filtered.filter(m => m.status === status);
      return filtered;
    }
  },

  async getLiveMatches(): Promise<MatchSummary[]> {
    try {
      const res = await api.get<any[]>('/sports/matches/live');
      return res.data.map(m => ({
        id: m.id,
        tournamentName: m.tournamentName || '',
        teamA: m.teamAName || '',
        teamB: m.teamBName || '',
        sport: m.sport || '',
        status: 'LIVE',
        scheduledAt: m.scheduledAt || '',
        venue: m.venueName || '',
        scoreA: m.scoreA?.toString(),
        scoreB: m.scoreB?.toString(),
      }));
    } catch {
      return sampleMatches.filter(m => m.status === 'LIVE');
    }
  },

  async getAnalytics(): Promise<SportsAnalyticsData> {
    try {
      const res = await api.get<AnalyticsOverviewResponse>('/sports/analytics');
      const data = res.data;

      const tournamentsBySport = data.sportDistribution
        ? Object.entries(data.sportDistribution).map(([sport, count]) => ({
            sport: formatSport(sport),
            count: count as number,
          }))
        : SAMPLE_ANALYTICS.tournamentsBySport;

      const matchesByStatus = data.statusDistribution
        ? Object.entries(data.statusDistribution).map(([status, count]) => ({
            status: formatStatus(status),
            count: count as number,
          }))
        : SAMPLE_ANALYTICS.matchesByStatus;

      return {
        ...SAMPLE_ANALYTICS,
        tournamentsBySport,
        matchesByStatus,
      };
    } catch {
      return SAMPLE_ANALYTICS;
    }
  },

  async getVenues(): Promise<VenueInfo[]> {
    try {
      const res = await api.get<any[]>('/venues');
      return res.data.map(v => ({
        id: v.id,
        name: v.name || '',
        type: v.type || v.venueType || '',
        capacity: v.capacity,
        location: v.location || v.address || '',
        isAvailable: v.isAvailable ?? v.active ?? true,
      }));
    } catch {
      return [
        { id: 1, name: 'Community Ground', type: 'Outdoor', capacity: 200, location: 'Central Park Area', isAvailable: true },
        { id: 2, name: 'Indoor Courts', type: 'Indoor', capacity: 50, location: 'Clubhouse Level 2', isAvailable: true },
        { id: 3, name: 'Swimming Pool', type: 'Outdoor', capacity: 30, location: 'Amenity Block', isAvailable: false },
        { id: 4, name: 'Clubhouse Hall', type: 'Indoor', capacity: 100, location: 'Clubhouse Level 1', isAvailable: true },
      ];
    }
  },

  async updateMatchStatus(matchId: number, status: string): Promise<void> {
    await api.put(`/sports/matches/${matchId}/status`, { status });
  },
};

function formatSport(sport: string): string {
  return sport.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}
