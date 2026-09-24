import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import type { MatchDto } from '@/types/api';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { Ionicons } from '@expo/vector-icons';

const SPORT_EMOJI: Record<string, string> = {
  CRICKET: '🏏', FOOTBALL: '⚽', BADMINTON: '🏸',
  TABLE_TENNIS: '🏓', BASKETBALL: '🏀', VOLLEYBALL: '🏐',
  CHESS: '♟️', CARROM: '🎯', OTHER: '🏅',
};

// ── Sport color accent per sport type ────────────────────────────────────────
const SPORT_COLOR: Record<string, string> = {
  CRICKET:      '#059669', // emerald
  FOOTBALL:     '#2563EB', // blue
  BADMINTON:    '#7C3AED', // violet
  TABLE_TENNIS: '#D97706', // amber
  BASKETBALL:   '#DC2626', // red
  VOLLEYBALL:   '#0891B2', // cyan
  CHESS:        '#374151', // gray-dark
  CARROM:       '#EA580C', // orange
  OTHER:        COLORS.primary,
};

// ── Score display ─────────────────────────────────────────────────────────────
function SportScore({ match }: { match: MatchDto }) {
  const sport = match.sport;

  if (sport === 'CRICKET' && match.status !== 'SCHEDULED') {
    return (
      <View style={ss.wrap}>
        <Text style={ss.mainScore}>{match.homeScore}/{match.homeWickets ?? 0}</Text>
        {match.homeOvers && <Text style={ss.sub}>({match.homeOvers} ov)</Text>}
        <Text style={ss.vs}>vs</Text>
        {match.status === 'COMPLETED' ? (
          <>
            <Text style={ss.mainScore}>{match.awayScore}/{match.awayWickets ?? 0}</Text>
            {match.awayOvers && <Text style={ss.sub}>({match.awayOvers} ov)</Text>}
          </>
        ) : (
          <Text style={ss.pending}>Yet to bat</Text>
        )}
      </View>
    );
  }

  if ((sport === 'BADMINTON' || sport === 'TABLE_TENNIS') && match.status !== 'SCHEDULED') {
    return (
      <View style={ss.setsRow}>
        <Text style={ss.setsScore}>{match.homeSetsWon ?? 0}</Text>
        <Text style={ss.setsDash}>–</Text>
        <Text style={ss.setsScore}>{match.awaySetsWon ?? 0}</Text>
        <Text style={ss.setsSub}> sets</Text>
      </View>
    );
  }

  if (match.status === 'SCHEDULED') {
    return <Text style={ss.time}>{format(new Date(match.scheduledAt), 'h:mm a')}</Text>;
  }

  return (
    <View style={ss.genericRow}>
      <Text style={ss.genericScore}>{match.homeScore}</Text>
      <Text style={ss.genericDash}> – </Text>
      <Text style={ss.genericScore}>{match.awayScore}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  wrap:         { alignItems: 'center', gap: 0 },
  mainScore:    { fontSize: 20, fontWeight: '900', color: COLORS.text },
  sub:          { fontSize: 11, color: COLORS.textMuted },
  vs:           { fontSize: 11, color: COLORS.textMuted, marginVertical: 1 },
  pending:      { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  setsRow:      { flexDirection: 'row', alignItems: 'baseline' },
  setsScore:    { fontSize: 24, fontWeight: '900', color: COLORS.text },
  setsDash:     { fontSize: 18, color: COLORS.textMuted, marginHorizontal: 4 },
  setsSub:      { fontSize: 11, color: COLORS.textMuted },
  genericRow:   { flexDirection: 'row', alignItems: 'center' },
  genericScore: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  genericDash:  { fontSize: 18, color: COLORS.textMuted },
  time:         { fontSize: 17, fontWeight: '800', color: COLORS.primary },
});

// ── Pulsing live dot ──────────────────────────────────────────────────────────
function PulsingDot() {
  const pulse = new Animated.Value(1);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
      <Animated.View style={[c.livePulseRing, { transform: [{ scale: pulse }] }]} />
      <View style={c.liveDot} />
    </View>
  );
}

// ── ScoreCard ─────────────────────────────────────────────────────────────────
interface ScoreCardProps {
  match:    MatchDto;
  compact?: boolean;
}

