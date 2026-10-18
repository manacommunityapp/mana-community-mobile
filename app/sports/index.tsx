import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sportsService } from '@/services/sportsService';
import { facilityService, FacilityDto } from '@/services/facilityService';
import { auctionService } from '@/services/auctionService';
import { ScoreCard } from '@/components/sports/ScoreCard';
import { TournamentCard } from '@/components/sports/TournamentCard';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import type { MatchDto, TournamentDto, PlayerProfileDto, LeaderboardEntryDto, AuctionDto, SportType, DashboardTournamentCardDto, DashboardEventCardDto } from '@/types/api';

// ── Sport Filter Definitions ───────────────────────────────────────────
const SPORT_FILTERS = [
  { id: 'ALL',          label: 'All',          emoji: '🏅' },
  { id: 'BADMINTON',    label: 'Badminton',    emoji: '🏸' },
  { id: 'CRICKET',      label: 'Cricket',      emoji: '🏏' },
  { id: 'PICKLEBALL',   label: 'Pickleball',   emoji: '🏓' },
  { id: 'FOOTBALL',     label: 'Football',     emoji: '⚽' },
  { id: 'TENNIS',       label: 'Tennis',       emoji: '🎾' },
  { id: 'TABLE_TENNIS', label: 'Table Tennis', emoji: '🏓' },
  { id: 'SWIMMING',     label: 'Swimming',     emoji: '🏊' },
  { id: 'BASKETBALL',   label: 'Basketball',   emoji: '🏀' },
] as const;

