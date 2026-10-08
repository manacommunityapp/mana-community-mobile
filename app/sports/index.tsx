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
import { ScoreCard } from '@/components/sports/ScoreCard';
import { TournamentCard } from '@/components/sports/TournamentCard';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import type { MatchDto, TournamentDto } from '@/types/api';

// ── Data ─────────────────────────────────────────────────────────────
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

const COURT_STATUSES = [
  { id: 'c1', name: 'Badminton 1 & 2', sport: '🏸', status: 'AVAILABLE', statusText: 'Free',    nextSlot: 'Now',    color: '#059669', bg: '#ECFDF5' },
  { id: 'c2', name: 'Cricket Turf',    sport: '🏏', status: 'BUSY',      statusText: 'In Use',  nextSlot: '7:00 PM',color: '#D97706', bg: '#FFFBEB' },
  { id: 'c3', name: 'Pickleball',      sport: '🏓', status: 'AVAILABLE', statusText: 'Free',    nextSlot: 'Now',    color: '#059669', bg: '#ECFDF5' },
  { id: 'c4', name: 'Tennis Clay',     sport: '🎾', status: 'AVAILABLE', statusText: 'Free',    nextSlot: 'Now',    color: '#059669', bg: '#ECFDF5' },
  { id: 'c5', name: 'Swimming Pool',   sport: '🏊', status: 'BUSY',      statusText: 'In Use',  nextSlot: '8:00 PM',color: '#D97706', bg: '#FFFBEB' },
];

const MY_ACTIVITY = [
  { label: 'Matches Played', value: '14', icon: '🏅' },
  { label: 'Wins',           value: '9',  icon: '🏆' },
  { label: 'Win Rate',       value: '64%',icon: '📈' },
  { label: 'Ranking',        value: '#12',icon: '🎖️' },
];