export function ScoreCard({ match, compact = false }: ScoreCardProps) {
  const router    = useRouter();
  const isLive    = match.status === 'LIVE';
  const isDone    = match.status === 'COMPLETED';
  const isSetBased = match.sport === 'BADMINTON' || match.sport === 'TABLE_TENNIS';
  const homeWon   = isDone && (
    isSetBased
      ? (match.homeSetsWon ?? 0) > (match.awaySetsWon ?? 0)
      : match.homeScore > match.awayScore
  );
  const awayWon   = isDone && (
    isSetBased
      ? (match.awaySetsWon ?? 0) > (match.homeSetsWon ?? 0)
      : match.awayScore > match.homeScore
  );

  const sportColor = SPORT_COLOR[match.sport] ?? COLORS.primary;

  return (
    <TouchableOpacity
      style={[c.card, isLive && c.cardLive]}
      onPress={() => router.push(`/sports/match/${match.id}`)}
      activeOpacity={0.82}
    >
      {/* Sport color accent bar at top */}
      <View style={[c.topBar, { backgroundColor: sportColor }]} />

      {/* Meta row: sport emoji + tournament + status badge */}
      <View style={c.meta}>
        <Text style={c.sportEmoji}>{SPORT_EMOJI[match.sport]}</Text>
        <Text style={c.tournamentName} numberOfLines={1}>{match.tournamentName}</Text>
        {match.round && (
          <View style={c.roundChip}>
            <Text style={c.roundText}>{match.round}</Text>
          </View>
        )}
        {isLive && (
          <View style={c.liveBadge}>
            <PulsingDot />
            <Text style={c.liveText}>LIVE</Text>
            {match.elapsedMinutes != null && (
              <Text style={c.liveMin}>{match.elapsedMinutes}'</Text>
            )}
          </View>
        )}
        {isDone && (
          <View style={c.doneBadge}>
            <Ionicons name="checkmark-circle" size={11} color={COLORS.textMuted} />
            <Text style={c.doneText}>FT</Text>
          </View>
        )}
      </View>

      {/* Teams + Score */}
      <View style={c.body}>
        {/* Home team */}
        <View style={c.teamSide}>
          <View style={c.teamEmojiCircle}>
            <Text style={c.teamEmoji}>{match.homeTeamEmoji || '🏠'}</Text>
          </View>
          <Text style={[c.teamName, homeWon && c.teamWon]} numberOfLines={2}>
            {match.homeTeamName}
          </Text>
          {homeWon && (
            <View style={c.winnerChip}>
              <Ionicons name="trophy" size={9} color="#065F46" />
              <Text style={c.winnerText}>WON</Text>
            </View>
          )}
        </View>

        {/* Score */}
        <View style={c.scoreBox}>
          <SportScore match={match} />
        </View>

        {/* Away team */}
        <View style={[c.teamSide, c.teamSideRight]}>
          <View style={c.teamEmojiCircle}>
            <Text style={c.teamEmoji}>{match.awayTeamEmoji || '🏃'}</Text>
          </View>
          <Text style={[c.teamName, { textAlign: 'right' }, awayWon && c.teamWon]} numberOfLines={2}>
            {match.awayTeamName}
          </Text>
          {awayWon && (
            <View style={c.winnerChip}>
              <Ionicons name="trophy" size={9} color="#065F46" />
              <Text style={c.winnerText}>WON</Text>
            </View>
          )}
        </View>
      </View>

      {/* Venue */}
      {match.venue && !compact && (
        <View style={c.venueRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={c.venue} numberOfLines={1}>{match.venue}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardLive: {
    borderColor: '#FECACA',
    ...SHADOWS.md,
  },
  topBar: {
    height: 3.5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 4,
    flexWrap: 'wrap',
  },
  sportEmoji:     { fontSize: 14 },
  tournamentName: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', flex: 1 },
  roundChip: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roundText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  liveDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.error, position: 'absolute' },
  livePulseRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FCA5A5',
    opacity: 0.5,
    position: 'absolute',
  },
  liveText:  { fontSize: 10.5, fontWeight: '800', color: COLORS.error, letterSpacing: 0.5 },
  liveMin:   { fontSize: 10.5, color: COLORS.error, fontWeight: '700' },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  doneText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  // Teams & score
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  teamSide: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  teamSideRight: {
    alignItems: 'flex-end',
  },
  teamEmojiCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  teamEmoji: { fontSize: 20 },
  teamName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.text,
  },
  teamWon: { color: COLORS.success },
  winnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  winnerText: { fontSize: 9, fontWeight: '800', color: '#065F46', letterSpacing: 0.5 },
  scoreBox: {
    alignItems: 'center',
    minWidth: 70,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingBottom: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  venue: { fontSize: 11, color: COLORS.textMuted, flex: 1 },
});