const HUB_ACTIONS = [
  { id: 'book',        emoji: '🏸', label: 'Book Court',   color: '#4F46E5', bg: '#EEF2FF', route: '/facilities' },
  { id: 'tournament',  emoji: '🏆', label: 'Tournaments',  color: '#4338CA', bg: '#EEF2FF', route: '/sports/tournaments' },
  { id: 'match',       emoji: '⚔️', label: 'Find Match',   color: '#2563EB', bg: '#EFF6FF', route: '/sports/matches' },
  { id: 'livescore',   emoji: '📺', label: 'Live Scores',  color: '#DC2626', bg: '#FEF2F2', route: '/sports/matches' },
  { id: 'squad',       emoji: '👥', label: 'My Squads',    color: '#7C3AED', bg: '#F5F3FF', route: '/sports/my-teams' },
  { id: 'standings',   emoji: '📊', label: 'Standings',    color: '#0891B2', bg: '#CFFAFE', route: '/sports/leaderboard' },
  { id: 'challenge',   emoji: '🎯', label: 'Challenge',    color: '#4F46E5', bg: '#EEF2FF', route: '/sports/challenge' },
  { id: 'auction',     emoji: '🏷️', label: 'Auction',      color: '#7C3AED', bg: '#F5F3FF', route: '/auction' },
  { id: 'admin',       emoji: '🛡️', label: 'Admin Deck',   color: '#475569', bg: '#F1F5F9', route: '/sports-admin' },
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

const MEDALS = ['🥇', '🥈', '🥉'];

// ── Main Screen ────────────────────────────────────────────────────────
export default function SportsHubScreen() {
  const router = useRouter();
  const { user, isAnyAdmin, isAdmin, isSuperAdmin, hasRole, hasAnyPermission } = useAuth();
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

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

  // Non-admin actions for the grid (Admin Deck moved to top header for admins)
  const visibleHubActions = useMemo(() => {
    return HUB_ACTIONS.filter((a) => a.id !== 'admin');
  }, []);

  // 1. Live Matches
  const {
    data: liveMatches = [],
    isLoading: loadingLive,
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
    isLoading: loadingToday,
    refetch: refetchToday,
  } = useQuery<MatchDto[]>({
    queryKey: ['sports-today'],
    queryFn: sportsService.getTodayMatches,
    refetchInterval: 60_000,
  });

  // 3. Ongoing Tournaments
  const {
    data: tournamentsPage,
    isLoading: loadingTournaments,
    refetch: refetchTournaments,
  } = useQuery({
    queryKey: ['tournaments-hub', selectedSport],
    queryFn: () => sportsService.getTournaments(selectedSport === 'ALL' ? undefined : (selectedSport as SportType), 'ONGOING'),
  });

  // 4. Open Registration Tournaments (with sport events grouped)
  const {
    data: openTournamentsDash = [],
    isLoading: loadingUpcoming,
    refetch: refetchOpenTournaments,
  } = useQuery<DashboardTournamentCardDto[]>({
    queryKey: ['tournaments-open-dash'],
    queryFn: sportsService.getOpenTournaments,
    staleTime: 30_000,
  });

  const [expandedTournamentIds, setExpandedTournamentIds] = useState<Set<number>>(new Set());
  const toggleTournamentExpand = useCallback((id: number) => {
    setExpandedTournamentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // 5. User Real Profile Stats
  const {
    data: playerProfile,
    isLoading: loadingProfile,
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

  // 8. Sports Auctions
  const {
    data: auctionsPage,
    isLoading: loadingAuctions,
  } = useQuery({
    queryKey: ['auctions-sports-hub'],
    queryFn: () => auctionService.getAuctions('LIVE', 0),
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

  const ongoingTournaments = tournamentsPage?.content ?? [];

  // Sport-filter open tournaments by sportName in events
  const openRegistration = useMemo(() => {
    if (!openTournamentsDash) return [];
    if (selectedSport === 'ALL') return openTournamentsDash;
    return openTournamentsDash.filter(t =>
      t.events?.some(ev => (ev.sportName ?? '').toUpperCase() === selectedSport)
    );
  }, [openTournamentsDash, selectedSport]);

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

  // Derived user activity stats
  const activityStats = useMemo(() => {
    const statsList = playerProfile?.stats || playerProfile?.sportStats || [];
    let played = 0;
    let wins = 0;
    let winRate = '0%';
    let rank = playerProfile?.rating ? ('#' + playerProfile.rating) : (playerProfile?.totalTrophies ? ('🏆 ' + playerProfile.totalTrophies) : '#1');

    if (statsList.length > 0) {
      if (selectedSport === 'ALL') {
        played = statsList.reduce((acc, s) => acc + (s.matchesPlayed || s.matches || 0), 0);
        wins = statsList.reduce((acc, s) => acc + (s.wins || 0), 0);
      } else {
        const sportStat = statsList.find(s => (s.sport || '').toUpperCase() === selectedSport);
        if (sportStat) {
          played = sportStat.matchesPlayed || sportStat.matches || 0;
          wins = sportStat.wins || 0;
        }
      }
      if (played > 0) {
        winRate = Math.round((wins / played) * 100) + '%';
      }
    } else if (playerProfile?.totalMatches != null) {
      played = playerProfile.totalMatches;
      wins = playerProfile.totalTrophies || 0;
      if (played > 0) winRate = Math.round((wins / played) * 100) + '%';
    }

    return [
      { label: 'Matches Played', value: String(played), icon: '🏅' },
      { label: 'Wins',           value: String(wins),   icon: '🏆' },
      { label: 'Win Rate',       value: winRate,        icon: '📈' },
      { label: 'Rank / Rating',  value: rank,           icon: '🎖️' },
    ];
  }, [playerProfile, selectedSport]);

  // Live Auctions list
  const activeAuctions = useMemo(() => {
    return auctionsPage?.content?.slice(0, 3) ?? [];
  }, [auctionsPage]);

  // Top performers
  const topPerformers = useMemo(() => {
    if (leaderboard.length > 0) return leaderboard.slice(0, 4);
    return [];
  }, [leaderboard]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
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
            <Text style={s.headerTitle}>🏟️  Sports Arena</Text>
            <Text style={s.headerSub}>Live Fixtures · Court Bookings · Leagues</Text>
          </View>
          <View style={s.headerRight}>
            {filteredLive.length > 0 && (
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.livePillText}>{filteredLive.length} Live</Text>
              </View>
            )}
            {isSportsAdmin && (
              <TouchableOpacity
                style={s.adminDeckBtn}
                onPress={() => router.push('/sports-admin' as any)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Admin Deck"
              >
                <Ionicons name="shield-checkmark" size={13} color="#FBBF24" />
                <Text style={s.adminDeckBtnText}>Admin Deck</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/facilities')} activeOpacity={0.8}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={s.bookBtnText}>Book Court</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ── Sport Filter Pills ── */}
      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {SPORT_FILTERS.map((sp) => {
            const active = selectedSport === sp.id;
            return (
              <TouchableOpacity
                key={sp.id}
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => setSelectedSport(sp.id)}
                activeOpacity={0.75}
              >
                <Text style={s.filterEmoji}>{sp.emoji}</Text>
                <Text style={[s.filterLabel, active && s.filterLabelActive]}>{sp.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >

        {/* ── Hub Actions Grid ── */}
        <View style={s.hubGrid}>
          {visibleHubActions.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={s.hubCard}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.75}
            >
              <View style={[s.hubIcon, { backgroundColor: a.bg }]}>
                <Text style={s.hubEmoji}>{a.emoji}</Text>
              </View>
              <Text style={s.hubLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── My Activity Stats (Real Data) ── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Text style={s.sectionTitle}>My Sports Activity</Text>
              {playerProfile?.fullName && (
                <Text style={s.playerNameTag}>({playerProfile.fullName})</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/leaderboard')}>
              <Text style={s.link}>Leaderboard →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.statsRow}>
            {activityStats.map((stat) => (
              <View key={stat.label} style={s.statTile}>
                <Text style={s.statEmoji}>{stat.icon}</Text>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Court & Amenity Availability (Real Data) ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Ionicons name="flash" size={13} color={COLORS.primary} />
              <Text style={s.sectionTitle}>Court Availability & Venues</Text>
              {sportsFacilities.length > 0 && (
                <Text style={s.countBadge}>{sportsFacilities.length} Courts</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/facilities')}>
              <Text style={s.link}>Book Slot →</Text>
            </TouchableOpacity>
          </View>

          {loadingFacilities ? (
            <ActivityIndicator color={COLORS.primary} size="small" style={{ marginVertical: 8 }} />
          ) : sportsFacilities.length === 0 ? (
            <TouchableOpacity style={s.emptyFacilitiesCard} onPress={() => router.push('/facilities')}>
              <Text style={{ fontSize: 24 }}>🏟️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.emptyTitle}>Explore Community Amenities</Text>
                <Text style={s.emptySubtitle}>Tap to check clubhouse courts, pool, and turf slots</Text>
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
                      <Text style={s.courtSport}>{sportEmoji}</Text>
                      <View style={[s.courtBadge, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={[s.courtBadgeText, { color: '#4F46E5' }]}>Available</Text>
                      </View>
                    </View>
                    <Text style={s.courtName} numberOfLines={1}>{court.name}</Text>
                    <View style={s.row}>
                      <Ionicons name="time-outline" size={10} color={COLORS.textMuted} />
                      <Text style={s.courtSlot} numberOfLines={1}>
                        {court.openTime} - {court.closeTime}
                      </Text>
                    </View>
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

        {/* ── Live Scoreboard ── */}
        {filteredLive.length > 0 && (
          <View style={s.section}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <View style={s.liveDotRed} />
                <Text style={s.sectionTitle}>Live Scoreboard</Text>
                <View style={s.liveTag}>
                  <Text style={s.liveTagText}>{filteredLive.length} LIVE</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/sports/matches')}>
                <Text style={s.link}>View All →</Text>
              </TouchableOpacity>
            </View>
            {filteredLive.map((m: MatchDto) => <ScoreCard key={m.id} match={m} compact />)}
          </View>
        )}

        {/* ── Today's Fixtures (Real Data) ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.text} />
              <Text style={s.sectionTitle}>Today's Fixtures</Text>
              {filteredToday.length > 0 && <Text style={s.countBadge}>{filteredToday.length}</Text>}
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/matches')}>
              <Text style={s.link}>Full Schedule →</Text>
            </TouchableOpacity>
          </View>

          {loadingToday ? (
            <ActivityIndicator color={COLORS.primary} size="small" style={{ marginTop: 8 }} />
          ) : filteredToday.length === 0 ? (
            <View style={s.emptyRow}>
              <Text style={s.emptyRowText}>No fixtures today for {selectedSport === 'ALL' ? 'any sport' : selectedSport} · </Text>
              <TouchableOpacity onPress={() => router.push('/sports/matches')}>
                <Text style={s.link}>+ Schedule Match</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {filteredToday.slice(0, 3).map((m: MatchDto) => <ScoreCard key={m.id} match={m} compact />)}
              {filteredToday.length > 3 && (
                <TouchableOpacity style={s.morePill} onPress={() => router.push('/sports/matches')}>
                  <Text style={s.morePillText}>+{filteredToday.length - 3} more fixtures</Text>
                  <Ionicons name="chevron-forward" size={12} color="#475569" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* ── Active Tournaments ── */}
        {(ongoingTournaments.length > 0 || loadingTournaments) && (
          <View style={s.section}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <View style={s.liveDotOuter}>
                  <View style={s.liveDotInner} />
                </View>
                <Text style={s.sectionTitle}>Active Tournaments</Text>
                {ongoingTournaments.length > 0 && (
                  <View style={s.liveCountBadge}>
                    <Text style={s.liveCountText}>{ongoingTournaments.length} Live</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => router.push('/sports/tournaments')}>
                <Text style={s.link}>All →</Text>
              </TouchableOpacity>
            </View>
            {loadingTournaments ? (
              <ActivityIndicator color={COLORS.primary} size="small" style={{ marginTop: 8 }} />
            ) : (
              <View style={s.tournamentList}>
                {ongoingTournaments.map((t: TournamentDto) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Open Registrations (Sport-grouped, web-style) ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <View style={s.regDot} />
              <Text style={s.sectionTitle}>Open Registrations</Text>
              {openRegistration.length > 0 && (
                <View style={s.regCountBadge}>
                  <Text style={s.regCountText}>{openRegistration.length} Open</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/tournaments')}>
              <Text style={s.link}>View All →</Text>
            </TouchableOpacity>
          </View>

          {loadingUpcoming ? (
            <ActivityIndicator color={COLORS.primary} size="small" style={{ marginTop: 8 }} />
          ) : openRegistration.length === 0 ? (
            <TouchableOpacity
              style={s.regEmptyCard}
              onPress={() => router.push('/sports/tournaments')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={s.regEmptyInner}>
                <Text style={{ fontSize: 28 }}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.regEmptyTitle}>No Open Registrations</Text>
                  <Text style={s.regEmptySubtitle}>Check back soon for upcoming tournaments</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={s.tournamentList}>
              {openRegistration.map((t: DashboardTournamentCardDto) => {
                const isExpanded = expandedTournamentIds.has(t.id);
                // Group events by sportName
                const sportMap = new Map<string, { emoji: string; events: DashboardEventCardDto[] }>();
                (t.events ?? []).forEach(ev => {
                  const sport = ev.sportName ?? 'Other';
                  if (!sportMap.has(sport)) {
                    sportMap.set(sport, {
                      emoji: SPORT_EMOJI_MAP[sport.toUpperCase().replace(/\s/g, '_')] ?? '🏅',
                      events: [],
                    });
                  }
                  sportMap.get(sport)!.events.push(ev);
                });
                const sportEntries = Array.from(sportMap.entries());
                const dateLabel = t.eventDateStart
                  ? new Date(t.eventDateStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  + (t.eventDateEnd ? ` – ${new Date(t.eventDateEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : '')
                  : '';
                const isOpen = (t.registrationStatus ?? '').toUpperCase() === 'REGISTRATION_OPEN';
                return (
                  <View key={t.id} style={s.regTournamentCard}>
                    {/* Tournament header row */}
                    <TouchableOpacity
                      style={s.regTournamentHeader}
                      onPress={() => toggleTournamentExpand(t.id)}
                      activeOpacity={0.8}
                    >
                      <View style={s.regTournamentLeft}>
                        <View style={s.row}>
                          <Text style={s.regTournamentName} numberOfLines={1}>{t.name}</Text>
                          <View style={[s.regStatusPill, isOpen ? s.regStatusOpen : s.regStatusAlmost]}>
                            <View style={[s.regStatusDot, { backgroundColor: isOpen ? '#10B981' : '#6366F1' }]} />
                            <Text style={[s.regStatusText, { color: isOpen ? '#065F46' : '#4F46E5' }]}>
                              {isOpen ? 'Open' : t.registrationStatus ?? 'Register'}
                            </Text>
                          </View>
                        </View>
                        <View style={[s.row, { marginTop: 4, gap: 10 }]}>
                          {dateLabel ? (
                            <View style={s.row}>
                              <Ionicons name="calendar-outline" size={10} color={COLORS.textMuted} />
                              <Text style={s.regTournamentMeta}>{dateLabel}</Text>
                            </View>
                          ) : null}
                          {sportEntries.length > 0 && (
                            <View style={s.row}>
                              <Ionicons name="trophy-outline" size={10} color={COLORS.textMuted} />
                              <Text style={s.regTournamentMeta}>
                                {sportEntries.length} sport{sportEntries.length > 1 ? 's' : ''}
                              </Text>
                            </View>
                          )}
                          {t.communityName && (
                            <Text style={s.regTournamentMeta} numberOfLines={1}>{t.communityName}</Text>
                          )}
                        </View>
                      </View>
                      <View style={s.regExpandBtn}>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={COLORS.primary}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Sport groups (expanded) */}
                    {isExpanded && sportEntries.length > 0 && (
                      <View style={s.regSportGroups}>
                        {sportEntries.map(([sport, { emoji, events: evs }], idx) => {
                          const myReg = evs.find(e => e.myRegistrationId != null);
                          const isRegistered = Boolean(myReg);
                          const isClosed = evs.every(e => (e.registrationStatus ?? '').toUpperCase() !== 'REGISTRATION_OPEN');
                          return (
                            <View key={sport} style={[
                              s.regSportRow,
                              idx < sportEntries.length - 1 && s.regSportRowBorder,
                              isRegistered && s.regSportRowRegistered,
                            ]}>
                              <Text style={s.regSportEmoji}>{emoji}</Text>
                              <View style={s.regSportInfo}>
                                <Text style={s.regSportName}>{sport}</Text>
                                <Text style={s.regSportCats}>
                                  {evs.length} {evs.length === 1 ? 'category' : 'categories'}
                                  {evs.some(e => (e.registeredCount ?? 0) > 0)
                                    ? ` · ${evs.reduce((a, e) => a + (e.registeredCount ?? 0), 0)} registered`
                                    : ''}
                                </Text>
                              </View>
                              {isRegistered ? (
                                <View style={s.regConfirmedChip}>
                                  <Ionicons name="checkmark-circle" size={11} color="#065F46" />
                                  <Text style={s.regConfirmedText}>Registered</Text>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={[s.regSportBtn, isClosed && s.regSportBtnClosed]}
                                  disabled={isClosed}
                                  onPress={() => router.push(`/sports/tournaments`)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[s.regSportBtnText, isClosed && { color: COLORS.textMuted }]}>
                                    {isClosed ? 'Closed' : 'Register'}
                                  </Text>
                                  {!isClosed && <Ionicons name="arrow-forward" size={10} color="#fff" />}
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Tap-to-view-all footer */}
                    <TouchableOpacity
                      style={s.regTournamentFooter}
                      onPress={() => router.push(`/sports/tournaments`)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.regViewDetails}>View tournament details</Text>
                      <Ionicons name="chevron-forward" size={11} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Open Challenges ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Ionicons name="flash-outline" size={13} color="#7C3AED" />
              <Text style={s.sectionTitle}>Community Challenges</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/challenge')}>
              <Text style={s.link}>+ New Challenge →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.challengeGrid}>
            {[
              { name: 'Badminton Singles Match', by: 'Tower A & B Residents', emoji: '🏸', slots: '1v1 Friendly', color: '#7C3AED', bg: '#F5F3FF' },
              { name: 'Box Cricket Tournament',  by: 'Society Sports Committee', emoji: '🏏', slots: '6v6 Box', color: '#2563EB', bg: '#EFF6FF' },
              { name: 'Table Tennis Knockout',   by: 'Clubhouse Wing', emoji: '🏓', slots: '1v1 Knockout', color: '#4F46E5', bg: '#EEF2FF' },
            ].map((ch) => (
              <TouchableOpacity
                key={ch.name}
                style={s.challengeCard}
                activeOpacity={0.8}
                onPress={() => router.push('/sports/challenge')}
              >
                <View style={[s.challengeIcon, { backgroundColor: ch.bg }]}>
                  <Text style={{ fontSize: 18 }}>{ch.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.challengeName}>{ch.name}</Text>
                  <Text style={s.challengeBy}>{ch.by}</Text>
                </View>
                <View style={[s.slotPill, { backgroundColor: ch.bg }]}>
                  <Text style={[s.slotText, { color: ch.color }]}>{ch.slots}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Sports Auction ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Ionicons name="pricetag-outline" size={13} color="#7C3AED" />
              <Text style={s.sectionTitle}>Sports Auction & Players</Text>
              <View style={[s.liveTag, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[s.liveTagText, { color: '#7C3AED' }]}>LIVE</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/auction')}>
              <Text style={s.link}>Auction Portal →</Text>
            </TouchableOpacity>
          </View>

          {activeAuctions.length > 0 ? (
            activeAuctions.map((item: AuctionDto) => (
              <TouchableOpacity
                key={item.id}
                style={s.auctionCard}
                activeOpacity={0.8}
                onPress={() => router.push('/auction')}
              >
                <View style={[s.auctionAvatar, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={{ fontSize: 18 }}>🏆</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.auctionName}>{item.title}</Text>
                  <Text style={s.auctionRole}>
                    {item.category || 'Sports Item'} · Base ₹{item.startingPrice || 0}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[s.auctionBid, { color: '#059669' }]}>
                    ₹{item.currentBid || item.startingPrice || 0}
                  </Text>
                  <Text style={s.auctionBidder}>
                    {item.bidCount || 0} bids
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity style={s.auctionCard} activeOpacity={0.8} onPress={() => router.push('/auction')}>
              <View style={[s.auctionAvatar, { backgroundColor: '#F5F3FF' }]}>
                <Text style={{ fontSize: 18 }}>🏏</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.auctionName}>Season Premier League Bids</Text>
                <Text style={s.auctionRole}>Live bidding for registered players & tournament slots</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={[s.auctionBid, { color: '#7C3AED' }]}>Explore</Text>
                <Text style={s.auctionBidder}>Open</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Top Performers (Real Community Leaderboard) ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Ionicons name="medal-outline" size={13} color="#4F46E5" />
              <Text style={s.sectionTitle}>Top Performers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/leaderboard')}>
              <Text style={s.link}>Full Leaderboard →</Text>
            </TouchableOpacity>
          </View>

          {loadingLeaderboard ? (
            <ActivityIndicator color={COLORS.primary} size="small" style={{ marginVertical: 8 }} />
          ) : topPerformers.length > 0 ? (
            topPerformers.map((p, idx) => {
              const name = p.playerName || p.name || 'Resident Player';
              const flat = p.flatNumber || p.flatNo || p.teamName || 'Mana Athlete';
              return (
                <View key={p.userId || idx} style={s.leaderRow}>
                  <Text style={s.leaderMedal}>{MEDALS[idx] || ('#' + (idx + 1))}</Text>
                  <View style={s.leaderAvatar}>
                    <Text style={s.leaderAvatarText}>{(name)[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.leaderName}>{name}</Text>
                    <Text style={s.leaderFlat}>Flat {flat}</Text>
                  </View>
                  <View style={s.winPill}>
                    <Text style={s.winPillText}>{p.score || p.matchesPlayed || 0} Wins</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <TouchableOpacity
              style={s.emptyLeaderboardRow}
              onPress={() => router.push('/sports/leaderboard')}
            >
              <Text style={s.emptyLeaderboardText}>
                No leaderboard entries yet for this category. Play matches to get ranked!
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── CTA League Banner ── */}
        <TouchableOpacity style={s.ctaBanner} onPress={() => router.push('/sports/tournaments')} activeOpacity={0.88}>
          <LinearGradient
            colors={['#1E1B4B', '#3730A3']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.ctaGradient}
          >
            <View style={{ flex: 1 }}>
              <View style={s.ctaBadge}><Text style={s.ctaBadgeText}>SEASON LEAGUE 2026</Text></View>
              <Text style={s.ctaTitle}>Join or Host Community Tournaments</Text>
              <Text style={s.ctaSub}>Scorecards · Live Commentary · Resident MVPs</Text>
            </View>
            <Text style={{ fontSize: 32 }}>🏆</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

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
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DC2626', borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  livePillText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  bookBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  adminDeckBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(251,191,36,0.22)', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)',
  },
  adminDeckBtnText: { fontSize: 11, fontWeight: '800', color: '#FEF08A' },

  // Filter bar
  filterBar: {
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 7,
  },
  filterScroll: { paddingHorizontal: 14, gap: 6 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, backgroundColor: '#F1F5F9',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#3730A3' },
  filterEmoji: { fontSize: 11 },
  filterLabel: { fontSize: 11, fontWeight: '600', color: '#475569' },
  filterLabelActive: { color: '#fff', fontWeight: '700' },

  // Body
  body: { paddingHorizontal: 14, paddingTop: 14, gap: 14 },
  section: { gap: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm, gap: 10,
  },

  // Utils
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, letterSpacing: -0.1 },
  playerNameTag: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  link: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  hScroll: { gap: 8, paddingVertical: 2 },

  // Hub Actions Grid — 4 per row
  hubGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  hubCard: {
    width: '22%', flexGrow: 1,
    backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 9, paddingHorizontal: 6,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  hubIcon: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  hubEmoji: { fontSize: 18 },
  hubLabel: { fontSize: 10, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  // My Activity Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statTile: { alignItems: 'center', flex: 1, gap: 2 },
  statEmoji: { fontSize: 16 },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  // Court Cards
  courtCard: {
    width: 145, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm, gap: 4,
  },
  courtSport: { fontSize: 18 },
  courtBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5 },
  courtBadgeText: { fontSize: 9, fontWeight: '800' },
  courtName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  courtSlot: { fontSize: 9.5, color: COLORS.textMuted, marginLeft: 2, flexShrink: 1 },
  courtFee: { fontSize: 10, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  courtFeeFree: { fontSize: 10, fontWeight: '700', color: '#4F46E5', marginTop: 2 },

  emptyFacilitiesCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  emptyTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Live
  liveDotRed: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  liveTag: { backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 },
  liveTagText: { fontSize: 8, fontWeight: '800', color: '#DC2626' },
  countBadge: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 1,
    fontSize: 10, fontWeight: '700', color: '#4F46E5',
  },

  // Empty / More
  emptyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  emptyRowText: { fontSize: 12, color: COLORS.textMuted },
  morePill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.sm, paddingVertical: 7,
  },
  morePillText: { fontSize: 11, fontWeight: '700', color: '#475569' },

  // Challenges
  challengeGrid: { gap: 6 },
  challengeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  challengeIcon: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  challengeName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  challengeBy: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  slotPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  slotText: { fontSize: 10, fontWeight: '800' },

  // Auction
  auctionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  auctionAvatar: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  auctionName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  auctionRole: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  auctionBid: { fontSize: 13, fontWeight: '800' },
  auctionBidder: { fontSize: 9, color: COLORS.textMuted },

  // Leaderboard
  leaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  leaderMedal: { fontSize: 16, width: 22 },
  leaderAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  leaderAvatarText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  leaderName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  leaderFlat: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  winPill: { backgroundColor: '#EEF2FF', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  winPillText: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  emptyLeaderboardRow: { paddingVertical: 12, alignItems: 'center' },
  emptyLeaderboardText: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },

  // ── Registration Cards (Playinga-style) ───────────────────────
  // ── Active Tournaments ──────────────────────────────────────────
  liveDotOuter: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  liveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveCountBadge: {
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  liveCountText: { fontSize: 10, fontWeight: '800', color: '#DC2626' },
  tournamentList: { gap: 12 },

  regDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5',
  },
  regCountBadge: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  regCountText: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },
  regScroll: { gap: 10, paddingVertical: 4 },
  regCard: {
    width: 230,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
    gap: 10,
    ...SHADOWS.sm,
  },
  regCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  regSportBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  regSportLabel: { fontSize: 10, fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase' },
  regStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3,
  },
  regStatusOpen: { backgroundColor: '#ECFDF5' },
  regStatusAlmost: { backgroundColor: '#FFFBEB' },
  regStatusFull: { backgroundColor: '#FEF2F2' },
  regStatusDot: { width: 5, height: 5, borderRadius: 3 },
  regStatusText: { fontSize: 9, fontWeight: '800' },
  regCardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, lineHeight: 20 },
  regMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  regMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EEF2FF', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  regMetaText: { fontSize: 9, fontWeight: '700', color: '#4F46E5', textTransform: 'capitalize' },
  regSlots: { gap: 5 },
  regSlotsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  regSlotsLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  regSpotsLeft: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },
  regProgressBg: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
  regProgressFill: { height: 4, borderRadius: 2 },
  regDeadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  regDeadline: { fontSize: 10, color: COLORS.textMuted },
  regCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#4F46E5', borderRadius: RADIUS.md,
    paddingVertical: 9,
  },
  regCTADisabled: { backgroundColor: '#E2E8F0' },
  regCTAText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  regEmptyCard: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  regEmptyInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16,
  },
  regEmptyTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  regEmptySubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // ── Sport-grouped tournament registration cards ──────────────────────
  regTournamentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  regTournamentHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  regTournamentLeft: { flex: 1, gap: 0 },
  regTournamentName: { fontSize: 14, fontWeight: '800', color: COLORS.text, flex: 1, marginRight: 6 },
  regTournamentMeta: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500', marginLeft: 3 },
  regExpandBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  regSportGroups: {
    borderTopWidth: 1, borderTopColor: 'rgba(99,102,241,0.08)',
    backgroundColor: '#FAFBFF',
  },
  regSportRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
  },
  regSportRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.06)' },
  regSportRowRegistered: { backgroundColor: '#F0FDF4' },
  regSportEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  regSportInfo: { flex: 1 },
  regSportName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  regSportCats: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  regSportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  regSportBtnClosed: { backgroundColor: COLORS.surfaceAlt },
  regSportBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  regConfirmedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  regConfirmedText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  regTournamentFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(99,102,241,0.08)',
    paddingVertical: 9,
  },
  regViewDetails: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // ── Per-Category Cards inside sport groups ──────────────────────
  regSportSection: { gap: 6, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
  regSportSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.08)',
    marginBottom: 2,
  },
  regSportCount: {
    backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2,
  },
  regSportCountText: { fontSize: 9, fontWeight: '700', color: '#4F46E5' },

  catCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.10)', gap: 7,
    marginBottom: 6,
  },
  catCardTop: { gap: 5 },
  catCardName: { fontSize: 13, fontWeight: '800', color: COLORS.text, lineHeight: 18 },
  catTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  catTag: {
    backgroundColor: '#EEF2FF', borderRadius: 4, borderWidth: 1, borderColor: '#C7D2FE',
    paddingHorizontal: 6, paddingVertical: 1.5,
  },
  catTagText: { fontSize: 9, fontWeight: '700', color: '#4F46E5' },
  catCapacity: { gap: 3 },
  catCapacityRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catCapacityLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  catCapacityCount: { fontSize: 9, fontWeight: '700', color: '#4F46E5' },
  catProgressBg: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
  catProgressFill: { height: 4, borderRadius: 2 },
  catRegisteredRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', borderRadius: 7, padding: 6 },
  catRegisteredText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  catActionBtn: {
    backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  catActionBtnDisabled: { backgroundColor: '#F1F5F9' },
  catActionBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  catActionBtnTextDisabled: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },

  // CTA Banner
  ctaBanner: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  ctaBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4,
  },
  ctaBadgeText: { fontSize: 8, fontWeight: '800', color: '#A5B4FC', letterSpacing: 0.5 },
  ctaTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  ctaSub: { fontSize: 10, color: '#C7D2FE', marginTop: 2 },
});