// ── Screen ───────────────────────────────────────────────────────────
export default function SportsHubScreen() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

  const { data: liveMatches = [], isLoading: _loadingLive, refetch, isRefetching } = useQuery({
    queryKey: ['sports-live'],
    queryFn: sportsService.getLiveMatches,
    refetchInterval: 15_000,
  });
  const { data: todayMatches = [], isLoading: loadingToday } = useQuery({
    queryKey: ['sports-today'],
    queryFn: sportsService.getTodayMatches,
    refetchInterval: 60_000,
  });
  const { data: tournamentsPage, isLoading: loadingTournaments } = useQuery({
    queryKey: ['tournaments-hub'],
    queryFn: () => sportsService.getTournaments(undefined, 'ONGOING'),
  });
  const { data: upcoming } = useQuery({
    queryKey: ['tournaments-upcoming'],
    queryFn: () => sportsService.getTournaments(undefined, 'REGISTRATION_OPEN'),
  });

  const ongoingTournaments = tournamentsPage?.content.slice(0, 3) ?? [];
  const openRegistration   = upcoming?.content.slice(0, 3) ?? [];

  const filteredLive = useMemo(() =>
    selectedSport === 'ALL' ? liveMatches : liveMatches.filter((m: MatchDto) => m.sport?.toUpperCase() === selectedSport),
    [liveMatches, selectedSport]);

  const filteredToday = useMemo(() =>
    selectedSport === 'ALL' ? todayMatches : todayMatches.filter((m: MatchDto) => m.sport?.toUpperCase() === selectedSport),
    [todayMatches, selectedSport]);

  const filteredOngoing = useMemo(() =>
    selectedSport === 'ALL' ? ongoingTournaments : ongoingTournaments.filter((t: TournamentDto) => t.sport?.toUpperCase() === selectedSport),
    [ongoingTournaments, selectedSport]);

  const filteredUpcoming = useMemo(() =>
    selectedSport === 'ALL' ? openRegistration : openRegistration.filter((t: TournamentDto) => t.sport?.toUpperCase() === selectedSport),
    [openRegistration, selectedSport]);

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
            <Text style={s.headerSub}>Matches · Courts · Leagues</Text>
          </View>
          <View style={s.headerRight}>
            {liveMatches.length > 0 && (
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.livePillText}>{liveMatches.length} Live</Text>
              </View>
            )}
            <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/facilities')} activeOpacity={0.8}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={s.bookBtnText}>Book</Text>
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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
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

        {/* ── My Activity Stats ── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>My Activity</Text>
            <TouchableOpacity onPress={() => router.push('/sports/leaderboard')}>
              <Text style={s.link}>Full Stats →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.statsRow}>
            {MY_ACTIVITY.map((stat) => (
              <View key={stat.label} style={s.statTile}>
                <Text style={s.statEmoji}>{stat.icon}</Text>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Court Availability ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Ionicons name="flash" size={13} color="#059669" />
              <Text style={s.sectionTitle}>Court Availability</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/facilities')}>
              <Text style={s.link}>Book Slot →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
            {COURT_STATUSES.map((court) => (
              <TouchableOpacity
                key={court.id}
                style={s.courtCard}
                onPress={() => router.push('/facilities')}
                activeOpacity={0.8}
              >
                <View style={s.rowBetween}>
                  <Text style={s.courtSport}>{court.sport}</Text>
                  <View style={[s.courtBadge, { backgroundColor: court.bg }]}>
                    <Text style={[s.courtBadgeText, { color: court.color }]}>{court.statusText}</Text>
                  </View>
                </View>
                <Text style={s.courtName}>{court.name}</Text>
                <View style={s.row}>
                  <Ionicons name="time-outline" size={10} color={COLORS.textMuted} />
                  <Text style={s.courtSlot}>Next: {court.nextSlot}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Live Scoreboard ── */}
        {filteredLive.length > 0 && (
          <View style={s.section}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <View style={s.liveDotRed} />
                <Text style={s.sectionTitle}>Live Scoreboard</Text>
                <View style={s.liveTag}>
                  <Text style={s.liveTagText}>{filteredLive.length} ACTIVE</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/sports/matches')}>
                <Text style={s.link}>View All →</Text>
              </TouchableOpacity>
            </View>
            {filteredLive.map((m: MatchDto) => <ScoreCard key={m.id} match={m} compact />)}
          </View>
        )}

        {/* ── Today's Fixtures ── */}
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
              <Text style={s.emptyRowText}>No fixtures today · </Text>
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
        {(filteredOngoing.length > 0 || loadingTournaments) && (
          <View style={s.section}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <Ionicons name="trophy-outline" size={13} color="#D97706" />
                <Text style={s.sectionTitle}>Active Tournaments</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/sports/tournaments')}>
                <Text style={s.link}>All →</Text>
              </TouchableOpacity>
            </View>
            {loadingTournaments
              ? <ActivityIndicator color="#059669" size="small" style={{ marginTop: 8 }} />
              : filteredOngoing.map((t: TournamentDto) => <TournamentCard key={t.id} tournament={t} compact />)
            }
          </View>
        )}

        {/* ── Open Registrations ── */}
        {filteredUpcoming.length > 0 && (
          <View style={s.section}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <Ionicons name="clipboard-outline" size={13} color="#2563EB" />
                <Text style={s.sectionTitle}>Open Registrations</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/sports/tournaments')}>
                <Text style={s.link}>Register →</Text>
              </TouchableOpacity>
            </View>
            {filteredUpcoming.map((t: TournamentDto) => <TournamentCard key={t.id} tournament={t} compact />)}
          </View>
        )}

        {/* ── Challenges ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Ionicons name="flash-outline" size={13} color="#7C3AED" />
              <Text style={s.sectionTitle}>Open Challenges</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/challenge')}>
              <Text style={s.link}>+ Challenge →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.challengeGrid}>
            {[
              { name: 'Badminton Singles', by: 'Flat 204, Tower B', emoji: '🏸', slots: '1v1', color: '#7C3AED', bg: '#F5F3FF' },
              { name: 'Cricket 5-a-Side',  by: 'Tower C Residents', emoji: '🏏', slots: '5v5', color: '#059669', bg: '#ECFDF5' },
              { name: 'Table Tennis',       by: 'Flat 312, A Wing',  emoji: '🏓', slots: '1v1', color: '#D97706', bg: '#FFFBEB' },
            ].map((ch) => (
              <TouchableOpacity key={ch.name} style={s.challengeCard} activeOpacity={0.8}>
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
              <Text style={s.sectionTitle}>Sports Auction</Text>
              <View style={[s.liveTag, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[s.liveTagText, { color: '#7C3AED' }]}>LIVE</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/auction')}>
              <Text style={s.link}>All Bids →</Text>
            </TouchableOpacity>
          </View>
          {[
            { player: 'Rahul Verma',  role: 'All-Rounder', sport: '🏏', base: '₹500',  topBid: '₹1,200', bidder: 'Team Hawks',   color: '#059669', bg: '#ECFDF5' },
            { player: 'Priya Sharma', role: 'Striker',     sport: '⚽', base: '₹400',  topBid: '₹850',   bidder: 'FC Warriors',  color: '#2563EB', bg: '#EFF6FF' },
            { player: 'Arjun Nair',   role: 'Singles Ace', sport: '🏸', base: '₹600',  topBid: '₹1,500', bidder: 'Smash Bros',   color: '#7C3AED', bg: '#F5F3FF' },
          ].map((item) => (
            <TouchableOpacity key={item.player} style={s.auctionCard} activeOpacity={0.8} onPress={() => router.push('/auction')}>
              <View style={[s.auctionAvatar, { backgroundColor: item.bg }]}>
                <Text style={{ fontSize: 18 }}>{item.sport}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.auctionName}>{item.player}</Text>
                <Text style={s.auctionRole}>{item.role}  ·  Base {item.base}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={[s.auctionBid, { color: item.color }]}>{item.topBid}</Text>
                <Text style={s.auctionBidder}>{item.bidder}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Top Performers ── */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Ionicons name="medal-outline" size={13} color="#D97706" />
              <Text style={s.sectionTitle}>Top Performers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/sports/leaderboard')}>
              <Text style={s.link}>Full Board →</Text>
            </TouchableOpacity>
          </View>
          {[
            { rank: 1, name: 'Rahul Verma',  flat: 'B-204', sport: '🏸', wins: 22, medal: '🥇' },
            { rank: 2, name: 'Priya Sharma', flat: 'A-102', sport: '🏏', wins: 18, medal: '🥈' },
            { rank: 3, name: 'Arjun Nair',   flat: 'C-311', sport: '⚽', wins: 15, medal: '🥉' },
          ].map((p) => (
            <View key={p.rank} style={s.leaderRow}>
              <Text style={s.leaderMedal}>{p.medal}</Text>
              <View style={s.leaderAvatar}>
                <Text style={s.leaderAvatarText}>{p.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.leaderName}>{p.name}</Text>
                <Text style={s.leaderFlat}>{p.flat}  {p.sport}</Text>
              </View>
              <View style={s.winPill}>
                <Text style={s.winPillText}>{p.wins}W</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA Banner ── */}
        <TouchableOpacity style={s.ctaBanner} onPress={() => router.push('/sports/tournaments')} activeOpacity={0.88}>
          <LinearGradient
            colors={['#1E1B4B', '#3730A3']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.ctaGradient}
          >
            <View style={{ flex: 1 }}>
              <View style={s.ctaBadge}><Text style={s.ctaBadgeText}>SEASON CUP 2026</Text></View>
              <Text style={s.ctaTitle}>Host a Community League</Text>
              <Text style={s.ctaSub}>Knockouts · Scorecards · Resident MVPs</Text>
            </View>
            <Text style={{ fontSize: 32 }}>🏆</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
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
    width: 140, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 9,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm, gap: 3,
  },
  courtSport: { fontSize: 16 },
  courtBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5 },
  courtBadgeText: { fontSize: 9, fontWeight: '800' },
  courtName: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  courtSlot: { fontSize: 9, color: COLORS.textMuted, marginLeft: 2 },

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
  leaderMedal: { fontSize: 16, width: 20 },
  leaderAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  leaderAvatarText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  leaderName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  leaderFlat: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  winPill: { backgroundColor: '#ECFDF5', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  winPillText: { fontSize: 11, fontWeight: '800', color: '#059669' },

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
