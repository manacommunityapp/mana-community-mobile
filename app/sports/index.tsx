import React, { useState, useMemo } from 'react';
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
import type { MatchDto, TournamentDto, PlayerProfileDto, LeaderboardEntryDto, AuctionDto, SportType } from '@/types/api';

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
  { id: 'book',        emoji: '🏸', label: 'Book Court',   color: '#059669', bg: '#ECFDF5', route: '/facilities' },
  { id: 'tournament',  emoji: '🏆', label: 'Tournaments',  color: '#D97706', bg: '#FFFBEB', route: '/sports/tournaments' },
  { id: 'match',       emoji: '⚔️', label: 'Find Match',   color: '#2563EB', bg: '#EFF6FF', route: '/sports/matches' },
  { id: 'livescore',   emoji: '📺', label: 'Live Scores',  color: '#DC2626', bg: '#FEF2F2', route: '/sports/matches' },
  { id: 'squad',       emoji: '👥', label: 'My Squads',    color: '#7C3AED', bg: '#F5F3FF', route: '/sports/my-teams' },
  { id: 'standings',   emoji: '📊', label: 'Standings',    color: '#0891B2', bg: '#CFFAFE', route: '/sports/leaderboard' },
  { id: 'challenge',   emoji: '🎯', label: 'Challenge',    color: '#EA580C', bg: '#FFF7ED', route: '/sports/challenge' },
  { id: 'auction',     emoji: '🏷️', label: 'Auction',      color: '#7C3AED', bg: '#F5F3FF', route: '/auction' },
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
  const { user } = useAuth();
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

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

  // 4. Open Registration Tournaments
  const {
    data: upcomingTournaments,
    isLoading: loadingUpcoming,
  } = useQuery({
    queryKey: ['tournaments-upcoming', selectedSport],
    queryFn: () => sportsService.getTournaments(selectedSport === 'ALL' ? undefined : (selectedSport as SportType), 'REGISTRATION_OPEN'),
  });

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
  const openRegistration = upcomingTournaments?.content ?? [];

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
        colors={['#064E3B', '#065F46', '#047857']}
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
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#059669" />}
      >

        {/* ── Hub Actions Grid ── */}
        <View style={s.hubGrid}>
          {HUB_ACTIONS.map((a) => (
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
              <Ionicons name="flash" size={13} color="#059669" />
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
            <ActivityIndicator color="#059669" size="small" style={{ marginVertical: 8 }} />
          ) : sportsFacilities.length === 0 ? (
            <TouchableOpacity style={s.emptyFacilitiesCard} onPress={() => router.push('/facilities')}>
              <Text style={{ fontSize: 24 }}>🏟️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.emptyTitle}>Explore Community Amenities</Text>
                <Text style={s.emptySubtitle}>Tap to check clubhouse courts, pool, and turf slots</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#059669" />
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
                      <View style={[s.courtBadge, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={[s.courtBadgeText, { color: '#059669' }]}>Available</Text>
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
            <ActivityIndicator color="#059669" size="small" style={{ marginTop: 8 }} />
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

        {/* ── Active Tournaments (Real Data) ── */}
        {(ongoingTournaments.length > 0 || loadingTournaments) && (
          <View style={s.section}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <Ionicons name="trophy-outline" size={13} color="#D97706" />
                <Text style={s.sectionTitle}>Active Tournaments</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/sports/tournaments')}>
                <Text style={s.link}>All Tournaments →</Text>
              </TouchableOpacity>
            </View>
            {loadingTournaments
              ? <ActivityIndicator color="#059669" size="small" style={{ marginTop: 8 }} />
              : ongoingTournaments.map((t: TournamentDto) => <TournamentCard key={t.id} tournament={t} compact />)
            }
          </View>
        )}

        {/* ── Open Registrations (Real Data) ── */}
        {openRegistration.length > 0 && (
          <View style={s.section}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <Ionicons name="clipboard-outline" size={13} color="#2563EB" />
                <Text style={s.sectionTitle}>Open Registrations</Text>
                <Text style={s.countBadge}>{openRegistration.length}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/sports/tournaments')}>
                <Text style={s.link}>Register →</Text>
              </TouchableOpacity>
            </View>
            {openRegistration.map((t: TournamentDto) => <TournamentCard key={t.id} tournament={t} compact />)}
          </View>
        )}

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
              { name: 'Box Cricket Tournament',  by: 'Society Sports Committee', emoji: '🏏', slots: '6v6 Box', color: '#059669', bg: '#ECFDF5' },
              { name: 'Table Tennis Knockout',   by: 'Clubhouse Wing', emoji: '🏓', slots: '1v1 Knockout', color: '#D97706', bg: '#FFFBEB' },
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
              <Ionicons name="medal-outline" size={13} color="#D97706" />
              <Text style={s.sectionTitle}>Top Performers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/leaderboard')}>
              <Text style={s.link}>Full Leaderboard →</Text>
            </TouchableOpacity>
          </View>

          {loadingLeaderboard ? (
            <ActivityIndicator color="#059669" size="small" style={{ marginVertical: 8 }} />
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
  headerSub: { fontSize: 10, color: '#A7F3D0', marginTop: 1 },
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
  filterChipActive: { backgroundColor: '#059669', borderColor: '#047857' },
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
  link: { fontSize: 11, fontWeight: '700', color: '#059669' },
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
  courtFeeFree: { fontSize: 10, fontWeight: '700', color: '#059669', marginTop: 2 },

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
  winPill: { backgroundColor: '#ECFDF5', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  winPillText: { fontSize: 11, fontWeight: '800', color: '#059669' },
  emptyLeaderboardRow: { paddingVertical: 12, alignItems: 'center' },
  emptyLeaderboardText: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },

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