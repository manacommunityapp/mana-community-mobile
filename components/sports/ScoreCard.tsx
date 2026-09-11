import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import type { MatchDto } from '@/types/api';
import { COLORS } from '@/constants/config';

const SPORT_EMOJI: Record<string, string> = {
  CRICKET: '🏏', FOOTBALL: '⚽', BADMINTON: '🏸',
  TABLE_TENNIS: '🏓', BASKETBALL: '🏀', VOLLEYBALL: '🏐',
  CHESS: '♟️', CARROM: '🎯', OTHER: '🏅',
};

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
  mainScore:    { fontSize: 18, fontWeight: '900', color: COLORS.text },
  sub:          { fontSize: 11, color: COLORS.textMuted },
  vs:           { fontSize: 11, color: COLORS.textMuted, marginVertical: 1 },
  pending:      { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  setsRow:      { flexDirection: 'row', alignItems: 'baseline' },
  setsScore:    { fontSize: 22, fontWeight: '900', color: COLORS.text },
  setsDash:     { fontSize: 18, color: COLORS.textMuted, marginHorizontal: 4 },
  setsSub:      { fontSize: 11, color: COLORS.textMuted },
  genericRow:   { flexDirection: 'row', alignItems: 'center' },
  genericScore: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  genericDash:  { fontSize: 18, color: COLORS.textMuted },
  time:         { fontSize: 16, fontWeight: '700', color: COLORS.primary },
});

interface ScoreCardProps {
  match:    MatchDto;
  compact?: boolean;
}

export function ScoreCard({ match, compact = false }: ScoreCardProps) {
  const router  = useRouter();
  const isLive  = match.status === 'LIVE';
  const isDone  = match.status === 'COMPLETED';
  const homeWon = isDone && match.homeScore > match.awayScore;
  const awayWon = isDone && match.awayScore > match.homeScore;

  return (
    <TouchableOpacity
      style={[c.card, compact && c.cardCompact]}
      onPress={() => router.push(`/sports/match/${match.id}`)}
      activeOpacity={0.85}
    >
      {/* Sport + round meta */}
      <View style={c.meta}>
        <Text style={c.sport}>{SPORT_EMOJI[match.sport]} {match.tournamentName}</Text>
        {match.round && <Text style={c.round}>{match.round}</Text>}
        {isLive && (
          <View style={c.liveBadge}>
            <View style={c.liveDot} />
            <Text style={c.liveText}>LIVE</Text>
            {match.elapsedMinutes != null && (
              <Text style={c.liveMin}> {match.elapsedMinutes}'</Text>
            )}
          </View>
        )}
        {isDone && <Text style={c.doneBadge}>FT</Text>}
      </View>

      {/* Teams + score */}
      <View style={c.body}>
        {/* Home team */}
        <View style={c.teamRow}>
          <Text style={c.teamEmoji}>{match.homeTeamEmoji}</Text>
          <Text style={[c.teamName, homeWon && c.teamWon]} numberOfLines={1}>
            {match.homeTeamName}
          </Text>
          {homeWon && <Text style={c.winnerBadge}>W</Text>}
        </View>

        {/* Score */}
        <View style={c.scoreWrap}>
          <SportScore match={match} />
        </View>

        {/* Away team */}
        <View style={[c.teamRow, { justifyContent: 'flex-end' }]}>
          {awayWon && <Text style={c.winnerBadge}>W</Text>}
          <Text style={[c.teamName, { textAlign: 'right' }, awayWon && c.teamWon]} numberOfLines={1}>
            {match.awayTeamName}
          </Text>
          <Text style={c.teamEmoji}>{match.awayTeamEmoji}</Text>
        </View>
      </View>

      {/* Venue */}
      {match.venue && !compact && (
        <Text style={c.venue} numberOfLines={1}>📍 {match.venue}</Text>
      )}
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card:        { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  cardCompact: { padding: 10 },
  meta:        { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sport:       { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', flex: 1 },
  round:       { fontSize: 11, color: COLORS.textMuted, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  liveBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.error },
  liveText:    { fontSize: 10, fontWeight: '800', color: COLORS.error, letterSpacing: 0.5 },
  liveMin:     { fontSize: 10, color: COLORS.error, fontWeight: '600' },
  doneBadge:   { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  body:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamRow:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamEmoji:   { fontSize: 22 },
  teamName:    { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  teamWon:     { color: COLORS.success, fontWeight: '800' },
  winnerBadge: { fontSize: 10, fontWeight: '800', color: COLORS.success, backgroundColor: '#D1FAE5', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  scoreWrap:   { alignItems: 'center', minWidth: 60 },
  venue:       { fontSize: 11, color: COLORS.textMuted },
});
