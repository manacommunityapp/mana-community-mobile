import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sportsService } from '@/services/sportsService';
import { facilityService, FacilityDto } from '@/services/facilityService';
import { auctionService } from '@/services/auctionService';
import { SportsRegisterModal, RegistrationRecord } from '@/components/sports/SportsRegisterModal';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { formatTournamentDateRange } from '@/utils/dateUtils';
import type {
  MatchDto, TournamentDto, PlayerProfileDto, LeaderboardEntryDto,
  SportType, DashboardTournamentCardDto, DashboardEventCardDto,
} from '@/types/api';

const { width } = Dimensions.get('window');

// ── Sport Filter Definitions ───────────────────────────────────────────
const SPORT_FILTERS = [
  { id: 'ALL',          label: 'All',          emoji: '🏅' },
  { id: 'CRICKET',      label: 'Cricket',      emoji: '🏏' },
  { id: 'BADMINTON',    label: 'Badminton',    emoji: '🏸' },
  { id: 'FOOTBALL',     label: 'Football',     emoji: '⚽' },
  { id: 'PICKLEBALL',   label: 'Pickleball',   emoji: '🏓' },
  { id: 'TENNIS',       label: 'Tennis',       emoji: '🎾' },
  { id: 'TABLE_TENNIS', label: 'Table Tennis', emoji: '🏓' },
  { id: 'BASKETBALL',   label: 'Basketball',   emoji: '🏀' },
  { id: 'SWIMMING',     label: 'Swimming',     emoji: '🏊' },
] as const;

const SPORT_EMOJI_MAP: Record<string, string> = {
  BADMINTON: '🏸',
  CRICKET: '🏏',
  FOOTBALL: '⚽',
  TENNIS: '🎾',
  TABLE_TENNIS: '🏓',
  PICKLEBALL: '🏓',
  SWIMMING: '🏊',
  SWIMMING_POOL: '🏊',
  BASKETBALL: '🏀',
  GYM: '💪',
  SQUASH: '🎾',
};

const MEDAL_COLORS = ['#F59E0B', '#64748B', '#D97706'];

