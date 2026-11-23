import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { tokenStore } from '@/services/apiClient';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sportsService, doesSportMatchFilter } from '@/services/sportsService';
import { facilityService, FacilityDto } from '@/services/facilityService';
import { commuteService } from '@/services/commuteService';
import { SportsRegisterModal, RegistrationRecord } from '@/components/sports/SportsRegisterModal';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, CONFIG } from '@/constants/config';
import { SPORT_EMOJI } from '@/constants/sports';
import { useAuth } from '@/hooks/useAuth';
import { useModuleGuard } from '@/hooks/useRoleGuard';
import { resolveImageUrl } from '@/utils/imageUrlUtils';
import { formatTournamentDateRange, safeFormat, parseSafeDate } from '@/utils/dateUtils';
import type {
  MatchDto, TournamentDto, PlayerProfileDto, LeaderboardEntryDto,
  SportType, DashboardTournamentCardDto, DashboardEventCardDto, PageResponse,
} from '@/types/api';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Sport Definitions ─────────────────────────────────────────────
const SPORT_FILTERS = [
  { id: 'ALL',          label: 'All',          emoji: '🏅' },
  { id: 'CRICKET',      label: 'Cricket',      emoji: '🏏' },
  { id: 'BADMINTON',    label: 'Badminton',    emoji: '🏸' },
  { id: 'FOOTBALL',     label: 'Football',     emoji: '⚽' },
  { id: 'PICKLEBALL',   label: 'Pickleball',   emoji: '🏓' },
  { id: 'TENNIS',       label: 'Tennis',       emoji: '🎾' },
  { id: 'TABLE_TENNIS', label: 'Table Tennis', emoji: '🏓' },
  { id: 'BASKETBALL',   label: 'Basketball',   emoji: '🏀' },
  { id: 'VOLLEYBALL',   label: 'Volleyball',   emoji: '🏐' },
  { id: 'CHESS',        label: 'Chess',        emoji: '♟️' },
  { id: 'CARROM',       label: 'Carrom',       emoji: '🎯' },
  { id: 'SWIMMING',     label: 'Swimming',     emoji: '🏊' },
] as const;

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#D97706'];

// ── Sport-specific score formatting ───────────────────────────────
function formatMatchScore(m: MatchDto): { home: string; away: string; detail?: string } {
  const dispHome = m.homeScoreDisplay;
  const dispAway = m.awayScoreDisplay;
  if (dispHome != null && String(dispHome).trim() !== '' && dispAway != null && String(dispAway).trim() !== '') {
    return {
      home: String(dispHome).trim(),
      away: String(dispAway).trim(),
      detail: m.currentPeriod || undefined,
    };
  }
  const sport = (m.sport || '').toUpperCase();
  if (sport === 'CRICKET') {
    const homeOvers = m.homeOvers ? ` (${m.homeOvers} ov)` : '';
    const awayOvers = m.awayOvers ? ` (${m.awayOvers} ov)` : '';
    const homeWkts = m.homeWickets != null ? `/${m.homeWickets}` : '';
    const awayWkts = m.awayWickets != null ? `/${m.awayWickets}` : '';
    return {
      home: dispHome ? String(dispHome) : `${m.homeScore ?? 0}${homeWkts}${homeOvers}`,
      away: dispAway ? String(dispAway) : `${m.awayScore ?? 0}${awayWkts}${awayOvers}`,
      detail: m.currentPeriod || undefined,
    };
  }
  if (['BADMINTON', 'TABLE_TENNIS', 'PICKLEBALL', 'TENNIS', 'SQUASH'].includes(sport)) {
    const sets = (m.homeSetsWon != null && m.awaySetsWon != null)
      ? `Sets: ${m.homeSetsWon}–${m.awaySetsWon}`
      : undefined;
    return {
      home: dispHome ? String(dispHome) : String(m.homeScore ?? 0),
      away: dispAway ? String(dispAway) : String(m.awayScore ?? 0),
      detail: sets || m.currentPeriod || undefined,
    };
  }
  if (['FOOTBALL', 'BASKETBALL'].includes(sport)) {
    const elapsed = m.elapsedMinutes ? `${m.elapsedMinutes}'` : undefined;
    const period = m.currentPeriod || undefined;
    return {
      home: dispHome ? String(dispHome) : String(m.homeScore ?? 0),
      away: dispAway ? String(dispAway) : String(m.awayScore ?? 0),
      detail: elapsed || period || undefined,
    };
  }
  return {
    home: dispHome ? String(dispHome) : String(m.homeScore ?? 0),
    away: dispAway ? String(dispAway) : String(m.awayScore ?? 0),
    detail: m.currentPeriod || undefined,
  };
}

