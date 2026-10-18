import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sportsService } from '@/services/sportsService';
import { ScoreCard } from '@/components/sports/ScoreCard';
import { SPORT_EMOJI } from '@/components/sports/TournamentCard';
import { COLORS } from '@/constants/config';
import { safeFormat, formatTournamentDateRange } from '@/utils/dateUtils';
import { shareTournament } from '@/utils/sportsShare';
import type { DashboardEventCardDto } from '@/types/api';

const TABS = ['Overview', 'Sports Groups', 'Schedule', 'Standings'] as const;
type Tab = typeof TABS[number];

const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT: 'Knockout', ROUND_ROBIN: 'Round Robin',
  LEAGUE:   'League',   SWISS:       'Swiss',
};

const SPORT_EMOJI_MAP: Record<string, string> = {
  BADMINTON: '🏸', CRICKET: '🏏', FOOTBALL: '⚽', TENNIS: '🎾',
  TABLE_TENNIS: '🏓', PICKLEBALL: '🏓', SWIMMING: '🏊', BASKETBALL: '🏀',
  GYM: '💪', SQUASH: '🎾',
};

// ── Category Card ──────────────────────────────────────────────
function CategoryCard({ ev, onRegister }: { ev: DashboardEventCardDto; onRegister?: (ev: DashboardEventCardDto) => void }) {
  const sportEmoji = SPORT_EMOJI_MAP[(ev.sportName ?? '').toUpperCase().replace(/\s+/g, '_')] ?? '🏅';
  const isOpen = (ev.registrationStatus ?? '').toUpperCase() === 'REGISTRATION_OPEN';
  const isClosed = !isOpen;
  const isRegistered = ev.myRegistrationId != null;
  const max = ev.maxParticipants ?? 0;
  const registered = ev.registeredCount ?? 0;
  const fillRatio = max > 0 ? Math.min(registered / max, 1) : 0;
  const spotsLeft = max > 0 ? Math.max(max - registered, 0) : null;
  const isFilling = fillRatio >= 0.75 && fillRatio < 1;
  const isFull = fillRatio >= 1;

  // Parse gender/age from categoryName pattern like "MEN'S SINGLES 18-35"
  const catUpper = (ev.categoryName ?? '').toUpperCase();
  const genderLabel = catUpper.includes('MEN') && catUpper.includes('WOMEN')
    ? 'Mixed'
    : catUpper.includes('WOMEN') || catUpper.includes('LADIES')
    ? 'Women'
    : catUpper.includes('MEN') || catUpper.includes('GENTS')
    ? 'Men'
    : null;
  const teamSportLabel = ev.teamSport ? 'Team' : catUpper.includes('DOUBLES') ? 'Doubles' : 'Singles';

  return (
    <View style={cat.card}>
      <View style={cat.topRow}>
        <View style={cat.sportBadge}>
          <Text style={cat.sportEmoji}>{sportEmoji}</Text>
          <Text style={cat.sportName} numberOfLines={1}>{ev.sportName ?? 'Sport'}</Text>
        </View>
        {isRegistered ? (
          <View style={cat.registeredChip}>
            <Ionicons name="checkmark-circle" size={11} color="#065F46" />
            <Text style={cat.registeredChipText}>Registered</Text>
          </View>
        ) : isOpen ? (
          <View style={cat.openChip}>
            <View style={cat.openDot} />
            <Text style={cat.openChipText}>Open</Text>
          </View>
        ) : (
          <View style={cat.closedChip}>
            <Text style={cat.closedChipText}>{isFull ? 'Full' : 'Closed'}</Text>
          </View>
        )}
      </View>

      <Text style={cat.catName} numberOfLines={2}>{ev.categoryName ?? ev.name}</Text>

      <View style={cat.tagRow}>
        <View style={cat.tag}><Text style={cat.tagText}>{teamSportLabel}</Text></View>
        {genderLabel && <View style={[cat.tag, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Text style={[cat.tagText, { color: '#065F46' }]}>{genderLabel}</Text>
        </View>}
        {isFilling && !isFull && (
          <View style={[cat.tag, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Text style={[cat.tagText, { color: '#92400E' }]}>⚡ Filling Fast</Text>
          </View>
        )}
      </View>

      {max > 0 && (
        <View style={cat.capacityBlock}>
          <View style={cat.capacityLabelRow}>
            <Text style={cat.capacityLabel}>Capacity</Text>
            <Text style={cat.capacityCount}>
              {registered}/{max}{spotsLeft !== null ? (` · ${spotsLeft} left`) : ''}
            </Text>
          </View>
          <View style={cat.progressBg}>
            <View style={[
              cat.progressFill,
              { width: `${fillRatio * 100}%` as any,
                backgroundColor: isFull ? '#EF4444' : isFilling ? '#F59E0B' : '#4F46E5' }
            ]} />
          </View>
        </View>
      )}

      {isRegistered ? (
        <View style={cat.registeredBanner}>
          <Ionicons name="checkmark-circle" size={14} color="#059669" />
          <Text style={cat.registeredBannerText}>You're registered for this category</Text>
        </View>
      ) : isFull ? (
        <View style={[cat.actionBtn, cat.fullBtn]}>
          <Text style={[cat.actionBtnText, { color: COLORS.textMuted }]}>Category Full</Text>
        </View>
      ) : isOpen && onRegister ? (
        <TouchableOpacity style={cat.actionBtn} onPress={() => onRegister(ev)} activeOpacity={0.8}>
          <Text style={cat.actionBtnText}>Register Now →</Text>
        </TouchableOpacity>
      ) : (
        <View style={[cat.actionBtn, cat.closedBtn]}>
          <Text style={[cat.actionBtnText, { color: COLORS.textMuted }]}>Registration Closed</Text>
        </View>
      )}
    </View>
  );
}

// ── Standings table ────────────────────────────────────────────
function StandingsTable({ tournamentId }: { tournamentId: number }) {
  const { data: standings = [], isLoading } = useQuery({
    queryKey: ['standings', tournamentId],
    queryFn:  () => sportsService.getStandings(tournamentId),
  });

  if (isLoading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />;
  if (standings.length === 0) return (
    <View style={st.empty}><Text style={st.emptyText}>Standings not available yet.</Text></View>
  );

  return (
    <View style={st.wrap}>
      <View style={st.header}>
        <Text style={[st.col, st.pos]}>#</Text>
        <Text style={[st.col, { flex: 1 }]}>Team</Text>
        <Text style={st.col}>P</Text>
        <Text style={st.col}>W</Text>
        <Text style={st.col}>D</Text>
        <Text style={st.col}>L</Text>
        <Text style={[st.col, { fontWeight: '700', color: COLORS.primary }]}>Pts</Text>
      </View>
      {standings.map((row) => (
        <View key={row.teamId} style={[st.row, row.position <= 2 && st.rowHighlight]}>
          <Text style={[st.col, st.pos, row.position <= 2 && { color: COLORS.primary }]}>
            {row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : row.position}
          </Text>
          <View style={[st.col, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <Text style={{ fontSize: 16 }}>{row.teamEmoji}</Text>
            <Text style={st.teamName} numberOfLines={1}>{row.teamName}</Text>
          </View>
          <Text style={st.col}>{row.played}</Text>
          <Text style={st.col}>{row.won}</Text>
          <Text style={st.col}>{row.drawn}</Text>
          <Text style={st.col}>{row.lost}</Text>
          <Text style={[st.col, { fontWeight: '800', color: COLORS.primary }]}>{row.points}</Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  wrap:       { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  header:     { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
  row:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, gap: 4, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  rowHighlight: { backgroundColor: '#F5F3FF' },
  col:        { width: 28, fontSize: 12, color: COLORS.text, textAlign: 'center', fontWeight: '500' },
  pos:        { width: 28, textAlign: 'center' },
  teamName:   { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  empty:      { alignItems: 'center', padding: 32 },
  emptyText:  { color: COLORS.textMuted },
});

// ── Main screen ────────────────────────────────────────────────
export default function TournamentDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const [tab, setTab] = useState<Tab>('Overview');

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn:  () => sportsService.getTournament(Number(id)),
  });

  // Open tournament events/categories from open tournaments API
  const { data: openTournamentsDash = [] } = useQuery({
    queryKey: ['tournaments-open-dash'],
    queryFn: sportsService.getOpenTournaments,
    staleTime: 30_000,
  });

  const dashTournament = openTournamentsDash.find(t => t.id === Number(id));
  const events = dashTournament?.events ?? [];

  // Group events by sport
  const sportGroupsMap = new Map<string, { emoji: string; events: DashboardEventCardDto[] }>();
  events.forEach(ev => {
    const sport = ev.sportName ?? 'Other';
    if (!sportGroupsMap.has(sport)) {
      sportGroupsMap.set(sport, {
        emoji: SPORT_EMOJI_MAP[sport.toUpperCase().replace(/\s+/g, '_')] ?? '🏅',
        events: [],
      });
    }
    sportGroupsMap.get(sport)!.events.push(ev);
  });
  const sportGroups = Array.from(sportGroupsMap.entries());

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['tournament-teams', id],
    queryFn:  () => sportsService.getTeams(Number(id)),
    enabled:  tab === 'Schedule',
  });

  const { data: matchesPage, isLoading: loadingMatches } = useQuery({
    queryKey: ['tournament-matches', id],
    queryFn:  () => sportsService.getMatches(Number(id)),
    enabled:  tab === 'Schedule',
  });
  const matches = matchesPage?.content ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={scr.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!tournament) return null;

  const canRegister = tournament.status === 'REGISTRATION_OPEN' && !tournament.myTeamRegistered;
  const isRegOpen = (dashTournament?.registrationStatus ?? tournament.status ?? '').toUpperCase() === 'REGISTRATION_OPEN';

  const startDateVal = (tournament as any).startDate ?? (tournament as any).eventDateStart;
  const endDateVal = (tournament as any).endDate ?? (tournament as any).eventDateEnd;
  const regDeadlineVal = (tournament as any).registrationDeadline ?? (tournament as any).registrationDateEnd;
  const datesFormatted = formatTournamentDateRange(startDateVal, endDateVal);
  const regDeadlineFormatted = regDeadlineVal ? safeFormat(regDeadlineVal, 'dd MMM, h:mm a') : '';

  const venueStr = typeof tournament.venue === 'object' && tournament.venue !== null
    ? [(tournament.venue as any).name, (tournament.venue as any).area, (tournament.venue as any).city].filter(Boolean).join(', ') || (tournament.venue as any).address || ''
    : typeof tournament.venue === 'string' ? tournament.venue : '';

  const prizesStr = typeof tournament.prizes === 'object' && tournament.prizes !== null
    ? ((tournament.prizes as any).name || (tournament.prizes as any).description || JSON.stringify(tournament.prizes))
    : typeof tournament.prizes === 'string' ? tournament.prizes : '';

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#1E1B4B', '#3730A3', '#4F46E5']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={scr.header}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={scr.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={scr.headerTitle} numberOfLines={1}>{tournament.name}</Text>
        {tournament.myTeamRegistered && (
          <View style={scr.registeredBadge}><Text style={scr.registeredText}>Registered</Text></View>
        )}
        <TouchableOpacity
          onPress={() => shareTournament(tournament)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={scr.headerShareBtn}
          accessibilityLabel="Share tournament"
        >
          <Ionicons name="share-social-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Hero banner */}
      <View style={scr.hero}>
        <Text style={scr.heroEmoji}>{SPORT_EMOJI[tournament.sport] ?? '🏅'}</Text>
        <View style={scr.heroInfo}>
          <Text style={scr.heroName} numberOfLines={2}>{tournament.name}</Text>
          <Text style={scr.heroMeta}>
            {(FORMAT_LABEL[tournament.format] ?? tournament.format ?? 'Tournament')} · {tournament.teamSize != null ? `${tournament.teamSize}v${tournament.teamSize}` : 'Open'}
          </Text>
          <View style={scr.heroMetaRow}>
            {datesFormatted ? (
              <View style={scr.metaChip}>
                <Ionicons name="calendar-outline" size={10} color={COLORS.primary} />
                <Text style={scr.metaChipText}>{datesFormatted}</Text>
              </View>
            ) : null}
            {venueStr ? (
              <View style={scr.metaChip}>
                <Ionicons name="location-outline" size={10} color={COLORS.primary} />
                <Text style={scr.metaChipText} numberOfLines={1}>{venueStr}</Text>
              </View>
            ) : null}
            {isRegOpen && (
              <View style={[scr.metaChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' }} />
                <Text style={[scr.metaChipText, { color: '#065F46' }]}>Registration Open</Text>
              </View>
            )}
          </View>
          <Text style={scr.heroOrg}>By {tournament.organizerName || 'Community'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scr.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[scr.tab, tab === t && scr.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[scr.tabText, tab === t && scr.tabTextActive]}>{t}</Text>
            {t === 'Sports Groups' && events.length > 0 && (
              <View style={scr.tabBadge}>
                <Text style={scr.tabBadgeText}>{events.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={scr.body} showsVerticalScrollIndicator={false}>

        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <View style={scr.section}>
            {/* Highlight stats row */}
            <View style={scr.statsRow}>
              {[
                { icon: '📋', label: 'Format', value: FORMAT_LABEL[tournament.format] ?? tournament.format ?? '—' },
                { icon: '👥', label: 'Team Size', value: tournament.teamSize != null ? `${tournament.teamSize}v${tournament.teamSize}` : 'Open' },
                { icon: '🏟️', label: 'Teams', value: `${tournament.registeredTeamsCount ?? 0}/${tournament.maxTeams ?? '∞'}` },
                { icon: '🏆', label: 'Categories', value: String(events.length > 0 ? events.length : '—') },
              ].map(item => (
                <View key={item.label} style={scr.statCard}>
                  <Text style={scr.statIcon}>{item.icon}</Text>
                  <Text style={scr.statValue} numberOfLines={1}>{item.value}</Text>
                  <Text style={scr.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {tournament.description && (
              <View style={scr.card}>
                <Text style={scr.cardTitle}>About</Text>
                <Text style={scr.desc}>{tournament.description}</Text>
              </View>
            )}
            <View style={scr.card}>
              <Text style={scr.cardTitle}>Details</Text>
              {([
                datesFormatted          ? ['📅 Dates',         datesFormatted]                                         : null,
                ['📋 Format',            FORMAT_LABEL[tournament.format] ?? tournament.format ?? 'Tournament'],
                venueStr               ? ['📍 Venue',          venueStr]                                                : null,
                prizesStr              ? ['🏆 Prizes',         prizesStr]                                               : null,
                regDeadlineFormatted   ? ['⏰ Reg. deadline',  regDeadlineFormatted]                                   : null,
                ['🔢 Registered teams', `${tournament.registeredTeamsCount ?? 0} / ${tournament.maxTeams ?? '∞'}`],
              ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([label, value]) => (
                <View key={label} style={scr.detailRow}>
                  <Text style={scr.detailLabel}>{label}</Text>
                  <Text style={scr.detailValue}>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}</Text>
                </View>
              ))}
            </View>

            {sportGroups.length > 0 && (
              <View style={scr.card}>
                <Text style={scr.cardTitle}>Sports in this Tournament</Text>
                {sportGroups.map(([sport, { emoji, events: evs }]) => (
                  <View key={sport} style={scr.sportRow}>
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={scr.sportRowName}>{sport}</Text>
                      <Text style={scr.sportRowMeta}>{evs.length} {evs.length === 1 ? 'category' : 'categories'}</Text>
                    </View>
                    <View style={scr.sportRowBadge}>
                      <Text style={scr.sportRowBadgeText}>{evs.reduce((a, e) => a + (e.registeredCount ?? 0), 0)} registered</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {tournament.rules && (
              <View style={scr.card}>
                <Text style={scr.cardTitle}>Rules</Text>
                <Text style={scr.desc}>{tournament.rules}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── SPORTS GROUPS ── */}
        {tab === 'Sports Groups' && (
          <View style={scr.section}>
            {events.length === 0 ? (
              <View style={scr.emptyBox}>
                <Text style={{ fontSize: 32 }}>🏆</Text>
                <Text style={scr.emptyText}>No event categories found.</Text>
                <Text style={scr.emptySubText}>Check back once the tournament schedule is published.</Text>
              </View>
            ) : (
              sportGroups.map(([sport, { emoji, events: evs }]) => (
                <View key={sport} style={scr.sportGroup}>
                  <View style={scr.sportGroupHeader}>
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    <Text style={scr.sportGroupTitle}>{sport}</Text>
                    <View style={scr.sportGroupBadge}>
                      <Text style={scr.sportGroupBadgeText}>{evs.length} categories</Text>
                    </View>
                  </View>
                  {evs.map(ev => (
                    <CategoryCard
                      key={ev.id}
                      ev={ev}
                      onRegister={ev.myRegistrationId == null && (ev.registrationStatus ?? '').toUpperCase() === 'REGISTRATION_OPEN'
                        ? () => router.push('/sports/tournaments' as any)
                        : undefined}
                    />
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── SCHEDULE ── */}
        {tab === 'Schedule' && (
          <View style={scr.section}>
            {loadingMatches ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : matches.length === 0 ? (
              <View style={scr.emptyBox}><Text style={scr.emptyText}>No matches scheduled yet.</Text></View>
            ) : (
              matches.map((m) => <ScoreCard key={m.id} match={m} />)
            )}
          </View>
        )}

        {/* ── STANDINGS ── */}
        {tab === 'Standings' && (
          <View style={scr.section}>
            {['KNOCKOUT'].includes(tournament.format) ? (
              <View style={scr.card}>
                <Text style={scr.cardTitle}>Bracket</Text>
                <Text style={scr.desc}>
                  Knockout bracket view is available once the tournament begins and matches are played.
                  Track progress in the Schedule tab.
                </Text>
              </View>
            ) : (
              <StandingsTable tournamentId={Number(id)} />
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Register button */}
      {canRegister && (
        <View style={scr.footer}>
          <TouchableOpacity
            style={scr.registerBtn}
            onPress={() => router.push({ pathname: '/sports/create-team', params: { tournamentId: id } })}
            activeOpacity={0.85}
          >
            <Text style={scr.registerBtnText}>Register Your Team</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Category Card Styles ──────────────────────────────────────
const cat = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.12)', gap: 8,
    marginBottom: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sportBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  sportEmoji: { fontSize: 12 },
  sportName: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },
  registeredChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  registeredChipText: { fontSize: 9, fontWeight: '800', color: '#065F46' },
  openChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  openDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' },
  openChipText: { fontSize: 9, fontWeight: '800', color: '#065F46' },
  closedChip: {
    backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  closedChipText: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  catName: { fontSize: 14, fontWeight: '800', color: COLORS.text, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: '#EEF2FF', borderRadius: 4, borderWidth: 1, borderColor: '#C7D2FE',
    paddingHorizontal: 7, paddingVertical: 2,
  },
  tagText: { fontSize: 9, fontWeight: '700', color: '#4F46E5' },
  capacityBlock: { gap: 4 },
  capacityLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  capacityLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  capacityCount: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },
  progressBg: { height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  registeredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ECFDF5', borderRadius: 8, padding: 8,
  },
  registeredBannerText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  actionBtn: {
    backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  fullBtn: { backgroundColor: '#F1F5F9' },
  closedBtn: { backgroundColor: '#F1F5F9' },
});

// ── Main Screen Styles ────────────────────────────────────────
const scr = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8FAFC' },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  backBtn:        {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  headerShareBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle:    { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1 },
  registeredBadge:{ backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  registeredText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  hero:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: '#EEF2FF', borderBottomWidth: 1, borderBottomColor: '#C7D2FE' },
  heroEmoji:      { fontSize: 36, flexShrink: 0, marginTop: 2 },
  heroInfo:       { flex: 1, gap: 3 },
  heroName:       { fontSize: 16, fontWeight: '800', color: COLORS.text },
  heroMeta:       { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  heroMetaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  metaChip:       {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE',
    paddingHorizontal: 7, paddingVertical: 2.5,
  },
  metaChipText:   { fontSize: 9, fontWeight: '600', color: COLORS.text },
  heroOrg:        { fontSize: 11, color: COLORS.textMuted },

  tabs:           { paddingHorizontal: 12, paddingVertical: 10, gap: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabActive:      { backgroundColor: COLORS.primary },
  tabText:        { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive:  { color: '#fff', fontWeight: '700' },
  tabBadge:       { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText:   { fontSize: 9, fontWeight: '800', color: '#fff' },

  body:           { padding: 14, paddingBottom: 24 },
  section:        { gap: 10 },

  statsRow:       { flexDirection: 'row', gap: 8 },
  statCard:       {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 3,
  },
  statIcon:       { fontSize: 18 },
  statValue:      { fontSize: 13, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  statLabel:      { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  card:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  cardTitle:      { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  desc:           { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel:    { fontSize: 13, color: COLORS.textMuted },
  detailValue:    { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'right' },

  sportRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  sportRowName:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sportRowMeta:   { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  sportRowBadge:  { backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  sportRowBadgeText: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },

  sportGroup:     { gap: 0 },
  sportGroupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8,
  },
  sportGroupTitle:{ fontSize: 14, fontWeight: '800', color: COLORS.text, flex: 1 },
  sportGroupBadge:{ backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  sportGroupBadgeText: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },

  emptyBox:       { alignItems: 'center', padding: 40, gap: 8 },
  emptyText:      { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
  emptySubText:   { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  footer:         { padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  registerBtn:    { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  registerBtnText:{ color: '#fff', fontWeight: '800', fontSize: 16 },
});