export default function SportsHubScreen() {
  const router = useRouter();
  const { user, isAnyAdmin, isAdmin, isSuperAdmin, hasRole, hasAnyPermission } = useAuth();
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [liveIndex, setLiveIndex] = useState(0);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedRegisterEventId, setSelectedRegisterEventId] = useState<number | null>(null);
  const [customRegistrations, setCustomRegistrations] = useState<RegistrationRecord[]>([]);

  // Check if current user has admin / sports admin privileges
  const isSportsAdmin = useMemo(() => {
    return Boolean(
      isAnyAdmin ||
      isAdmin ||
      isSuperAdmin ||
      hasRole?.('SPORTS_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'COMMUNITY_ADMIN', 'SPORTS_REFEREE') ||
      hasAnyPermission?.('View Sports Dashboard', 'View Admin', 'Manage Matches', 'Manage Tournaments') ||
      user?.role?.toUpperCase().includes('ADMIN') ||
      user?.role === 'SPORTS_ADMIN'
    );
  }, [isAnyAdmin, isAdmin, isSuperAdmin, hasRole, hasAnyPermission, user?.role]);

  // 1. Live Matches
  const {
    data: liveMatches = [],
    refetch: refetchLive,
    isRefetching: isRefetchingLive,
  } = useQuery<MatchDto[]>({
    queryKey: ['sports-live'],
    queryFn: sportsService.getLiveMatches,
    refetchInterval: 15_000,
  });

  // 2. Today's Matches
  const {
    data: todayMatches = [],
    refetch: refetchToday,
  } = useQuery<MatchDto[]>({
    queryKey: ['sports-today'],
    queryFn: sportsService.getTodayMatches,
    refetchInterval: 60_000,
  });

  // 3. Tournaments
  const {
    data: tournamentsPage,
    refetch: refetchTournaments,
  } = useQuery({
    queryKey: ['tournaments-hub', selectedSport],
    queryFn: () => sportsService.getTournaments(selectedSport === 'ALL' ? undefined : (selectedSport as SportType), 'ONGOING'),
  });

  // 4. Open Registration Tournaments
  const {
    data: openTournamentsDash = [],
    refetch: refetchOpenTournaments,
  } = useQuery<DashboardTournamentCardDto[]>({
    queryKey: ['tournaments-open-dash'],
    queryFn: sportsService.getOpenTournaments,
    staleTime: 30_000,
  });

  // 5. User Real Profile Stats
  const {
    data: playerProfile,
    refetch: refetchProfile,
  } = useQuery<PlayerProfileDto>({
    queryKey: ['sports-player-me'],
    queryFn: sportsService.getMyProfile,
    staleTime: 30_000,
  });

  // 6. Community Real Facilities / Courts
  const {
    data: facilities = [],
    isLoading: loadingFacilities,
    refetch: refetchFacilities,
  } = useQuery<FacilityDto[]>({
    queryKey: ['facilities-sports'],
    queryFn: facilityService.getFacilities,
    staleTime: 60_000,
  });

  // 7. Community Real Leaderboard
  const {
    data: leaderboard = [],
    isLoading: loadingLeaderboard,
    refetch: refetchLeaderboard,
  } = useQuery<LeaderboardEntryDto[]>({
    queryKey: ['sports-leaderboard-top', selectedSport],
    queryFn: () => sportsService.getLeaderboard(selectedSport === 'ALL' ? 'ALL' : (selectedSport as SportType), 'WINS', 'ALL_TIME'),
    staleTime: 30_000,
  });

  // 8. User Real Event Registrations
  const {
    data: myRegistrationsApi = [],
    refetch: refetchRegistrations,
  } = useQuery({
    queryKey: ['sports-my-registrations'],
    queryFn: sportsService.getMyRegistrations,
    staleTime: 30_000,
  });

  // 9. Community Sports Overall Dashboard Stats
  const {
    data: dashStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['sports-dashboard-stats'],
    queryFn: sportsService.getDashboardStats,
    staleTime: 30_000,
  });

  // ── Refetch All ───────────────────────────────────────────────────────
  const isRefreshing = isRefetchingLive;
  const handleRefresh = async () => {
    await Promise.all([
      refetchLive(),
      refetchToday(),
      refetchTournaments(),
      refetchProfile(),
      refetchFacilities(),
      refetchLeaderboard(),
      refetchOpenTournaments(),
      refetchRegistrations(),
      refetchStats(),
    ]);
  };

  // ── Filtered Data ─────────────────────────────────────────────────────
  const filteredLive = useMemo(() => {
    if (!liveMatches) return [];
    return selectedSport === 'ALL'
      ? liveMatches
      : liveMatches.filter((m: MatchDto) => m.sport?.toUpperCase() === selectedSport);
  }, [liveMatches, selectedSport]);

  const filteredToday = useMemo(() => {
    if (!todayMatches) return [];
    return selectedSport === 'ALL'
      ? todayMatches
      : todayMatches.filter((m: MatchDto) => m.sport?.toUpperCase() === selectedSport);
  }, [todayMatches, selectedSport]);

  const recentCompleted = useMemo(() => {
    const list = todayMatches.filter(m => m.status === 'COMPLETED');
    if (selectedSport === 'ALL') return list.slice(0, 4);
    return list.filter(m => m.sport?.toUpperCase() === selectedSport).slice(0, 4);
  }, [todayMatches, selectedSport]);

  // Filter sports facilities
  const sportsFacilities = useMemo(() => {
    const sportsKeywords = ['BADMINTON', 'TENNIS', 'SWIMMING', 'CRICKET', 'GYM', 'SQUASH', 'TABLE_TENNIS', 'BASKETBALL', 'PICKLEBALL', 'FOOTBALL', 'COURT', 'TURF', 'POOL'];
    return facilities.filter((f) => {
      const typeUp = (f.type || '').toUpperCase();
      const nameUp = (f.name || '').toUpperCase();
      const matchesKeyword = sportsKeywords.some(k => typeUp.includes(k) || nameUp.includes(k));
      if (!matchesKeyword) return false;
      if (selectedSport === 'ALL') return true;
      return typeUp.includes(selectedSport) || nameUp.includes(selectedSport);
    });
  }, [facilities, selectedSport]);

  // Current active live match for the hero carousel
  const activeLiveMatch = filteredLive[liveIndex] ?? filteredLive[0] ?? null;

  // Top performers
  const topPerformers = useMemo(() => {
    return leaderboard.slice(0, 4);
  }, [leaderboard]);

  // Merged registrations (backend API + active session submissions)
  const allRegistrations = useMemo(() => {
    const apiRecords: RegistrationRecord[] = (myRegistrationsApi || []).map((r: any) => ({
      id: String(r.id),
      tournamentName: r.eventName || 'Tournament',
      sport: r.sportName || 'Sport',
      team: r.playerName || user?.name || user?.fullName || 'Resident Team',
      status: (r.status === 'CONFIRMED' || r.status === 'APPROVED' ? 'Confirmed' : 'Pending') as 'Confirmed' | 'Pending',
      players: r.matchType === 'DOUBLES' ? 2 : 1,
      plan: 'Community Registration',
      fee: 0,
    }));
    const existingIds = new Set(apiRecords.map((a) => a.id));
    return [...customRegistrations.filter((c) => !existingIds.has(c.id)), ...apiRecords];
  }, [myRegistrationsApi, customRegistrations, user?.name, user?.fullName]);

  // Open Tournaments and filtered categories based on selectedSport
  const openTournamentsWithFilteredEvents = useMemo(() => {
    return openTournamentsDash
      .map((t) => {
        const events = (t.events || []).filter((ev) => {
          if (selectedSport === 'ALL') return true;
          const sportUpper = (ev.sportName || '').toUpperCase().replace(/\s+/g, '_');
          return sportUpper.includes(selectedSport) || selectedSport.includes(sportUpper);
        });
        return { ...t, filteredEvents: events };
      })
      .filter((t) => t.filteredEvents.length > 0 || (selectedSport === 'ALL' && (t.events || []).length > 0));
  }, [openTournamentsDash, selectedSport]);

  const totalOpenEventsCount = useMemo(() => {
    return openTournamentsWithFilteredEvents.reduce(
      (acc, t) => acc + (t.filteredEvents?.length || t.events?.length || 0),
      0
    );
  }, [openTournamentsWithFilteredEvents]);

  const sportsKpis = [
    {
      label: 'Tournaments',
      value: String(dashStats?.openRegistrations ?? openTournamentsDash.length),
      sub: 'Open for entry',
      icon: 'trophy',
      color: COLORS.success,
      bg: '#ECFDF5',
    },
    {
      label: 'Live Now',
      value: String(dashStats?.liveEvents ?? filteredLive.length),
      sub: 'Games ongoing',
      icon: 'flash',
      color: COLORS.error,
      bg: '#FEF2F2',
    },
    {
      label: 'Upcoming',
      value: String(dashStats?.upcomingTournaments ?? filteredToday.length),
      sub: 'Next 7 days',
      icon: 'calendar',
      color: COLORS.warning,
      bg: '#FFFBEB',
    },
    {
      label: 'Facilities',
      value: String(sportsFacilities.length),
      sub: 'Available to book',
      icon: 'football',
      color: COLORS.primary,
      bg: '#EEF2FF',
    },
  ];

  const communityLabel = (user as any)?.community?.name || (user as any)?.communityName || 'Mana Community';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── App Signature Header ── */}
      <LinearGradient
        colors={['#1E1B4B', '#3730A3', '#4F46E5']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.header}
      >
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
              <TouchableOpacity
                style={s.adminDeckPill}
                onPress={() => router.push('/sports-admin' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={12} color="#FBBF24" />
                <Text style={s.adminDeckPillText}>Admin</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.registerBtn}
              onPress={() => {
                setSelectedRegisterEventId(null);
                setShowRegisterModal(true);
              }}
              activeOpacity={0.85}
            >
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
        {/* ── Hero Live Scoreboard Carousel (Signature App Gradient) ── */}
        <View style={s.heroContainer}>
          <LinearGradient
            colors={['#1E1B4B', '#3730A3', '#4F46E5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.heroCard}
          >
            {activeLiveMatch ? (
              <>
                {/* Header row */}
                <View style={s.heroHeader}>
                  <View style={s.heroLiveTag}>
                    <View style={s.livePulseDot} />
                    <Text style={s.heroLiveText}>
                      LIVE · {(activeLiveMatch.sport || (selectedSport === 'ALL' ? 'MATCH' : selectedSport)).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.heroPeriodBadge}>
                    <Text style={s.heroPeriodText}>
                      {activeLiveMatch.currentPeriod || 'LIVE'}
                    </Text>
                  </View>
                </View>

                {/* Teams vs Score */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/sports/match/${activeLiveMatch.id}`)}
                  style={s.heroMatchRow}
                >
                  {/* Home Team */}
                  <View style={s.heroTeamCol}>
                    <View style={s.heroAvatar}>
                      <Text style={s.heroAvatarText}>
                        {activeLiveMatch.homeTeamName?.[0] || 'H'}
                      </Text>
                    </View>
                    <Text style={s.heroTeamName} numberOfLines={1}>
                      {activeLiveMatch.homeTeamName || 'Home'}
                    </Text>
                  </View>

                  {/* Score Display */}
                  <View style={s.heroScoreCol}>
                    <Text style={s.heroScoreBig}>
                      {activeLiveMatch.homeScore ?? 0}
                      <Text style={s.heroScoreColon}> : </Text>
                      {activeLiveMatch.awayScore ?? 0}
                    </Text>
                    <Text style={s.heroLeadStatus}>
                      {activeLiveMatch.homeScore > activeLiveMatch.awayScore
                        ? `${activeLiveMatch.homeTeamName} lead`
                        : activeLiveMatch.awayScore > activeLiveMatch.homeScore
                        ? `${activeLiveMatch.awayTeamName} lead`
                        : 'Scores level'}
                    </Text>
                  </View>

                  {/* Away Team */}
                  <View style={s.heroTeamCol}>
                    <View style={s.heroAvatar}>
                      <Text style={s.heroAvatarText}>
                        {activeLiveMatch.awayTeamName?.[0] || 'A'}
                      </Text>
                    </View>
                    <Text style={s.heroTeamName} numberOfLines={1}>
                      {activeLiveMatch.awayTeamName || 'Away'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Pagination Dots */}
                {filteredLive.length > 1 && (
                  <View style={s.heroDotsRow}>
                    {filteredLive.map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setLiveIndex(i)}
                        style={[s.heroDot, i === liveIndex ? s.heroDotActive : s.heroDotInactive]}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : filteredToday.length > 0 ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/sports/matches')}
                style={{ paddingVertical: 6, gap: 10 }}
              >
                <View style={s.heroHeader}>
                  <View style={[s.heroLiveTag, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                    <Text style={[s.heroLiveText, { color: '#FDE047' }]}>
                      TODAY'S FIXTURE · {(filteredToday[0].sport || (selectedSport === 'ALL' ? 'MATCH' : selectedSport)).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.heroPeriodBadge}>
                    <Text style={s.heroPeriodText}>
                      {filteredToday[0].scheduledAt ? new Date(filteredToday[0].scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                    </Text>
                  </View>
                </View>
                <View style={s.heroMatchRow}>
                  <View style={s.heroTeamCol}>
                    <View style={s.heroAvatar}>
                      <Text style={s.heroAvatarText}>{filteredToday[0].homeTeamName?.[0] || 'H'}</Text>
                    </View>
                    <Text style={s.heroTeamName} numberOfLines={1}>{filteredToday[0].homeTeamName}</Text>
                  </View>
                  <View style={s.heroScoreCol}>
                    <Text style={[s.heroScoreBig, { fontSize: 20, letterSpacing: 0.5 }]}>VS</Text>
                    <Text style={s.heroLeadStatus}>{filteredToday[0].venue || 'Community Arena'}</Text>
                  </View>
                  <View style={s.heroTeamCol}>
                    <View style={s.heroAvatar}>
                      <Text style={s.heroAvatarText}>{filteredToday[0].awayTeamName?.[0] || 'A'}</Text>
                    </View>
                    <Text style={s.heroTeamName} numberOfLines={1}>{filteredToday[0].awayTeamName}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={{ paddingVertical: 14, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 24 }}>🏟️</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>No Live Matches Right Now</Text>
                <Text style={{ fontSize: 11, color: '#C7D2FE', textAlign: 'center', maxWidth: 280 }}>
                  Check upcoming fixtures and community tournaments scheduled for your community.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/sports/matches')}
                  style={{ marginTop: 6, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.full }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>View Match Schedule →</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* ── KPI Strip (App Card Theme) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.kpiScroll}>
          {sportsKpis.map((k) => (
            <View key={k.label} style={s.kpiCard}>
              <View style={[s.kpiIcon, { backgroundColor: k.bg }]}>
                <Ionicons name={k.icon as any} size={15} color={k.color} />
              </View>
              <Text style={s.kpiValue}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={[s.kpiSub, { color: k.color }]}>{k.sub}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Quick Hub Actions (App Surface Cards) ── */}
        <View style={s.quickHubWrap}>
          {[
            { label: 'Book Court', emoji: '🏸', route: '/facilities', color: '#4F46E5', bg: '#EEF2FF' },
            { label: 'Tournaments', emoji: '🏆', route: '/sports/tournaments', color: '#4338CA', bg: '#EEF2FF' },
            { label: 'Schedule', emoji: '⚔️', route: '/sports/matches', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Standings', emoji: '📊', route: '/sports/leaderboard', color: '#0891B2', bg: '#CFFAFE' },
            { label: 'My Squads', emoji: '👥', route: '/sports/my-teams', color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Auctions', emoji: '🏷️', route: '/auction', color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Trainers', emoji: '🎽', route: '/sports/trainers', color: '#059669', bg: '#ECFDF5' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={s.quickHubTile}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <View style={[s.quickHubIcon, { backgroundColor: item.bg }]}>
                <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
              </View>
              <Text style={s.quickHubLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Sport Filter Chips (App Theme) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {SPORT_FILTERS.map((sp) => {
            const active = selectedSport === sp.id;
            return (
              <TouchableOpacity
                key={sp.id}
                onPress={() => setSelectedSport(sp.id)}
                activeOpacity={0.8}
                style={[s.filterChip, active && s.filterChipActive]}
              >
                <Text style={s.filterChipEmoji}>{sp.emoji}</Text>
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{sp.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Open Tournaments & Registration Events ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="trophy" size={16} color="#F59E0B" />
              <Text style={s.cardHeading}>Open Tournaments & Events</Text>
              {totalOpenEventsCount > 0 && (
                <View style={s.eventCountBadge}>
                  <Text style={s.eventCountBadgeText}>{totalOpenEventsCount} Open</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => router.push('/sports/tournaments' as any)}
              style={s.row}
            >
              <Text style={s.linkText}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={s.sectionSubtext}>
            Join open leagues and sports categories. Register solo or enter with your squad.
          </Text>

          {openTournamentsWithFilteredEvents.length === 0 ? (
            <View style={s.emptyOpenTournamentsCard}>
              <View style={s.emptyTournIconWrap}>
                <Ionicons name="trophy-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={s.emptyTournTitle}>
                {selectedSport === 'ALL'
                  ? 'No Open Tournaments Right Now'
                  : `No Open ${SPORT_FILTERS.find((f) => f.id === selectedSport)?.label || selectedSport} Events`}
              </Text>
              <Text style={s.emptyTournSub}>
                Explore the tournament schedule, or register your custom squad for upcoming announcements.
              </Text>
              <View style={s.emptyTournBtnRow}>
                <TouchableOpacity
                  style={s.emptyTournPrimaryBtn}
                  onPress={() => router.push('/sports/tournaments')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="list" size={13} color="#fff" />
                  <Text style={s.emptyTournPrimaryBtnText}>All Tournaments</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.emptyTournSecondaryBtn}
                  onPress={() => {
                    setSelectedRegisterEventId(null);
                    setShowRegisterModal(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={13} color={COLORS.primary} />
                  <Text style={s.emptyTournSecondaryBtnText}>Register Squad</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ gap: 12, marginTop: 4 }}>
              {openTournamentsWithFilteredEvents.map((t) => {
                const dateRangeStr = formatTournamentDateRange(t.eventDateStart, t.eventDateEnd);
                const displayEvents =
                  (t as any).filteredEvents && (t as any).filteredEvents.length > 0
                    ? (t as any).filteredEvents
                    : t.events || [];

                return (
                  <View key={t.id} style={s.tournamentCardWrap}>
                    {/* Tournament Header Bar */}
                    <LinearGradient
                      colors={['#1E1B4B', '#3730A3', '#4F46E5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={s.tournamentHeaderBar}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={s.tournHeaderTopRow}>
                          <View style={s.openRegBadge}>
                            <View style={s.openPulseDot} />
                            <Text style={s.openRegBadgeText}>REGISTRATION OPEN</Text>
                          </View>
                          {t.communityName ? (
                            <Text style={s.tournCommunityTag} numberOfLines={1}>
                              📍 {t.communityName}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={s.tournTitleText} numberOfLines={2}>
                          {t.name}
                        </Text>
                        <View style={s.tournDateRow}>
                          <Ionicons name="calendar-outline" size={11} color="#C7D2FE" />
                          <Text style={s.tournDateText}>{dateRangeStr}</Text>
                          <Text style={s.tournDateText}>·</Text>
                          <Text style={s.tournDateText}>
                            {displayEvents.length} {displayEvents.length === 1 ? 'Category' : 'Categories'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={s.tournDetailsBtn}
                        onPress={() => router.push(`/sports/tournament/${t.id}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.tournDetailsBtnText}>Details</Text>
                        <Ionicons name="arrow-forward" size={11} color="#fff" />
                      </TouchableOpacity>
                    </LinearGradient>

                    {/* Event Categories List */}
                    <View style={s.eventsListWrap}>
                      {displayEvents.map((ev: DashboardEventCardDto) => {
                        const sportUpper = (ev.sportName || '').toUpperCase().replace(/\s+/g, '_');
                        const sportEmoji = SPORT_EMOJI_MAP[sportUpper] || '🏅';
                        const isRegistered =
                          ev.myRegistrationId != null ||
                          allRegistrations.some(
                            (r) => String(r.id) === String(ev.id) || r.tournamentName === ev.name
                          );
                        const max = ev.maxParticipants ?? 0;
                        const registered = ev.registeredCount ?? 0;
                        const fillRatio = max > 0 ? Math.min(registered / max, 1) : 0;
                        const spotsLeft = max > 0 ? Math.max(max - registered, 0) : null;
                        const isFilling = fillRatio >= 0.75 && fillRatio < 1;
                        const isFull = fillRatio >= 1 && max > 0;
                        const catUpper = (ev.categoryName ?? ev.name ?? '').toUpperCase();
                        const teamSportLabel = ev.teamSport
                          ? 'Team Squad'
                          : catUpper.includes('DOUBLES')
                          ? 'Doubles'
                          : 'Singles';

                        return (
                          <View key={ev.id} style={s.eventCardItem}>
                            <View style={s.eventCardTopRow}>
                              <View style={s.eventSportPill}>
                                <Text style={{ fontSize: 13 }}>{sportEmoji}</Text>
                                <Text style={s.eventSportPillText}>{ev.sportName || 'Sport'}</Text>
                              </View>
                              <View style={s.eventFormatPill}>
                                <Text style={s.eventFormatPillText}>{teamSportLabel}</Text>
                              </View>
                              {isFilling && !isFull && (
                                <View style={s.fillingFastPill}>
                                  <Text style={s.fillingFastPillText}>⚡ {spotsLeft} left</Text>
                                </View>
                              )}
                            </View>

                            <Text style={s.eventNameText} numberOfLines={2}>
                              {ev.categoryName || ev.name}
                            </Text>

                            {/* Venue & Capacity Row */}
                            <View style={s.eventMetaInfoRow}>
                              {ev.venueName ? (
                                <View style={s.eventMetaInfoItem}>
                                  <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                                  <Text style={s.eventMetaInfoText} numberOfLines={1}>
                                    {ev.venueName}
                                  </Text>
                                </View>
                              ) : (
                                <View style={s.eventMetaInfoItem}>
                                  <Ionicons name="tennisball-outline" size={11} color={COLORS.textMuted} />
                                  <Text style={s.eventMetaInfoText} numberOfLines={1}>
                                    Clubhouse Arena
                                  </Text>
                                </View>
                              )}
                              {max > 0 ? (
                                <View style={s.eventCapacityWrap}>
                                  <View style={s.eventCapLabels}>
                                    <Text style={s.eventCapText}>
                                      {registered}/{max} Registered
                                    </Text>
                                  </View>
                                  <View style={s.eventCapProgressBarBg}>
                                    <View
                                      style={[
                                        s.eventCapProgressBarFill,
                                        {
                                          width: `${Math.round(fillRatio * 100)}%` as any,
                                          backgroundColor: isFull
                                            ? '#EF4444'
                                            : isFilling
                                            ? '#F59E0B'
                                            : COLORS.primary,
                                        },
                                      ]}
                                    />
                                  </View>
                                </View>
                              ) : null}
                            </View>

                            {/* Action CTA */}
                            <View style={s.eventActionRow}>
                              {isRegistered ? (
                                <View style={s.alreadyRegisteredBadge}>
                                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                  <Text style={s.alreadyRegisteredText}>You are Registered</Text>
                                </View>
                              ) : isFull ? (
                                <View style={s.eventFullBadge}>
                                  <Text style={s.eventFullText}>Category Full</Text>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={s.eventRegisterNowBtn}
                                  onPress={() => {
                                    setSelectedRegisterEventId(ev.id);
                                    setShowRegisterModal(true);
                                  }}
                                  activeOpacity={0.85}
                                >
                                  <Ionicons name="flash" size={12} color="#fff" />
                                  <Text style={s.eventRegisterNowBtnText}>Register Now</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── My Registrations ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="clipboard" size={15} color={COLORS.primary} />
              <Text style={s.cardHeading}>My Registrations</Text>
              {allRegistrations.length > 0 && (
                <View style={[s.eventCountBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[s.eventCountBadgeText, { color: '#065F46' }]}>{allRegistrations.length} Active</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedRegisterEventId(null);
                setShowRegisterModal(true);
              }}
            >
              <Text style={s.linkText}>+ New</Text>
            </TouchableOpacity>
          </View>
          {allRegistrations.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="clipboard-outline" size={24} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Tournament Registrations Yet</Text>
              <Text style={s.emptySub}>Register for upcoming tournaments to track your participation here.</Text>
            </View>
          ) : (
            <View style={s.regList}>
              {allRegistrations.map((r) => {
                const isConfirmed = r.status === 'Confirmed';
                const emoji = SPORT_EMOJI_MAP[r.sport.toUpperCase()] || '🏅';
                return (
                  <View key={r.id} style={s.regRow}>
                    <View style={s.regEmojiWrap}>
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.regTeamName} numberOfLines={1}>{r.team}</Text>
                      <Text style={s.regMeta}>{r.sport}{r.players ? ` · ${r.players} players` : ''}{r.fee > 0 ? ` · ₹${r.fee.toLocaleString('en-IN')}` : ''}</Text>
                    </View>
                    <View style={[s.statusBadge, isConfirmed ? s.statusConfirmed : s.statusPending]}>
                      <Text style={[s.statusText, { color: isConfirmed ? '#065F46' : '#92400E' }]}>
                        {r.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Upcoming Fixtures ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <Text style={s.cardHeading}>Upcoming Fixtures</Text>
            <TouchableOpacity onPress={() => router.push('/sports/matches')} style={s.row}>
              <Text style={s.linkText}>Schedule</Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {filteredToday.length === 0 ? (
            <View style={s.emptyFixtureBlock}>
              <Text style={s.emptyFixtureText}>
                No upcoming matches scheduled for {selectedSport === 'ALL' ? 'today' : selectedSport}.
              </Text>
              <TouchableOpacity onPress={() => router.push('/sports/matches')} style={{ marginTop: 4 }}>
                <Text style={s.linkText}>+ Schedule or browse all matches</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredToday.slice(0, 3).map((m: MatchDto, idx: number) => {
              const sportEmoji = SPORT_EMOJI_MAP[m.sport?.toUpperCase()] || '🏅';
              return (
                <TouchableOpacity
                  key={m.id || idx}
                  style={[s.fixtureRow, idx > 0 && s.fixtureBorder]}
                  onPress={() => router.push(`/sports/match/${m.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={s.fixtureIconWrap}>
                    <Text style={{ fontSize: 18 }}>{sportEmoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.fixtureTitle} numberOfLines={1}>
                      {m.homeTeamName} <Text style={{ color: COLORS.textMuted, fontWeight: '400' }}>vs</Text> {m.awayTeamName}
                    </Text>
                    <View style={s.fixtureMetaRow}>
                      <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
                      <Text style={s.fixtureMetaText}>{m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}</Text>
                      <Text style={s.fixtureMetaDot}>·</Text>
                      <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                      <Text style={s.fixtureMetaText} numberOfLines={1}>
                        {typeof m.venue === 'string' ? m.venue : (m.venue as any)?.name || 'Court 1'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── Recent Results ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <Text style={s.cardHeading}>Recent Results</Text>
            <TouchableOpacity onPress={() => router.push('/sports/matches')}>
              <Text style={s.linkText}>All Results</Text>
            </TouchableOpacity>
          </View>
          {recentCompleted.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="trophy-outline" size={24} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Completed Matches Today</Text>
              <Text style={s.emptySub}>Results will appear here as matches wrap up.</Text>
            </View>
          ) : (
            <View style={s.resultsList}>
              {recentCompleted.map((res: any) => (
                <View key={res.id} style={s.resultItem}>
                  <View style={s.resultTopRow}>
                    <Text style={s.resultSportBadge}>{(res.sport || 'SPORT').toUpperCase()}</Text>
                    <Text style={s.resultDate}>{res.date || (res.completedAt ? new Date(res.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Final')}</Text>
                  </View>
                  <View style={s.resultMatchRow}>
                    <Text style={s.resultTeamHome} numberOfLines={1}>{res.homeTeamName}</Text>
                    <View style={s.resultScorePill}>
                      <Text style={s.resultScoreText}>{res.homeScore} – {res.awayScore}</Text>
                    </View>
                    <Text style={s.resultTeamAway} numberOfLines={1}>{res.awayTeamName}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Court Availability & Venues ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="flash" size={13} color={COLORS.primary} />
              <Text style={s.cardHeading}>Court Availability & Venues</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/facilities')}>
              <Text style={s.linkText}>Book Slot →</Text>
            </TouchableOpacity>
          </View>

          {loadingFacilities ? (
            <ActivityIndicator color={COLORS.primary} size="small" style={{ marginVertical: 12 }} />
          ) : sportsFacilities.length === 0 ? (
            <TouchableOpacity style={s.emptyFacilitiesCard} onPress={() => router.push('/facilities')}>
              <Text style={{ fontSize: 24 }}>🏟️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.emptyFacTitle}>Explore Community Amenities</Text>
                <Text style={s.emptyFacSub}>Tap to check clubhouse courts, pool, and turf slots</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
              {sportsFacilities.map((court) => {
                const sportEmoji = SPORT_EMOJI_MAP[court.type?.toUpperCase()] || '🏟️';
                return (
                  <TouchableOpacity
                    key={court.id}
                    style={s.courtCard}
                    onPress={() => router.push('/facilities')}
                    activeOpacity={0.8}
                  >
                    <View style={s.rowBetween}>
                      <Text style={{ fontSize: 18 }}>{sportEmoji}</Text>
                      <View style={s.courtBadgeAvailable}>
                        <Text style={s.courtBadgeText}>Available</Text>
                      </View>
                    </View>
                    <Text style={s.courtName} numberOfLines={1}>{court.name}</Text>
                    <Text style={s.courtSlot} numberOfLines={1}>
                      {court.openTime && court.closeTime ? `${court.openTime} - ${court.closeTime}` : 'Open Daily'}
                    </Text>
                    {court.hourlyRate > 0 ? (
                      <Text style={s.courtFee}>₹{court.hourlyRate}/hr</Text>
                    ) : (
                      <Text style={s.courtFeeFree}>Free for Residents</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Top Performers (Community Leaderboard) ── */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={s.row}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={s.cardHeading}>Top Performers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/leaderboard')}>
              <Text style={s.linkText}>Leaderboard →</Text>
            </TouchableOpacity>
          </View>
          {topPerformers.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="ribbon-outline" size={24} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Rankings Recorded Yet</Text>
              <Text style={s.emptySub}>Play tournament matches to earn points on the leaderboard.</Text>
            </View>
          ) : (
            <View style={s.leaderList}>
              {topPerformers.map((pl: any, idx: number) => {
                const name = pl.playerName || pl.name || 'Athlete';
                const rankColor = MEDAL_COLORS[idx] || COLORS.textMuted;
                const score = pl.score ?? pl.points ?? pl.matchesWon ?? pl.matchesPlayed ?? 0;
                return (
                  <View key={pl.userId || idx} style={s.leaderRow}>
                    <Text style={[s.leaderRank, { color: rankColor }]}>{idx + 1}</Text>
                    <View style={s.leaderAvatar}>
                      <Text style={s.leaderAvatarText}>{name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.leaderName} numberOfLines={1}>{name}</Text>
                      <Text style={s.leaderSub}>{pl.flatNo || pl.flatNumber || 'Mana Resident'}</Text>
                    </View>
                    <Text style={s.leaderScore}>{score} pts</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Dynamic Open Tournament or Community Action Banner ── */}
        <View style={s.promoBanner}>
          <LinearGradient
            colors={['#1E1B4B', '#3730A3']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.promoGradient}
          >
            {openTournamentsDash.length > 0 ? (
              <>
                <Ionicons name="trophy" size={24} color="#FBBF24" style={{ marginBottom: 6 }} />
                <Text style={s.promoTitle}>{openTournamentsDash[0].name}</Text>
                <Text style={s.promoSub}>
                  {openTournamentsDash[0].events?.length
                    ? `${openTournamentsDash[0].events.length} sports categories open for entry. Join with your squad or as a solo player.`
                    : 'Registration is open now! Participate in community sports tournaments.'}
                </Text>
                <TouchableOpacity
                  style={s.promoBtn}
                  onPress={() => router.push(`/sports/tournament/${openTournamentsDash[0].id}`)}
                  activeOpacity={0.88}
                >
                  <Text style={s.promoBtnText}>View Tournament & Register →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="flash" size={24} color="#C7D2FE" style={{ marginBottom: 6 }} />
                <Text style={s.promoTitle}>Community Sports Hub</Text>
                <Text style={s.promoSub}>Book court slots, post open challenges, and join upcoming leagues with your neighbors.</Text>
                <TouchableOpacity
                  style={s.promoBtn}
                  onPress={() => setShowRegisterModal(true)}
                  activeOpacity={0.88}
                >
                  <Text style={s.promoBtnText}>Register Your Squad</Text>
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>

      {/* ── Interactive 3-Step Registration Wizard ── */}
      <SportsRegisterModal
        visible={showRegisterModal}
        initialEventId={selectedRegisterEventId}
        onClose={() => {
          setShowRegisterModal(false);
          setSelectedRegisterEventId(null);
        }}
        onRegistered={(newReg) => {
          setCustomRegistrations((prev) => [newReg, ...prev]);
          refetchRegistrations();
          refetchOpenTournaments();
          refetchStats();
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles (App Light Theme Palette) ──────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  headerSub: { fontSize: 10, color: '#C7D2FE', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminDeckPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(251,191,36,0.22)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)',
  },
  adminDeckPillText: { fontSize: 10, fontWeight: '800', color: '#FEF08A' },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4.5,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  registerBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  scrollBody: { paddingHorizontal: 14, paddingTop: 14, gap: 14 },

  // Hero Live Card
  heroContainer: { borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.md },
  heroCard: { padding: 18, position: 'relative', overflow: 'hidden' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLiveTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  heroLiveText: { fontSize: 10, fontWeight: '800', color: '#FCA5A5', letterSpacing: 0.6 },
  heroPeriodBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  heroPeriodText: { fontSize: 9.5, fontWeight: '800', color: '#fff' },

  heroMatchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, marginBottom: 8,
  },
  heroTeamCol: { flex: 1, alignItems: 'center', gap: 6 },
  heroAvatar: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroTeamName: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },
  heroScoreCol: { alignItems: 'center', paddingHorizontal: 8 },
  heroScoreBig: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroScoreColon: { color: 'rgba(255,255,255,0.45)' },
  heroLeadStatus: { fontSize: 10, color: '#C7D2FE', marginTop: 2, fontWeight: '600' },

  heroDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12 },
  heroDot: { height: 5, borderRadius: 3 },
  heroDotActive: { width: 22, backgroundColor: '#fff' },
  heroDotInactive: { width: 5, backgroundColor: 'rgba(255,255,255,0.35)' },

  // KPI Strip
  kpiScroll: { gap: 8, paddingVertical: 2 },
  kpiCard: {
    width: 118, backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 3, ...SHADOWS.sm,
  },
  kpiIcon: {
    width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  kpiValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  kpiLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary },
  kpiSub: { fontSize: 9, fontWeight: '700', marginTop: 1 },

  // Section Card
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10, ...SHADOWS.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.8 },
  cardHeading: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  linkText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // My Registrations
  regList: { gap: 8 },
  regRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  regEmojiWrap: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  regTeamName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  regMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2.5 },
  statusConfirmed: { backgroundColor: '#ECFDF5' },
  statusPending: { backgroundColor: '#FFFBEB' },
  statusText: { fontSize: 9, fontWeight: '800' },

  // Sport Filter Chips
  filterScroll: { gap: 7, paddingVertical: 2 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  filterChipEmoji: { fontSize: 11 },
  filterChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  // Quick Hub Grid
  quickHubWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickHubTile: {
    width: '31%', flexGrow: 1, backgroundColor: '#fff',
    borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  quickHubIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  quickHubLabel: { fontSize: 10, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  // Fixtures
  emptyFixtureBlock: { paddingVertical: 12, alignItems: 'center' },
  emptyFixtureText: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  fixtureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  fixtureBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  fixtureIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  fixtureTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  fixtureMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  fixtureMetaText: { fontSize: 9.5, color: COLORS.textMuted },
  fixtureMetaDot: { color: COLORS.textMuted, fontSize: 10 },

  // Results
  resultsList: { gap: 8 },
  resultItem: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10, gap: 6,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultSportBadge: {
    fontSize: 8.5, fontWeight: '800', color: COLORS.primary,
    backgroundColor: '#EEF2FF', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4,
  },
  resultDate: { fontSize: 9.5, color: COLORS.textMuted },
  resultMatchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  resultTeamHome: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'right' },
  resultScorePill: {
    backgroundColor: '#1E1B4B', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    minWidth: 54, alignItems: 'center',
  },
  resultScoreText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  resultTeamAway: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.text },

  // Court Availability
  hScroll: { gap: 8, paddingVertical: 2 },
  courtCard: {
    width: 140, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 3, ...SHADOWS.sm,
  },
  courtBadgeAvailable: {
    backgroundColor: '#ECFDF5', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5,
  },
  courtBadgeText: { fontSize: 8.5, fontWeight: '800', color: '#065F46' },
  courtName: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  courtSlot: { fontSize: 9, color: COLORS.textMuted },
  courtFee: { fontSize: 10, fontWeight: '800', color: COLORS.primary, marginTop: 1 },
  courtFeeFree: { fontSize: 10, fontWeight: '800', color: '#059669', marginTop: 1 },

  emptyFacilitiesCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  emptyFacTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  emptyFacSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  // Top Performers
  leaderList: { gap: 8 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  leaderRank: { width: 14, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  leaderAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  leaderAvatarText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  leaderName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  leaderSub: { fontSize: 9.5, color: COLORS.textMuted },
  leaderScore: { fontSize: 12, fontWeight: '900', color: COLORS.primary },

  // Promo Banner
  promoBanner: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  promoGradient: { padding: 16 },
  promoTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  promoSub: { fontSize: 11, color: '#C7D2FE', marginTop: 2, marginBottom: 12 },
  promoBtn: {
    backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 9, alignItems: 'center',
  },
  promoBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primaryDark },

  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 6 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 16 },

  // Open Tournaments & Events to Register
  sectionSubtext: { fontSize: 11, color: COLORS.textMuted, marginTop: -4, marginBottom: 4 },
  eventCountBadge: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.full, marginLeft: 6,
  },
  eventCountBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  emptyOpenTournamentsCard: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 18,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyTournIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTournTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptyTournSub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 16 },
  emptyTournBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  emptyTournPrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  emptyTournPrimaryBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  emptyTournSecondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#C7D2FE',
  },
  emptyTournSecondaryBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  tournamentCardWrap: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', ...SHADOWS.sm,
  },
  tournamentHeaderBar: {
    paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  tournHeaderTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  openRegBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.25)', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  openPulseDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#34D399' },
  openRegBadgeText: { fontSize: 8.5, fontWeight: '800', color: '#D1FAE5', letterSpacing: 0.5 },
  tournCommunityTag: { fontSize: 9.5, color: '#E0E7FF', fontWeight: '600' },
  tournTitleText: { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 2 },
  tournDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tournDateText: { fontSize: 9.5, color: '#C7D2FE' },
  tournDetailsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tournDetailsBtnText: { fontSize: 10.5, fontWeight: '700', color: '#fff' },

  eventsListWrap: { padding: 10, gap: 8, backgroundColor: '#FAFAFA' },
  eventCardItem: {
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 11,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 7, ...SHADOWS.sm,
  },
  eventCardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  eventSportPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  eventSportPillText: { fontSize: 9.5, fontWeight: '700', color: COLORS.primary },
  eventFormatPill: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  eventFormatPillText: { fontSize: 9.5, fontWeight: '600', color: COLORS.textSecondary },
  fillingFastPill: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginLeft: 'auto',
  },
  fillingFastPillText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  eventNameText: { fontSize: 12.5, fontWeight: '800', color: COLORS.text },
  eventMetaInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  eventMetaInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  eventMetaInfoText: { fontSize: 9.5, color: COLORS.textMuted },
  eventCapacityWrap: { alignItems: 'flex-end', gap: 2 },
  eventCapLabels: { flexDirection: 'row', alignItems: 'center' },
  eventCapText: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary },
  eventCapProgressBarBg: {
    width: 70, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', overflow: 'hidden',
  },
  eventCapProgressBarFill: { height: 4, borderRadius: 2 },
  eventActionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 2 },
  alreadyRegisteredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#A7F3D0',
  },
  alreadyRegisteredText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  eventFullBadge: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  eventFullText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  eventRegisterNowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 11, paddingVertical: 5.5,
    borderRadius: RADIUS.full, ...SHADOWS.sm,
  },
  eventRegisterNowBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Utils
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});