function getCountdown(dateVal: any): string | null {
  const d = parseSafeDate(dateVal);
  if (!d) return null;
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 7) return `${Math.ceil(days / 7)}w left`;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${mins}m left`;
}

function getMatchStatusColor(status: string): string {
  switch (status) {
    case 'LIVE': case 'IN_PROGRESS': return '#EF4444';
    case 'COMPLETED': return '#10B981';
    case 'SCHEDULED': return '#F59E0B';
    default: return COLORS.textMuted;
  }
}

export default function SportsHubScreen() {
  const router = useRouter();
  const { user, isAnyAdmin, isAdmin, isSuperAdmin, hasRole, hasAnyPermission } = useAuth();
  useModuleGuard('SPORTS');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [liveIndex, setLiveIndex] = useState(0);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedRegisterEventId, setSelectedRegisterEventId] = useState<number | null>(null);
  const [customRegistrations, setCustomRegistrations] = useState<RegistrationRecord[]>([]);
  const [wsScores, setWsScores] = useState<Record<number, Partial<MatchDto>>>({});
  const [scoreFlash, setScoreFlash] = useState<number | null>(null);
  const stompHubRef = useRef<Client | null>(null);

  const isSportsAdmin = useMemo(() => {
    return Boolean(
      isAnyAdmin || isAdmin || isSuperAdmin ||
      hasRole?.('SPORTS_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'COMMUNITY_ADMIN', 'SPORTS_REFEREE') ||
      hasAnyPermission?.('View Sports Dashboard', 'View Admin', 'Manage Matches', 'Manage Tournaments') ||
      user?.role?.toUpperCase().includes('ADMIN') ||
      user?.role === 'SPORTS_ADMIN'
    );
  }, [isAnyAdmin, isAdmin, isSuperAdmin, hasRole, hasAnyPermission, user?.role]);

  // ── Data Queries ──────────────────────────────────────────────
  const { data: liveMatches = [], refetch: refetchLive, isRefetching: isRefetchingLive } = useQuery<MatchDto[]>({
    queryKey: ['sports-live', user?.communityId],
    queryFn: () => sportsService.getLiveMatches(user?.communityId),
    refetchInterval: 15_000,
  });

  const { data: todayMatches = [], refetch: refetchToday } = useQuery<MatchDto[]>({
    queryKey: ['sports-today', user?.communityId],
    queryFn: () => sportsService.getTodayMatches(user?.communityId),
    refetchInterval: 60_000,
  });

  const { data: tournamentsPage, refetch: refetchTournaments } = useQuery<PageResponse<TournamentDto>>({
    queryKey: ['tournaments-hub', selectedSport, user?.communityId],
    queryFn: () => sportsService.getTournaments(selectedSport === 'ALL' ? undefined : (selectedSport as SportType), undefined, 0, user?.communityId),
  });

  const { data: openTournamentsDash = [], refetch: refetchOpenTournaments } = useQuery<DashboardTournamentCardDto[]>({
    queryKey: ['tournaments-open-dash', user?.communityId],
    queryFn: () => sportsService.getOpenTournaments(user?.communityId),
    staleTime: 30_000,
  });

  const { data: playerProfile, refetch: refetchProfile } = useQuery<PlayerProfileDto>({
    queryKey: ['sports-player-me'],
    queryFn: sportsService.getMyProfile,
    staleTime: 30_000,
  });

  const { data: facilities = [], isLoading: loadingFacilities, refetch: refetchFacilities } = useQuery<FacilityDto[]>({
    queryKey: ['facilities-sports'],
    queryFn: facilityService.getFacilities,
    staleTime: 60_000,
  });

  const { data: leaderboard = [], refetch: refetchLeaderboard } = useQuery<LeaderboardEntryDto[]>({
    queryKey: ['sports-leaderboard-top', selectedSport],
    queryFn: () => sportsService.getLeaderboard(selectedSport === 'ALL' ? 'ALL' : (selectedSport as SportType), 'WINS', 'ALL_TIME'),
    staleTime: 30_000,
  });

  const { data: myRegistrationsApi = [], refetch: refetchRegistrations } = useQuery({
    queryKey: ['sports-my-registrations'],
    queryFn: sportsService.getMyRegistrations,
    staleTime: 30_000,
  });

  const { data: dashStats, refetch: refetchStats } = useQuery({
    queryKey: ['sports-dashboard-stats'],
    queryFn: sportsService.getDashboardStats,
    staleTime: 30_000,
  });

  const { data: communityRidesPage } = useQuery({
    queryKey: ['sports-hub-rides'],
    queryFn: () => commuteService.getUpcomingRides(undefined, 0),
    staleTime: 60_000,
  });
  const communityRides = (communityRidesPage?.content ?? []).slice(0, 3);

  // ── Refresh ───────────────────────────────────────────────────
  const isRefreshing = isRefetchingLive;
  const handleRefresh = async () => {
    await Promise.all([
      refetchLive(), refetchToday(), refetchTournaments(), refetchProfile(),
      refetchFacilities(), refetchLeaderboard(), refetchOpenTournaments(),
      refetchRegistrations(), refetchStats(),
    ]);
  };

  // ── WebSocket: real-time score push for live matches ─────────────
  useEffect(() => {
    if (!liveMatches || liveMatches.length === 0) return;
    const liveIds = liveMatches
      .filter(m => m.status === 'LIVE' || (m.status as string) === 'IN_PROGRESS')
      .map(m => m.id);
    if (liveIds.length === 0) return;

    let client: Client;
    (async () => {
      const token = await tokenStore.getAccess();
      if (!token) return;
      client = new Client({
        brokerURL: CONFIG.WS_URL,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          liveIds.forEach(id => {
            const handleUpdate = (frame: { body: string }) => {
              try {
                const ev = JSON.parse(frame.body);
                const patch: Partial<MatchDto> = {};
                if (ev.homeScore    !== undefined) patch.homeScore    = ev.homeScore;
                if (ev.awayScore    !== undefined) patch.awayScore    = ev.awayScore;
                if (ev.status       !== undefined) patch.status       = ev.status;
                if (ev.currentPeriod   !== undefined) patch.currentPeriod   = ev.currentPeriod;
                if (ev.elapsedMinutes  !== undefined) patch.elapsedMinutes  = ev.elapsedMinutes;
                if (ev.homeSetsWon  !== undefined) patch.homeSetsWon  = ev.homeSetsWon;
                if (ev.awaySetsWon  !== undefined) patch.awaySetsWon  = ev.awaySetsWon;
                if (ev.homeOvers    !== undefined) patch.homeOvers    = ev.homeOvers;
                if (ev.homeWickets  !== undefined) patch.homeWickets  = ev.homeWickets;
                if (ev.awayOvers    !== undefined) patch.awayOvers    = ev.awayOvers;
                if (ev.awayWickets  !== undefined) patch.awayWickets  = ev.awayWickets;
                if (Object.keys(patch).length > 0) {
                  setWsScores(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
                  setScoreFlash(id);
                  setTimeout(() => setScoreFlash(cur => cur === id ? null : cur), 900);
                }
              } catch {}
            };
            client.subscribe(`/topic/sports.match.${id}`, handleUpdate);
            client.subscribe(`/topic/match/${id}/state`,  handleUpdate);
          });
        },
        onStompError: () => {},
      });
      client.activate();
      stompHubRef.current = client;
    })();
    return () => {
      stompHubRef.current?.deactivate();
      stompHubRef.current = null;
    };
  // reconnect only when the set of live match IDs changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMatches?.map(m => m.id).join(',')]);

  // ── Derived Data ──────────────────────────────────────────────
  const filteredLive = useMemo(() => {
    if (!liveMatches) return [];
    return selectedSport === 'ALL'
      ? liveMatches
      : liveMatches.filter((m) => doesSportMatchFilter((m as any).rawSportName || m.sport, selectedSport));
  }, [liveMatches, selectedSport]);

  const filteredToday = useMemo(() => {
    if (!todayMatches) return [];
    return selectedSport === 'ALL'
      ? todayMatches
      : todayMatches.filter((m) => doesSportMatchFilter((m as any).rawSportName || m.sport, selectedSport));
  }, [todayMatches, selectedSport]);

  const scheduledMatches = useMemo(() => {
    return filteredToday
      .filter((m) => m.status !== 'COMPLETED' && m.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime())
      .slice(0, 6);
  }, [filteredToday]);

  const recentCompleted = useMemo(() => {
    return filteredToday
      .filter((m) => m.status === 'COMPLETED')
      .sort((a, b) => new Date(b.endedAt || b.scheduledAt || 0).getTime() - new Date(a.endedAt || a.scheduledAt || 0).getTime())
      .slice(0, 6);
  }, [filteredToday]);

  const sportsFacilities = useMemo(() => {
    const keywords = ['BADMINTON', 'TENNIS', 'SWIMMING', 'CRICKET', 'GYM', 'SQUASH', 'TABLE_TENNIS', 'BASKETBALL', 'PICKLEBALL', 'FOOTBALL', 'COURT', 'TURF', 'POOL'];
    return facilities.filter((f) => {
      const up = `${f.type || ''} ${f.name || ''}`.toUpperCase();
      const match = keywords.some(k => up.includes(k));
      if (!match) return false;
      if (selectedSport === 'ALL') return true;
      return doesSportMatchFilter(up, selectedSport);
    });
  }, [facilities, selectedSport]);

  const activeLiveMatch = useMemo(() => {
    const base = filteredLive[liveIndex] ?? filteredLive[0] ?? null;
    if (!base) return null;
    const override = wsScores[base.id];
    return override ? { ...base, ...override } : base;
  }, [filteredLive, liveIndex, wsScores]);

  // Player profile derived
  const profileStats = useMemo(() => {
    const stats = playerProfile?.stats || playerProfile?.sportStats || [];
    const statsTotalMatches = stats.reduce((a, s) => a + (s.matchesPlayed || s.matches || 0), 0);
    const totalMatches = playerProfile?.totalMatches ? playerProfile.totalMatches : statsTotalMatches;
    const totalWins = stats.reduce((a, s) => a + (s.wins || 0), 0);
    const statsTotalTrophies = stats.reduce((a, s) => a + (s.trophies || 0), 0);
    const totalTrophies = playerProfile?.totalTrophies ? playerProfile.totalTrophies : statsTotalTrophies;
    return { totalMatches, totalWins, totalTrophies, sportCount: stats.length, stats };
  }, [playerProfile]);

  // Merged registrations
  const allRegistrations = useMemo(() => {
    const apiRecords: (RegistrationRecord & {
      eventId?: number | null;
      tournamentId?: number | null;
      eventDate?: string;
      startTime?: string | null;
      categoryName?: string;
      matchType?: string;
      captainNomination?: boolean;
      playerName?: string | null;
      relation?: string | null;
      flatNumber?: string | null;
      partnerName?: string | null;
      partnerStatus?: string | null;
    })[] =
      (myRegistrationsApi || []).map((r: any) => {
        const st = String(r.status || '').toUpperCase();
        const isConfirmed = ['CONFIRMED', 'APPROVED', 'REGISTERED', 'ACTIVE'].includes(st);
        return {
          id: String(r.id),
          eventId: r.eventId ?? null,
          tournamentId: r.tournamentId ?? r.eventId ?? null,
          tournamentName: r.tournamentName || r.eventName || 'Tournament',
          sport: r.sportName || 'Sport',
          team: r.proposedTeamName || r.teamName || r.playerName || user?.name || user?.fullName || 'Resident Team',
          status: (isConfirmed ? 'Confirmed' : 'Pending') as 'Confirmed' | 'Pending',
          players: r.matchType === 'DOUBLES' ? 2 : 1,
          plan: 'Community Registration',
          fee: 0,
          eventDate: r.eventDateStart || null,
          startTime: r.startTime || null,
          categoryName: r.categoryName || null,
          matchType: r.matchType || null,
          captainNomination: r.captainNomination || false,
          venueName: r.venueName || null,
          playerName: r.playerName || user?.fullName || user?.name || null,
          relation: r.relation || null,
          flatNumber: r.flatNumber || r.flatNo || null,
          partnerName: r.partnerName || null,
          partnerStatus: r.partnerStatus || r.partnerConfirmationStatus || null,
        };
      });
    const existingIds = new Set(apiRecords.map(a => a.id));
    return [...customRegistrations.filter(c => !existingIds.has(c.id)), ...apiRecords];
  }, [myRegistrationsApi, customRegistrations, user?.name, user?.fullName]);

  // Open tournaments with filtered events
  const openTournamentsWithFilteredEvents = useMemo(() => {
    let baseList = openTournamentsDash;
    if ((!baseList || baseList.length === 0) && tournamentsPage?.content?.length) {
      baseList = tournamentsPage.content.map((t: any) => ({
        id: t.id,
        name: t.name || t.title || 'Tournament',
        bannerImage: t.bannerImage || null,
        eventDateStart: t.eventDateStart || t.startDate || null,
        eventDateEnd: t.eventDateEnd || t.endDate || null,
        registrationStatus: t.registrationStatus || t.status || 'REGISTRATION_OPEN',
        communityId: t.communityId || null,
        communityName: t.communityName || null,
        events: ((t.events || t.sportsEvents || []).length > 0
          ? (t.events || t.sportsEvents)
          : [{
              id: t.id, name: t.name || 'Tournament Event',
              eventDateStart: t.eventDateStart || t.startDate,
              eventDateEnd: t.eventDateEnd || t.endDate,
              sportName: t.sport || t.sportType || 'Sports',
              categoryName: t.category || '', venueName: t.venue?.name || t.venueName || '',
              maxParticipants: t.maxParticipants ?? null, registeredCount: t.registeredCount ?? 0,
              registrationStatus: t.status || t.registrationStatus || 'REGISTRATION_OPEN',
              auctionStatus: null, teamSport: false,
              myRegistrationId: null, myRegistrationStatus: null,
            }]
        ).map((ev: any) => ({
          id: ev.id, name: ev.name || t.name,
          eventDateStart: ev.eventDateStart || t.eventDateStart,
          eventDateEnd: ev.eventDateEnd || t.eventDateEnd,
          sportName: ev.sport?.name || ev.sportName || t.sport || t.name,
          categoryName: ev.categories?.[0]?.name || ev.categoryName || '',
          venueName: ev.venue?.name || ev.venueName || '',
          maxParticipants: ev.maxParticipants ?? null,
          registeredCount: ev.registeredCount ?? 0,
          registrationStatus: ev.status || ev.registrationStatus || t.registrationStatus || 'REGISTRATION_OPEN',
          auctionStatus: ev.auctionStatus || null,
          teamSport: (ev.minPlayers && ev.minPlayers > 1) || false,
          myRegistrationId: ev.myRegistrationId ?? null, myRegistrationStatus: ev.myRegistrationStatus ?? null,
        })),
      })) as any;
    }
    return (baseList || [])
      .map(t => {
        const events = (t.events || []).filter(ev =>
          selectedSport === 'ALL' || doesSportMatchFilter(ev.sportName || ev.name, selectedSport)
        );
        return { ...t, filteredEvents: events };
      })
      .filter(t => t.filteredEvents.length > 0 || (selectedSport === 'ALL' && ((t.events || []).length > 0 || Boolean(t.name))));
  }, [openTournamentsDash, tournamentsPage, selectedSport]);

  const totalOpenEventsCount = useMemo(() =>
    openTournamentsWithFilteredEvents.reduce((acc, t) => acc + (t.filteredEvents?.length || t.events?.length || 0), 0),
  [openTournamentsWithFilteredEvents]);

  const communityLabel = (user as any)?.community?.name || (user as any)?.communityName || 'Mana Community';

  // ── Render Helpers ────────────────────────────────────────────

  const renderLiveHero = () => {
    if (!activeLiveMatch) {
      if (scheduledMatches.length > 0) {
        const next = scheduledMatches[0];
        const scoreInfo = formatMatchScore(next);
        return (
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/sports/match/${next.id}`)} style={{ padding: 18, gap: 10 }}>
            <View style={s.heroHeader}>
              <View style={[s.heroLiveTag, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                <Ionicons name="time-outline" size={10} color="#FDE047" />
                <Text style={[s.heroLiveText, { color: '#FDE047' }]}>
                  NEXT UP · {(next.sport || 'MATCH').toUpperCase()}
                </Text>
              </View>
              <View style={s.heroPeriodBadge}>
                <Text style={s.heroPeriodText}>
                  {next.scheduledAt ? safeFormat(next.scheduledAt, 'hh:mm a', 'Scheduled') : 'Scheduled'}
                </Text>
              </View>
            </View>
            <View style={s.heroMatchRow}>
              <View style={s.heroTeamCol}>
                <View style={s.heroAvatar}><Text style={s.heroAvatarText}>{next.homeTeamName?.[0] || 'H'}</Text></View>
                <Text style={s.heroTeamName} numberOfLines={1}>{next.homeTeamName || 'Home'}</Text>
              </View>
              <View style={s.heroScoreCol}>
                <Text style={[s.heroScoreBig, { fontSize: 22, letterSpacing: 1 }]}>VS</Text>
                <Text style={s.heroLeadStatus}>{typeof next.venue === 'string' ? next.venue : (next.venue as any)?.name || 'Community Arena'}</Text>
                {next.round && <Text style={[s.heroLeadStatus, { marginTop: 2, fontWeight: '800' }]}>{next.round}</Text>}
              </View>
              <View style={s.heroTeamCol}>
                <View style={s.heroAvatar}><Text style={s.heroAvatarText}>{next.awayTeamName?.[0] || 'A'}</Text></View>
                <Text style={s.heroTeamName} numberOfLines={1}>{next.awayTeamName || 'Away'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }
      return (
        <View style={{ paddingVertical: 18, alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 28 }}>🏟️</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>No Live Matches</Text>
          <Text style={{ fontSize: 11, color: '#C7D2FE', textAlign: 'center', maxWidth: 260 }}>
            Check upcoming fixtures and community tournaments below.
          </Text>
          <TouchableOpacity onPress={() => router.push('/sports/matches')} style={s.heroCta}>
            <Text style={s.heroCtaText}>View Match Schedule →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const scoreInfo = formatMatchScore(activeLiveMatch);
    return (
      <>
        <View style={s.heroHeader}>
          <View style={s.heroLiveTag}>
            <View style={s.livePulseDot} />
            <Text style={s.heroLiveText}>
              LIVE · {(activeLiveMatch.sport || 'MATCH').toUpperCase()}
            </Text>
          </View>
          <View style={s.heroPeriodBadge}>
            <Text style={s.heroPeriodText}>{scoreInfo.detail || 'LIVE'}</Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(`/sports/match/${activeLiveMatch.id}`)}
          style={s.heroMatchRow}
        >
          <View style={s.heroTeamCol}>
            <View style={s.heroAvatar}><Text style={s.heroAvatarText}>{activeLiveMatch.homeTeamName?.[0] || 'H'}</Text></View>
            <Text style={s.heroTeamName} numberOfLines={1}>{activeLiveMatch.homeTeamName || 'Home'}</Text>
          </View>
          <View style={s.heroScoreCol}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.heroScoreBig, scoreFlash === activeLiveMatch.id && s.heroScoreFlash]}>
                {activeLiveMatch.homeScoreDisplay || activeLiveMatch.awayScoreDisplay
                  ? `${scoreInfo.home} : ${scoreInfo.away}`
                  : (
                    <>
                      {activeLiveMatch.homeScore ?? 0}
                      <Text style={s.heroScoreColon}> : </Text>
                      {activeLiveMatch.awayScore ?? 0}
                    </>
                  )}
              </Text>
              {/* Sport-specific score detail below the main score */}
              {(activeLiveMatch.sport?.toUpperCase() === 'CRICKET') && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                  {activeLiveMatch.homeOvers && (
                    <Text style={s.heroScoreDetail}>
                      {activeLiveMatch.homeWickets != null ? `${activeLiveMatch.homeWickets}w` : ''} ({activeLiveMatch.homeOvers} ov)
                    </Text>
                  )}
                  {activeLiveMatch.awayOvers && (
                    <Text style={s.heroScoreDetail}>
                      {activeLiveMatch.awayWickets != null ? `${activeLiveMatch.awayWickets}w` : ''} ({activeLiveMatch.awayOvers} ov)
                    </Text>
                  )}
                </View>
              )}
              {(['BADMINTON', 'TABLE_TENNIS', 'TENNIS'].includes(activeLiveMatch.sport?.toUpperCase() || '')) &&
                activeLiveMatch.homeSetsWon != null && (
                <Text style={s.heroScoreDetail}>
                  Sets: {activeLiveMatch.homeSetsWon}–{activeLiveMatch.awaySetsWon}
                </Text>
              )}
              {activeLiveMatch.elapsedMinutes != null && (
                <Text style={s.heroScoreDetail}>{activeLiveMatch.elapsedMinutes}'</Text>
              )}
            </View>
            <Text style={s.heroLeadStatus}>
              {activeLiveMatch.homeScore > activeLiveMatch.awayScore
                ? `${activeLiveMatch.homeTeamName} leading`
                : activeLiveMatch.awayScore > activeLiveMatch.homeScore
                ? `${activeLiveMatch.awayTeamName} leading`
                : 'Scores level'}
            </Text>
          </View>
          <View style={s.heroTeamCol}>
            <View style={s.heroAvatar}><Text style={s.heroAvatarText}>{activeLiveMatch.awayTeamName?.[0] || 'A'}</Text></View>
            <Text style={s.heroTeamName} numberOfLines={1}>{activeLiveMatch.awayTeamName || 'Away'}</Text>
          </View>
        </TouchableOpacity>
        {activeLiveMatch.venue && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="location-outline" size={10} color="#A5B4FC" />
            <Text style={{ fontSize: 10, color: '#A5B4FC' }}>{typeof activeLiveMatch.venue === 'string' ? activeLiveMatch.venue : ''}</Text>
          </View>
        )}
        {filteredLive.length > 1 && (
          <View style={s.heroDotsRow}>
            {filteredLive.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setLiveIndex(i)} style={[s.heroDot, i === liveIndex ? s.heroDotActive : s.heroDotInactive]} />
            ))}
          </View>
        )}
        {isSportsAdmin && (
          <TouchableOpacity
            onPress={() => router.push(`/sports/match/${activeLiveMatch.id}` as any)}
            style={s.heroScoreBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={11} color="#1E1B4B" />
            <Text style={s.heroScoreBtnText}>Score Match</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <LinearGradient colors={['#1E1B4B', '#3730A3', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerMid}>
            <Text style={s.headerTitle}>🏟️  Sports Hub</Text>
            <Text style={s.headerSub} numberOfLines={1}>{communityLabel} Sports Arena</Text>
          </View>
          <View style={s.headerRight}>
            {isSportsAdmin && (
              <TouchableOpacity style={s.adminPill} onPress={() => router.push('/sports-admin' as any)} activeOpacity={0.8}>
                <Ionicons name="shield-checkmark" size={12} color="#FBBF24" />
                <Text style={s.adminPillText}>Admin</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.registerBtn} onPress={() => { setSelectedRegisterEventId(null); setShowRegisterModal(true); }} activeOpacity={0.85}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={s.registerBtnText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollBody}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Live / Next Match Hero ── */}
        <View style={s.heroContainer}>
          <LinearGradient colors={['#1E1B4B', '#3730A3', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
            {renderLiveHero()}
          </LinearGradient>
        </View>

        {/* ── My Player Profile Card ── */}
        {playerProfile && (
          <TouchableOpacity
            style={s.profileCard}
            onPress={() => router.push(`/sports/player/${playerProfile.userId ?? user?.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={s.profileTopRow}>
              <View style={s.profileAvatarWrap}>
                {playerProfile.avatarUrl ? (
                  <Image source={{ uri: resolveImageUrl(playerProfile.avatarUrl) }} style={s.profileAvatarImg} />
                ) : (
                  <LinearGradient colors={['#4F46E5', '#6366F1']} style={s.profileAvatarFallback}>
                    <Text style={s.profileAvatarLetter}>
                      {(playerProfile.name || playerProfile.fullName || 'P')[0]?.toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
                {(playerProfile.communityRating || playerProfile.rating) ? (
                  <View style={s.profileRatingBadge}>
                    <Ionicons name="star" size={8} color="#F59E0B" />
                    <Text style={s.profileRatingText}>
                      {(playerProfile.communityRating || playerProfile.rating || 0).toFixed(1)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={s.profileInfo}>
                <Text style={s.profileName} numberOfLines={1}>
                  {playerProfile.name || playerProfile.fullName || 'Player'}
                </Text>
                <Text style={s.profileFlat}>
                  {playerProfile.flatNo || playerProfile.flatNumber || communityLabel}
                </Text>
                {playerProfile.badges?.length > 0 && (
                  <View style={s.profileBadgeRow}>
                    {playerProfile.badges.slice(0, 3).map((b, i) => (
                      <View key={b.id || i} style={[s.profileBadgePill, {
                        backgroundColor: b.tier === 'legendary' ? '#FEF3C7' : b.tier === 'epic' ? '#F5F3FF' : b.tier === 'rare' ? '#EFF6FF' : '#F1F5F9',
                      }]}>
                        <Text style={{ fontSize: 10 }}>{b.emoji || b.icon || '🏅'}</Text>
                        <Text style={[s.profileBadgeText, {
                          color: b.tier === 'legendary' ? '#92400E' : b.tier === 'epic' ? '#6D28D9' : b.tier === 'rare' ? '#1D4ED8' : COLORS.textSecondary,
                        }]}>{b.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>

            {/* Stats Row */}
            <View style={s.profileStatsRow}>
              <View style={s.profileStatItem}>
                <Text style={s.profileStatValue}>{profileStats.totalMatches}</Text>
                <Text style={s.profileStatLabel}>Matches</Text>
              </View>
              <View style={s.profileStatDivider} />
              <View style={s.profileStatItem}>
                <Text style={s.profileStatValue}>{profileStats.totalWins}</Text>
                <Text style={s.profileStatLabel}>Wins</Text>
              </View>
              <View style={s.profileStatDivider} />
              <View style={s.profileStatItem}>
                <Text style={s.profileStatValue}>{profileStats.totalTrophies}</Text>
                <Text style={s.profileStatLabel}>Trophies</Text>
              </View>
              <View style={s.profileStatDivider} />
              <View style={s.profileStatItem}>
                <Text style={s.profileStatValue}>{profileStats.sportCount}</Text>
                <Text style={s.profileStatLabel}>Sports</Text>
              </View>
            </View>

            {/* Per-sport mini stats */}
            {profileStats.stats.length > 0 && (
              <View style={s.profileSportStatsRow}>
                {profileStats.stats.slice(0, 4).map((ss, i) => {
                  const e = SPORT_EMOJI[ss.sport?.toUpperCase()] || '🏅';
                  const matches = ss.matchesPlayed || ss.matches || 0;
                  const winRate = ss.wins != null && matches > 0
                    ? Math.round((ss.wins / matches) * 100)
                    : (typeof ss.winRate === 'number' ? Math.round(ss.winRate) : null);
                  return (
                    <View key={i} style={s.profileSportPill}>
                      <Text style={{ fontSize: 12 }}>{e}</Text>
                      <View>
                        <Text style={s.profileSportPillName}>{ss.sport}</Text>
                        <Text style={s.profileSportPillStat}>
                          {matches}M{ss.wins != null ? ` · ${ss.wins}W` : ''}{winRate != null ? ` · ${winRate}%` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── KPI Strip ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.kpiScroll}>
          {[
            { label: 'Tournaments', value: String(dashStats?.openRegistrations || openTournamentsWithFilteredEvents.length), sub: 'Open for entry', icon: 'trophy', color: COLORS.success, bg: '#ECFDF5', route: '/sports/tournaments' },
            { label: 'Live Now', value: String(Math.max(dashStats?.liveEvents ?? 0, filteredLive.length)), sub: 'Games ongoing', icon: 'flash', color: COLORS.error, bg: '#FEF2F2', route: '/sports/matches' },
            { label: 'Upcoming', value: String(scheduledMatches.length || dashStats?.upcomingTournaments || 0), sub: 'Scheduled', icon: 'calendar', color: COLORS.warning, bg: '#FFFBEB', route: '/sports/matches' },
            { label: 'Courts', value: String(sportsFacilities.length), sub: 'Bookable', icon: 'football', color: COLORS.primary, bg: '#EEF2FF', route: '/sports/facility/my-bookings' },
          ].map(k => (
            <TouchableOpacity key={k.label} style={s.kpiCard} onPress={() => router.push(k.route as any)} activeOpacity={0.82}>
              <View style={[s.kpiIcon, { backgroundColor: k.bg }]}>
                <Ionicons name={k.icon as any} size={15} color={k.color} />
              </View>
              <Text style={s.kpiValue}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={[s.kpiSub, { color: k.color }]}>{k.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Quick Hub Actions ── */}
        <View style={s.quickGrid}>
          {[
            { label: 'Book Court', emoji: '🏸', route: '/sports/facility/my-bookings', bg: '#EEF2FF' },
            { label: 'Tournaments', emoji: '🏆', route: '/sports/tournaments', bg: '#EEF2FF' },
            { label: 'Schedule', emoji: '⚔️', route: '/sports/matches', bg: '#EFF6FF' },
            { label: 'Standings', emoji: '📊', route: '/sports/leaderboard', bg: '#CFFAFE' },
            { label: 'Rankings', emoji: '🎖️', route: '/sports/rankings', bg: '#FFFBEB' },
            { label: 'My Squads', emoji: '👥', route: '/sports/my-teams', bg: '#F5F3FF' },
            { label: 'Auctions', emoji: '🏷️', route: '/sports/auction', bg: '#F5F3FF' },
            { label: 'Trainers', emoji: '🎽', route: '/sports/trainers', bg: '#ECFDF5' },
          ].map(item => (
            <TouchableOpacity key={item.label} style={s.quickTile} onPress={() => router.push(item.route as any)} activeOpacity={0.75}>
              <View style={[s.quickIcon, { backgroundColor: item.bg }]}>
                <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
              </View>
              <Text style={s.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Sport Filter Chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {SPORT_FILTERS.map(sp => {
            const active = selectedSport === sp.id;
            return (
              <TouchableOpacity key={sp.id} onPress={() => setSelectedSport(sp.id)} activeOpacity={0.8}
                style={[s.filterChip, active && s.filterChipActive]}>
                <Text style={s.filterEmoji}>{sp.emoji}</Text>
                <Text style={[s.filterText, active && s.filterTextActive]}>{sp.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Open Tournaments & Registration ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="trophy" size={16} color="#F59E0B" />
              <Text style={s.cardHeading}>Open Tournaments & Events</Text>
              {totalOpenEventsCount > 0 && (
                <View style={s.countBadge}><Text style={s.countBadgeText}>{totalOpenEventsCount}</Text></View>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/tournaments' as any)} style={s.row}>
              <Text style={s.linkText}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={s.sectionSubtext}>Register for open sports categories — solo or with your squad.</Text>

          {openTournamentsWithFilteredEvents.length === 0 ? (
            <View style={s.emptyBlock}>
              <View style={s.emptyIconWrap}><Ionicons name="trophy-outline" size={28} color={COLORS.primary} /></View>
              <Text style={s.emptyTitle}>
                {selectedSport === 'ALL' ? 'No Open Tournaments Right Now' : `No ${SPORT_FILTERS.find(f => f.id === selectedSport)?.label || selectedSport} Events`}
              </Text>
              <Text style={s.emptySub}>Check back soon or register your squad for upcoming announcements.</Text>
              <View style={s.emptyBtnRow}>
                <TouchableOpacity style={s.emptyPrimaryBtn} onPress={() => router.push('/sports/tournaments')} activeOpacity={0.85}>
                  <Ionicons name="list" size={13} color="#fff" />
                  <Text style={s.emptyPrimaryBtnText}>All Tournaments</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.emptySecondaryBtn} onPress={() => { setSelectedRegisterEventId(null); setShowRegisterModal(true); }} activeOpacity={0.85}>
                  <Ionicons name="add" size={13} color={COLORS.primary} />
                  <Text style={s.emptySecondaryBtnText}>Register Squad</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ gap: 12, marginTop: 4 }}>
              {openTournamentsWithFilteredEvents.map(t => {
                const dateRangeStr = formatTournamentDateRange(t.eventDateStart, t.eventDateEnd);
                const countdown = getCountdown(t.eventDateStart);
                const displayEvents = (t as any).filteredEvents?.length > 0 ? (t as any).filteredEvents : t.events || [];

                return (
                  <View key={t.id} style={s.tournWrap}>
                    <LinearGradient colors={['#1E1B4B', '#3730A3', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.tournHeader}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={s.tournTopRow}>
                          <View style={s.openBadge}>
                            <View style={s.openDot} />
                            <Text style={s.openBadgeText}>
                              {String(t.registrationStatus || 'REGISTRATION_OPEN').toUpperCase().replace(/_/g, ' ')}
                            </Text>
                          </View>
                          {countdown && (
                            <View style={s.countdownBadge}>
                              <Ionicons name="timer-outline" size={9} color="#FDE68A" />
                              <Text style={s.countdownText}>{countdown}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={s.tournTitle} numberOfLines={2}>{t.name}</Text>
                        <View style={s.tournMetaRow}>
                          <Ionicons name="calendar-outline" size={11} color="#C7D2FE" />
                          <Text style={s.tournMetaText}>{dateRangeStr}</Text>
                          <Text style={s.tournMetaText}>·</Text>
                          <Text style={s.tournMetaText}>{displayEvents.length} {displayEvents.length === 1 ? 'Category' : 'Categories'}</Text>
                          {t.communityName && (
                            <>
                              <Text style={s.tournMetaText}>·</Text>
                              <Ionicons name="location-outline" size={10} color="#C7D2FE" />
                              <Text style={s.tournMetaText} numberOfLines={1}>{t.communityName}</Text>
                            </>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity style={s.tournDetailsBtn} onPress={() => router.push(`/sports/tournament/${t.id}`)} activeOpacity={0.8}>
                        <Text style={s.tournDetailsBtnText}>Details</Text>
                        <Ionicons name="arrow-forward" size={11} color="#fff" />
                      </TouchableOpacity>
                    </LinearGradient>

                    {displayEvents.length > 0 && <View style={s.eventsListWrap}>
                      {displayEvents.map((ev: DashboardEventCardDto) => {
                        const sportUp = (ev.sportName || '').toUpperCase().replace(/\s+/g, '_');
                        const sportEmoji = SPORT_EMOJI[sportUp] || '🏅';
                        const isRegistered = ev.myRegistrationId != null || allRegistrations.some(r => String(r.id) === String(ev.id) || r.tournamentName === ev.name);
                        const max = ev.maxParticipants ?? 0;
                        const registered = ev.registeredCount ?? 0;
                        const fillRatio = max > 0 ? Math.min(registered / max, 1) : 0;
                        const spotsLeft = max > 0 ? Math.max(max - registered, 0) : null;
                        const isFilling = fillRatio >= 0.75 && fillRatio < 1;
                        const isFull = fillRatio >= 1 && max > 0;
                        const catUp = (ev.categoryName ?? ev.name ?? '').toUpperCase();
                        const teamLabel = ev.teamSport ? 'Team' : catUp.includes('DOUBLES') ? 'Doubles' : 'Singles';
                        const eventDate = safeFormat(ev.eventDateStart, 'dd MMM', '');

                        return (
                          <View key={ev.id} style={s.eventCard}>
                            <View style={s.eventTopRow}>
                              <View style={s.eventSportPill}>
                                <Text style={{ fontSize: 13 }}>{sportEmoji}</Text>
                                <Text style={s.eventSportPillText}>{ev.sportName || 'Sport'}</Text>
                              </View>
                              <View style={s.eventFormatPill}><Text style={s.eventFormatText}>{teamLabel}</Text></View>
                              {eventDate ? (
                                <View style={s.eventDatePill}>
                                  <Ionicons name="calendar-outline" size={9} color={COLORS.primary} />
                                  <Text style={s.eventDatePillText}>{eventDate}</Text>
                                </View>
                              ) : null}
                              {isFilling && !isFull && (
                                <View style={s.fillingPill}><Text style={s.fillingText}>⚡ {spotsLeft} spots left</Text></View>
                              )}
                            </View>

                            <Text style={s.eventName} numberOfLines={2}>{ev.categoryName || ev.name}</Text>

                            <View style={s.eventMetaRow}>
                              <View style={s.eventMetaItem}>
                                <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                                <Text style={s.eventMetaText} numberOfLines={1}>{ev.venueName || 'Clubhouse Arena'}</Text>
                              </View>
                              {max > 0 && (
                                <View style={s.eventCapWrap}>
                                  <Text style={s.eventCapText}>{registered}/{max}</Text>
                                  <View style={s.capBarBg}>
                                    <View style={[s.capBarFill, {
                                      width: `${Math.round(fillRatio * 100)}%` as any,
                                      backgroundColor: isFull ? '#EF4444' : isFilling ? '#F59E0B' : COLORS.primary,
                                    }]} />
                                  </View>
                                </View>
                              )}
                            </View>

                            <View style={s.eventActionRow}>
                              {ev.auctionStatus === 'ACTIVE' && (
                                <TouchableOpacity
                                  style={s.auctionBadge}
                                  onPress={() => router.push(`/sports/auction/${ev.id}` as any)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={{ fontSize: 10 }}>🏷️</Text>
                                  <Text style={s.auctionBadgeText}>Live Auction</Text>
                                </TouchableOpacity>
                              )}
                              {isRegistered ? (
                                <View style={s.registeredBadge}>
                                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                  <Text style={s.registeredText}>Registered</Text>
                                </View>
                              ) : isFull ? (
                                <View style={s.fullBadge}><Text style={s.fullText}>Category Full</Text></View>
                              ) : (
                                <TouchableOpacity style={s.registerNowBtn} onPress={() => { setSelectedRegisterEventId(ev.id); setShowRegisterModal(true); }} activeOpacity={0.85}>
                                  <Ionicons name="flash" size={12} color="#fff" />
                                  <Text style={s.registerNowText}>Register Now</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── My Registrations (Horizontal Scroll + Dedicated Page) ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="clipboard" size={15} color={COLORS.primary} />
              <Text style={s.cardHeading}>My Registrations</Text>
              {allRegistrations.length > 0 && (
                <View style={[s.countBadge, { backgroundColor: '#ECFDF5' }]}><Text style={[s.countBadgeText, { color: '#065F46' }]}>{allRegistrations.length}</Text></View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {allRegistrations.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/sports/registrations' as any)} style={s.row}>
                  <Text style={s.linkText}>View All</Text>
                  <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setSelectedRegisterEventId(null); setShowRegisterModal(true); }}>
                <Text style={s.linkText}>+ New</Text>
              </TouchableOpacity>
            </View>
          </View>
          {allRegistrations.length === 0 ? (
            <View style={s.emptyMini}>
              <Ionicons name="clipboard-outline" size={22} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Registrations Yet</Text>
              <Text style={s.emptySub}>Register for tournaments to track your participation.</Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 4 }}
              >
                {allRegistrations.map(r => {
                  const isConfirmed = r.status === 'Confirmed';
                  const emoji = SPORT_EMOJI[r.sport.toUpperCase().replace(/\s+/g, '_')] || '🏅';
                  const reg = r as any;
                  const cardWidth = allRegistrations.length > 1 ? Math.min(284, SCREEN_W - 76) : Math.max(260, SCREEN_W - 58);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[s.regCard, { width: cardWidth }]}
                      onPress={() => router.push('/sports/registrations' as any)}
                      activeOpacity={0.82}
                    >
                      <View style={s.regTopRow}>
                        <View style={s.regEmojiWrap}><Text style={{ fontSize: 20 }}>{emoji}</Text></View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.regTeamName} numberOfLines={1}>{r.tournamentName || r.team}</Text>
                          <View style={s.regMetaRow}>
                            <Text style={s.regMetaText}>{r.sport}</Text>
                            {reg.categoryName && <><Text style={s.regMetaDot}>·</Text><Text style={s.regMetaText} numberOfLines={1}>{reg.categoryName}</Text></>}
                            {reg.matchType && <><Text style={s.regMetaDot}>·</Text><Text style={s.regMetaText}>{reg.matchType}</Text></>}
                          </View>
                        </View>
                        <View style={[s.statusBadge, isConfirmed ? s.statusConfirmed : s.statusPending]}>
                          <Ionicons name={isConfirmed ? 'checkmark-circle' : 'time-outline'} size={10} color={isConfirmed ? '#065F46' : '#92400E'} />
                          <Text style={[s.statusText, { color: isConfirmed ? '#065F46' : '#92400E' }]}>{r.status}</Text>
                        </View>
                      </View>
                      {/* Detail row */}
                      <View style={s.regDetailRow}>
                        {reg.playerName && (
                          <View style={s.regDetailItem}>
                            <Ionicons name="person-outline" size={10} color={COLORS.textMuted} />
                            <Text style={s.regDetailText} numberOfLines={1}>
                              {reg.playerName}{reg.relation && reg.relation.toUpperCase() !== 'SELF' ? ` (${reg.relation})` : ''}
                            </Text>
                          </View>
                        )}
                        {reg.partnerName && (
                          <View style={s.regDetailItem}>
                            <Ionicons name="people-outline" size={10} color={COLORS.primary} />
                            <Text style={[s.regDetailText, { color: COLORS.primary }]} numberOfLines={1}>
                              w/ {reg.partnerName}
                            </Text>
                          </View>
                        )}
                        {reg.eventDate && (
                          <View style={s.regDetailItem}>
                            <Ionicons name="calendar-outline" size={10} color={COLORS.textMuted} />
                            <Text style={s.regDetailText}>
                              {safeFormat(reg.eventDate, 'dd MMM', 'TBD')}{reg.startTime ? ` · ${reg.startTime}` : ''}
                            </Text>
                          </View>
                        )}
                        {r.venueName && (
                          <View style={s.regDetailItem}>
                            <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
                            <Text style={s.regDetailText} numberOfLines={1}>{r.venueName}</Text>
                          </View>
                        )}
                        {reg.captainNomination && (
                          <View style={[s.regDetailItem, { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 4 }]}>
                            <Text style={{ fontSize: 9 }}>👑</Text>
                            <Text style={[s.regDetailText, { color: '#92400E', fontWeight: '700' }]}>Captain</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {allRegistrations.length > 1 && (
                <TouchableOpacity
                  onPress={() => router.push('/sports/registrations' as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 10.5, color: COLORS.textMuted }}>Swipe horizontally or view all entries</Text>
                  <Text style={s.linkText}>Open Full List ({allRegistrations.length}) →</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* ── Upcoming Fixtures (Enhanced with sport-specific data) ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="calendar" size={14} color={COLORS.primary} />
              <Text style={s.cardHeading}>Upcoming Fixtures</Text>
              {scheduledMatches.length > 0 && (
                <View style={[s.countBadge, { backgroundColor: '#FFFBEB' }]}><Text style={[s.countBadgeText, { color: '#92400E' }]}>{scheduledMatches.length}</Text></View>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/matches')} style={s.row}>
              <Text style={s.linkText}>Schedule</Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {scheduledMatches.length === 0 ? (
            <View style={s.emptyMini}>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center' }}>
                No upcoming matches for {selectedSport === 'ALL' ? 'today' : SPORT_FILTERS.find(f => f.id === selectedSport)?.label || selectedSport}.
              </Text>
              <TouchableOpacity onPress={() => router.push('/sports/matches')} style={{ marginTop: 4 }}>
                <Text style={s.linkText}>Browse all matches →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            scheduledMatches.map((m, idx) => {
              const sportEmoji = SPORT_EMOJI[m.sport?.toUpperCase()] || '🏅';
              const timeStr = m.scheduledAt ? safeFormat(m.scheduledAt, 'hh:mm a', 'Scheduled') : 'Scheduled';
              const dateStr = m.scheduledAt ? safeFormat(m.scheduledAt, 'dd MMM', '') : '';
              const venue = typeof m.venue === 'string' ? m.venue : (m.venue as any)?.name || '';
              return (
                <TouchableOpacity key={m.id || idx} style={[s.fixtureRow, idx > 0 && s.fixtureBorder]}
                  onPress={() => router.push(`/sports/match/${m.id}`)} activeOpacity={0.8}>
                  <View style={s.fixtureLeft}>
                    <View style={s.fixtureEmojiWrap}><Text style={{ fontSize: 18 }}>{sportEmoji}</Text></View>
                    <View style={s.fixtureTimeCol}>
                      <Text style={s.fixtureTime}>{timeStr}</Text>
                      {dateStr ? <Text style={s.fixtureDate}>{dateStr}</Text> : null}
                    </View>
                  </View>
                  <View style={s.fixtureCenter}>
                    <Text style={s.fixtureTitle} numberOfLines={1}>
                      {m.homeTeamName} <Text style={{ color: COLORS.textMuted, fontWeight: '400' }}>vs</Text> {m.awayTeamName}
                    </Text>
                    <View style={s.fixtureMetaRow}>
                      {venue ? (
                        <>
                          <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
                          <Text style={s.fixtureMeta} numberOfLines={1}>{venue}</Text>
                        </>
                      ) : null}
                      {m.round ? (
                        <>
                          {venue && <Text style={s.fixtureDot}>·</Text>}
                          <Text style={s.fixtureMeta}>{m.round}</Text>
                        </>
                      ) : null}
                      {m.tournamentName ? (
                        <>
                          <Text style={s.fixtureDot}>·</Text>
                          <Text style={s.fixtureMeta} numberOfLines={1}>{m.tournamentName}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── Recent Results (Enhanced with sport-specific scores) ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="ribbon" size={14} color="#10B981" />
              <Text style={s.cardHeading}>Recent Results</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/matches')}>
              <Text style={s.linkText}>All Results</Text>
            </TouchableOpacity>
          </View>
          {recentCompleted.length === 0 ? (
            <View style={s.emptyMini}>
              <Ionicons name="trophy-outline" size={22} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Completed Matches</Text>
              <Text style={s.emptySub}>Results will appear here as matches wrap up.</Text>
            </View>
          ) : (
            <View style={s.resultsList}>
              {recentCompleted.map((res: any) => {
                const sportEmoji = SPORT_EMOJI[res.sport?.toUpperCase()] || '🏅';
                const score = formatMatchScore(res);
                const winner = res.winnerTeamName;
                const completedTime = res.endedAt || res.completedAt;
                return (
                  <TouchableOpacity key={res.id} style={s.resultCard}
                    onPress={() => router.push(`/sports/match/${res.id}`)} activeOpacity={0.8}>
                    <View style={s.resultTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12 }}>{sportEmoji}</Text>
                        <Text style={s.resultSportLabel}>{(res.sport || 'SPORT').toUpperCase()}</Text>
                      </View>
                      <Text style={s.resultTime}>
                        {completedTime ? safeFormat(completedTime, 'hh:mm a', 'Final') : 'Final'}
                      </Text>
                    </View>

                    <View style={s.resultMatchRow}>
                      <View style={s.resultTeamCol}>
                        <Text style={[s.resultTeamName, winner === res.homeTeamName && s.resultWinner]} numberOfLines={1}>
                          {res.homeTeamName}
                        </Text>
                        {winner === res.homeTeamName && <Text style={{ fontSize: 9 }}>🏆</Text>}
                      </View>
                      <View style={s.resultScoreCenter}>
                        <View style={s.resultScorePill}>
                          <Text style={s.resultScoreText}>{score.home}</Text>
                          <Text style={s.resultScoreDash}>–</Text>
                          <Text style={s.resultScoreText}>{score.away}</Text>
                        </View>
                        {score.detail && <Text style={s.resultDetail}>{score.detail}</Text>}
                      </View>
                      <View style={[s.resultTeamCol, { alignItems: 'flex-end' }]}>
                        {winner === res.awayTeamName && <Text style={{ fontSize: 9 }}>🏆</Text>}
                        <Text style={[s.resultTeamName, winner === res.awayTeamName && s.resultWinner]} numberOfLines={1}>
                          {res.awayTeamName}
                        </Text>
                      </View>
                    </View>

                    {res.venue && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                        <Ionicons name="location-outline" size={9} color={COLORS.textMuted} />
                        <Text style={{ fontSize: 9, color: COLORS.textMuted }}>{typeof res.venue === 'string' ? res.venue : ''}</Text>
                        {res.round && <><Text style={{ fontSize: 9, color: COLORS.textMuted }}> · </Text><Text style={{ fontSize: 9, color: COLORS.textMuted }}>{res.round}</Text></>}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Court Availability & Venues ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="flash" size={13} color={COLORS.primary} />
              <Text style={s.cardHeading}>Courts & Venues</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/facility/my-bookings' as any)}>
              <Text style={s.linkText}>My Bookings →</Text>
            </TouchableOpacity>
          </View>

          {loadingFacilities ? (
            <ActivityIndicator color={COLORS.primary} size="small" style={{ marginVertical: 12 }} />
          ) : sportsFacilities.length === 0 ? (
            <TouchableOpacity style={s.emptyFacilityCard} onPress={() => router.push('/sports/facility/my-bookings' as any)}>
              <Text style={{ fontSize: 24 }}>🏟️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.emptyFacTitle}>Explore Community Amenities</Text>
                <Text style={s.emptyFacSub}>Clubhouse courts, pool, and turf slots</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
              {sportsFacilities.map(court => {
                const sportEmoji = SPORT_EMOJI[court.type?.toUpperCase()] || '🏟️';
                return (
                  <TouchableOpacity key={court.id} style={s.courtCard}
                    onPress={() => router.push(`/sports/facility/${court.id}` as any)} activeOpacity={0.8}>
                    <View style={s.rowBetween}>
                      <Text style={{ fontSize: 20 }}>{sportEmoji}</Text>
                      <View style={s.courtAvailBadge}><Text style={s.courtAvailText}>Available</Text></View>
                    </View>
                    <Text style={s.courtName} numberOfLines={1}>{court.name}</Text>
                    <Text style={s.courtTime} numberOfLines={1}>
                      {court.openTime && court.closeTime ? `${court.openTime} – ${court.closeTime}` : 'Open Daily'}
                    </Text>
                    {court.hourlyRate > 0 ? (
                      <Text style={s.courtPrice}>₹{court.hourlyRate}/hr</Text>
                    ) : (
                      <Text style={s.courtFree}>Free for Residents</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Sports Insurance ── */}
        <TouchableOpacity style={s.insuranceBanner} onPress={() => router.push('/insurance' as any)} activeOpacity={0.85}>
          <View style={s.insuranceIcon}><Text style={{ fontSize: 22 }}>🛡️</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.insuranceTitle}>Sports Injury Insurance</Text>
            <Text style={s.insuranceSub}>Protect yourself during matches & tournaments →</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#b45309" />
        </TouchableOpacity>

        {/* ── Community Rides ── */}
        {communityRides.length > 0 && (
          <View style={s.card}>
            <View style={s.sectionHeader}>
              <View style={s.row}>
                <Text style={{ fontSize: 14 }}>🚗</Text>
                <Text style={s.cardHeading}>Get to the Game</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/commute' as any)}>
                <Text style={s.linkText}>All rides →</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.rideSub}>Community rides to upcoming venues</Text>
            {communityRides.map((ride: any) => (
              <TouchableOpacity key={ride.id} style={s.rideRow} onPress={() => router.push(`/commute/ride/${ride.id}` as any)} activeOpacity={0.8}>
                <View style={s.rideAvatar}><Text style={s.rideAvatarText}>{(ride.driverName || 'D')[0]?.toUpperCase()}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.rideDriver} numberOfLines={1}>{ride.driverName || 'Community Member'}</Text>
                  <Text style={s.rideRoute} numberOfLines={1}>{ride.fromLocation} → {ride.toLocation}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.rideSeats}>{ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''}</Text>
                  {ride.free ? <Text style={s.rideFree}>Free</Text> : <Text style={s.ridePrice}>₹{ride.pricePerSeat}</Text>}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.offerRideBtn} onPress={() => router.push('/commute/offer-ride' as any)} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={15} color="#1d4ed8" />
              <Text style={s.offerRideBtnText}>Offer a Ride to Teammates</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Top Performers (Enhanced Leaderboard) ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="podium" size={14} color="#F59E0B" />
              <Text style={s.cardHeading}>Top Performers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/leaderboard')}>
              <Text style={s.linkText}>Full Board →</Text>
            </TouchableOpacity>
          </View>
          {leaderboard.length === 0 ? (
            <View style={s.emptyMini}>
              <Ionicons name="ribbon-outline" size={22} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Rankings Yet</Text>
              <Text style={s.emptySub}>Play tournament matches to earn points.</Text>
            </View>
          ) : (
            <View style={s.leaderList}>
              {leaderboard.slice(0, 5).map((pl, idx) => {
                const name = pl.playerName || pl.name || 'Athlete';
                const isTop3 = idx < 3;
                const score = pl.score ?? (pl as any).value ?? 0;
                const played = pl.matchesPlayed ?? 0;
                const isCurrent = pl.isCurrentUser;
                return (
                  <TouchableOpacity
                    key={pl.userId || idx}
                    style={[s.leaderRow, isCurrent && s.leaderRowCurrent]}
                    onPress={() => router.push(`/sports/player/${pl.userId}` as any)}
                    activeOpacity={0.8}
                  >
                    <View style={s.leaderRankWrap}>
                      {isTop3 ? (
                        <Text style={{ fontSize: 16 }}>{MEDAL_ICONS[idx]}</Text>
                      ) : (
                        <Text style={s.leaderRank}>{idx + 1}</Text>
                      )}
                    </View>
                    <View style={[s.leaderAvatar, isTop3 && { borderWidth: 2, borderColor: MEDAL_COLORS[idx] }]}>
                      {pl.avatarUrl ? (
                        <Image source={{ uri: resolveImageUrl(pl.avatarUrl) }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                      ) : (
                        <Text style={s.leaderAvatarText}>{name[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={s.leaderName} numberOfLines={1}>{name}</Text>
                        {isCurrent && <View style={s.youBadge}><Text style={s.youBadgeText}>YOU</Text></View>}
                        {pl.topBadge && <Text style={{ fontSize: 10 }}>{pl.topBadge}</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <Text style={s.leaderSub}>{pl.flatNumber || pl.flatNo || 'Resident'}</Text>
                        {played > 0 && <Text style={s.leaderSub}>· {played} matches</Text>}
                        {pl.strikeRate != null && <Text style={s.leaderSub}>· SR {pl.strikeRate.toFixed(1)}</Text>}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.leaderScore}>{pl.displayValue || `${score} pts`}</Text>
                      {pl.teamName && <Text style={s.leaderTeam} numberOfLines={1}>{pl.teamName}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Promo Banner ── */}
        <View style={s.promoBanner}>
          <LinearGradient colors={['#1E1B4B', '#3730A3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.promoGradient}>
            {openTournamentsDash.length > 0 ? (
              <>
                <Ionicons name="trophy" size={24} color="#FBBF24" style={{ marginBottom: 6 }} />
                <Text style={s.promoTitle}>{openTournamentsDash[0].name}</Text>
                <Text style={s.promoSub}>
                  {openTournamentsDash[0].events?.length
                    ? `${openTournamentsDash[0].events.length} sports categories open for entry. Join with your squad or as a solo player.`
                    : 'Registration is open now!'}
                </Text>
                <TouchableOpacity style={s.promoBtn} onPress={() => router.push(`/sports/tournament/${openTournamentsDash[0].id}`)} activeOpacity={0.88}>
                  <Text style={s.promoBtnText}>View Tournament & Register →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="flash" size={24} color="#C7D2FE" style={{ marginBottom: 6 }} />
                <Text style={s.promoTitle}>Community Sports Hub</Text>
                <Text style={s.promoSub}>Book court slots, post open challenges, and join upcoming leagues.</Text>
                <TouchableOpacity style={s.promoBtn} onPress={() => setShowRegisterModal(true)} activeOpacity={0.88}>
                  <Text style={s.promoBtnText}>Register Your Squad</Text>
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>

      <SportsRegisterModal
        visible={showRegisterModal}
        initialEventId={selectedRegisterEventId}
        onClose={() => { setShowRegisterModal(false); setSelectedRegisterEventId(null); }}
        onRegistered={(newReg) => {
          setCustomRegistrations(prev => [newReg, ...prev]);
          refetchRegistrations(); refetchOpenTournaments(); refetchStats();
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  headerSub: { fontSize: 10, color: '#C7D2FE', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(251,191,36,0.22)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)' },
  adminPillText: { fontSize: 10, fontWeight: '800', color: '#FEF08A' },
  registerBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4.5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  registerBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  scrollBody: { paddingHorizontal: 14, paddingTop: 14, gap: 14 },

  // Hero
  heroContainer: { borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.md },
  heroCard: { padding: 18, position: 'relative', overflow: 'hidden' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLiveTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  heroLiveText: { fontSize: 10, fontWeight: '800', color: '#FCA5A5', letterSpacing: 0.6 },
  heroPeriodBadge: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  heroPeriodText: { fontSize: 9.5, fontWeight: '800', color: '#fff' },
  heroMatchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  heroTeamCol: { flex: 1, alignItems: 'center', gap: 6 },
  heroAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroAvatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroTeamName: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },
  heroScoreCol: { alignItems: 'center', paddingHorizontal: 8 },
  heroScoreBig: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroScoreColon: { color: 'rgba(255,255,255,0.45)' },
  heroScoreDetail: { fontSize: 10, fontWeight: '700', color: '#C7D2FE' },
  heroLeadStatus: { fontSize: 10, color: '#C7D2FE', marginTop: 4, fontWeight: '600' },
  heroCta: { marginTop: 6, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.full },
  heroCtaText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  heroDot: { height: 5, borderRadius: 3 },
  heroDotActive: { width: 22, backgroundColor: '#fff' },
  heroDotInactive: { width: 5, backgroundColor: 'rgba(255,255,255,0.35)' },
  heroScoreFlash: { color: '#FDE047' },
  heroScoreBtn: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FDE047', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10,
  },
  heroScoreBtnText: { fontSize: 11, fontWeight: '800', color: '#1E1B4B' } as const,

  // Player Profile Card
  profileCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 12, ...SHADOWS.sm },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatarWrap: { position: 'relative' },
  profileAvatarImg: { width: 48, height: 48, borderRadius: 16 },
  profileAvatarFallback: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileAvatarLetter: { fontSize: 18, fontWeight: '900', color: '#fff' },
  profileRatingBadge: { position: 'absolute', bottom: -4, right: -4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff', paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#FDE68A', ...SHADOWS.sm },
  profileRatingText: { fontSize: 9, fontWeight: '800', color: '#92400E' },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  profileFlat: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  profileBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  profileBadgePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  profileBadgeText: { fontSize: 9, fontWeight: '700' },
  profileStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10 },
  profileStatItem: { flex: 1, alignItems: 'center' },
  profileStatValue: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  profileStatLabel: { fontSize: 9.5, fontWeight: '600', color: COLORS.textMuted, marginTop: 1 },
  profileStatDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0' },
  profileSportStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  profileSportPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#F1F5F9' },
  profileSportPillName: { fontSize: 10, fontWeight: '700', color: COLORS.text },
  profileSportPillStat: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted },

  // KPI Strip
  kpiScroll: { gap: 8, paddingVertical: 2 },
  kpiCard: { width: 110, backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 2, ...SHADOWS.sm },
  kpiIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  kpiValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  kpiSub: { fontSize: 9, fontWeight: '700', marginTop: 1 },

  // Quick Hub Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickTile: { width: '23%', flexGrow: 1, backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 9.5, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  // Filters
  filterScroll: { gap: 7, paddingVertical: 2 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  filterEmoji: { fontSize: 11 },
  filterText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  // Section Card
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 10, ...SHADOWS.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeading: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  linkText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  sectionSubtext: { fontSize: 11, color: COLORS.textMuted, marginTop: -4, marginBottom: 4 },
  countBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, marginLeft: 4, minWidth: 20, alignItems: 'center' },
  countBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400E' },

  // Tournaments
  tournWrap: { backgroundColor: '#fff', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', ...SHADOWS.sm },
  tournHeader: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tournTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  openDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#34D399' },
  openBadgeText: { fontSize: 8.5, fontWeight: '800', color: '#D1FAE5', letterSpacing: 0.5 },
  countdownBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(251,191,36,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  countdownText: { fontSize: 8.5, fontWeight: '800', color: '#FDE68A' },
  tournTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 2 },
  tournMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  tournMetaText: { fontSize: 9.5, color: '#C7D2FE' },
  tournDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  tournDetailsBtnText: { fontSize: 10.5, fontWeight: '700', color: '#fff' },

  // Event Cards
  eventsListWrap: { padding: 10, gap: 8, backgroundColor: '#FAFAFA' },
  eventCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 11, borderWidth: 1, borderColor: '#E2E8F0', gap: 7, ...SHADOWS.sm },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  eventSportPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  eventSportPillText: { fontSize: 9.5, fontWeight: '700', color: COLORS.primary },
  eventFormatPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  eventFormatText: { fontSize: 9.5, fontWeight: '600', color: COLORS.textSecondary },
  eventDatePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EEF2FF', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  eventDatePillText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  fillingPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' },
  fillingText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  eventName: { fontSize: 12.5, fontWeight: '800', color: COLORS.text },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  eventMetaText: { fontSize: 9.5, color: COLORS.textMuted },
  eventCapWrap: { alignItems: 'flex-end', gap: 2 },
  eventCapText: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary },
  capBarBg: { width: 70, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  capBarFill: { height: 4, borderRadius: 2 },
  eventActionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingTop: 2 },
  auctionBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F5F3FF', paddingHorizontal: 7, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#DDD6FE' },
  auctionBadgeText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  registeredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#A7F3D0' },
  registeredText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  fullBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  fullText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  registerNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 11, paddingVertical: 5.5, borderRadius: RADIUS.full, ...SHADOWS.sm },
  registerNowText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // My Registrations
  regList: { gap: 8 },
  regCard: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10, borderWidth: 1, borderColor: '#F1F5F9', gap: 6 },
  regTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  regEmojiWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  regTeamName: { fontSize: 12.5, fontWeight: '700', color: COLORS.text },
  regMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 0, marginTop: 1, flexWrap: 'wrap' },
  regMetaText: { fontSize: 10, color: COLORS.textMuted },
  regMetaDot: { fontSize: 10, color: COLORS.textMuted, marginHorizontal: 4 },
  regDetailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 48 },
  regDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  regDetailText: { fontSize: 9.5, color: COLORS.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2.5 },
  statusConfirmed: { backgroundColor: '#ECFDF5' },
  statusPending: { backgroundColor: '#FFFBEB' },
  statusText: { fontSize: 9, fontWeight: '800' },

  // Fixtures
  fixtureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  fixtureBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  fixtureLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fixtureEmojiWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  fixtureTimeCol: { alignItems: 'center', minWidth: 48 },
  fixtureTime: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  fixtureDate: { fontSize: 9, color: COLORS.textMuted },
  fixtureCenter: { flex: 1, minWidth: 0 },
  fixtureTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  fixtureMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  fixtureMeta: { fontSize: 9.5, color: COLORS.textMuted },
  fixtureDot: { color: COLORS.textMuted, fontSize: 9 },

  // Results
  resultsList: { gap: 8 },
  resultCard: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10, gap: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultSportLabel: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  resultTime: { fontSize: 9, color: COLORS.textMuted },
  resultMatchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  resultTeamCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  resultTeamName: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  resultWinner: { fontWeight: '800', color: COLORS.text },
  resultScoreCenter: { alignItems: 'center', gap: 2 },
  resultScorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1E1B4B', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, minWidth: 54 },
  resultScoreText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  resultScoreDash: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.5)' },
  resultDetail: { fontSize: 8.5, fontWeight: '700', color: COLORS.textMuted },

  // Courts
  hScroll: { gap: 8, paddingVertical: 2 },
  courtCard: { width: 140, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 4, ...SHADOWS.sm },
  courtAvailBadge: { backgroundColor: '#ECFDF5', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5 },
  courtAvailText: { fontSize: 8.5, fontWeight: '800', color: '#065F46' },
  courtName: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  courtTime: { fontSize: 9, color: COLORS.textMuted },
  courtPrice: { fontSize: 10, fontWeight: '800', color: COLORS.primary, marginTop: 1 },
  courtFree: { fontSize: 10, fontWeight: '800', color: '#059669', marginTop: 1 },
  emptyFacilityCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyFacTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  emptyFacSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  // Leaderboard
  leaderList: { gap: 4 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 4, borderRadius: RADIUS.sm },
  leaderRowCurrent: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  leaderRankWrap: { width: 22, alignItems: 'center' },
  leaderRank: { fontSize: 12, fontWeight: '900', color: COLORS.textMuted, textAlign: 'center' },
  leaderAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  leaderAvatarText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  leaderName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  leaderSub: { fontSize: 9.5, color: COLORS.textMuted },
  leaderScore: { fontSize: 12, fontWeight: '900', color: COLORS.primary },
  leaderTeam: { fontSize: 9, color: COLORS.textMuted, maxWidth: 70 },
  youBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  youBadgeText: { fontSize: 7.5, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  // Insurance
  insuranceBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFBEB', borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: '#FCD34D', ...SHADOWS.sm },
  insuranceIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  insuranceTitle: { fontSize: 14, fontWeight: '700', color: '#78350F' },
  insuranceSub: { fontSize: 11, color: '#92400E', marginTop: 2 },

  // Rides
  rideSub: { fontSize: 11, color: COLORS.textMuted, marginBottom: 6 },
  rideRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rideAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  rideAvatarText: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  rideDriver: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  rideRoute: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  rideSeats: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  rideFree: { fontSize: 11, fontWeight: '700', color: COLORS.success, marginTop: 2 },
  ridePrice: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  offerRideBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 9, borderRadius: RADIUS.md, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  offerRideBtnText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8' },

  // Promo
  promoBanner: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  promoGradient: { padding: 16 },
  promoTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  promoSub: { fontSize: 11, color: '#C7D2FE', marginTop: 2, marginBottom: 12 },
  promoBtn: { backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 9, alignItems: 'center' },
  promoBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primaryDark },

  // Empty states
  emptyBlock: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 18, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyMini: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, gap: 6 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 16 },
  emptyBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  emptyPrimaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full },
  emptyPrimaryBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  emptySecondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#C7D2FE' },
  emptySecondaryBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // Utils
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
