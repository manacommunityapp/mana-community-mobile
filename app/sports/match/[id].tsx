import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  ActivityIndicator, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLiveScore } from '@/hooks/useLiveScore';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';
import { format, formatDistanceToNow } from 'date-fns';
import type { MatchDto, MatchEventDto } from '@/types/api';

const SPORT_EMOJI: Record<string, string> = {
  CRICKET:'🏏', FOOTBALL:'⚽', BADMINTON:'🏸', TABLE_TENNIS:'🏓',
  BASKETBALL:'🏀', VOLLEYBALL:'🏐', CHESS:'♟️', CARROM:'🎯', OTHER:'🏅',
};

const EVENT_ICON: Record<string, string> = {
  GOAL:        '⚽', WICKET:    '🏏', POINT:  '🎯',
  CARD:        '🟨', SET_WON:   '🏆', HALF_TIME: '⏱',
  FULL_TIME:   '🏁', COMMENTARY:'💬',
};

// ── Sport-specific scoreboard ──────────────────────────────────
function Scoreboard({ match }: { match: MatchDto }) {
  const sport = match.sport;
  const isLive = match.status === 'LIVE';
  const isDone = match.status === 'COMPLETED';

  if (sport === 'CRICKET') {
    return (
      <View style={sb.cricketWrap}>
        {/* Home batting */}
        <View style={sb.inning}>
          <Text style={sb.inningTeam}>{match.homeTeamEmoji} {match.homeTeamName}</Text>
          <Text style={sb.runs}>
            {match.homeScore}/{match.homeWickets ?? 0}
            {match.homeOvers ? <Text style={sb.overs}> ({match.homeOvers} ov)</Text> : null}
          </Text>
        </View>
        <View style={sb.divider} />
        {/* Away */}
        <View style={sb.inning}>
          <Text style={sb.inningTeam}>{match.awayTeamEmoji} {match.awayTeamName}</Text>
          {isDone || match.awayOvers ? (
            <Text style={sb.runs}>
              {match.awayScore}/{match.awayWickets ?? 0}
              {match.awayOvers ? <Text style={sb.overs}> ({match.awayOvers} ov)</Text> : null}
            </Text>
          ) : (
            <Text style={sb.pending}>Yet to bat</Text>
          )}
        </View>
      </View>
    );
  }

  if (sport === 'BADMINTON' || sport === 'TABLE_TENNIS') {
    return (
      <View style={sb.setsWrap}>
        <View style={sb.setsTeamCol}>
          <Text style={sb.setsTeam}>{match.homeTeamEmoji} {match.homeTeamName}</Text>
          <Text style={sb.setsTeam}>{match.awayTeamEmoji} {match.awayTeamName}</Text>
        </View>
        <View style={sb.setsScoreCol}>
          <Text style={[sb.setsScore, match.homeSetsWon! > match.awaySetsWon! && sb.setsWinner]}>
            {match.homeSetsWon ?? 0}
          </Text>
          <Text style={[sb.setsScore, match.awaySetsWon! > match.homeSetsWon! && sb.setsWinner]}>
            {match.awaySetsWon ?? 0}
          </Text>
        </View>
        {isLive && (
          <View style={sb.setsGameCol}>
            <Text style={sb.gameScore}>{match.homeScore}</Text>
            <Text style={sb.gameScore}>{match.awayScore}</Text>
            <Text style={sb.gameLabel}>Current{'\n'}game</Text>
          </View>
        )}
      </View>
    );
  }

  // Generic: football, basketball, volleyball, etc.
  return (
    <View style={sb.genericWrap}>
      <View style={sb.teamBlock}>
        <Text style={sb.bigEmoji}>{match.homeTeamEmoji}</Text>
        <Text style={sb.teamLabel} numberOfLines={2}>{match.homeTeamName}</Text>
      </View>
      <View style={sb.scoreBlock}>
        <Text style={sb.bigScore}>{match.homeScore}</Text>
        <Text style={sb.scoreDash}>–</Text>
        <Text style={sb.bigScore}>{match.awayScore}</Text>
      </View>
      <View style={sb.teamBlock}>
        <Text style={sb.bigEmoji}>{match.awayTeamEmoji}</Text>
        <Text style={sb.teamLabel} numberOfLines={2}>{match.awayTeamName}</Text>
      </View>
    </View>
  );
}

const sb = StyleSheet.create({
  // Cricket
  cricketWrap:  { gap: 10 },
  inning:       { gap: 2 },
  inningTeam:   { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  runs:         { fontSize: 36, fontWeight: '900', color: COLORS.text },
  overs:        { fontSize: 14, color: COLORS.textMuted, fontWeight: '400' },
  pending:      { fontSize: 16, color: COLORS.textMuted, fontStyle: 'italic' },
  divider:      { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  // Badminton / TT
  setsWrap:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
  setsTeamCol:  { flex: 1, gap: 10 },
  setsTeam:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  setsScoreCol: { alignItems: 'center', gap: 10 },
  setsScore:    { fontSize: 32, fontWeight: '900', color: COLORS.textMuted, width: 44, textAlign: 'center' },
  setsWinner:   { color: COLORS.primary },
  setsGameCol:  { alignItems: 'center', gap: 0, backgroundColor: '#EEF2FF', borderRadius: 10, padding: 8 },
  gameScore:    { fontSize: 22, fontWeight: '800', color: COLORS.primary, lineHeight: 28 },
  gameLabel:    { fontSize: 9, color: COLORS.primary, textAlign: 'center', marginTop: 4 },
  // Generic
  genericWrap:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamBlock:    { flex: 1, alignItems: 'center', gap: 6 },
  bigEmoji:     { fontSize: 40 },
  teamLabel:    { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  scoreBlock:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  bigScore:     { fontSize: 48, fontWeight: '900', color: COLORS.text },
  scoreDash:    { fontSize: 32, color: COLORS.textMuted },
});

// ── Event row ──────────────────────────────────────────────────
function EventRow({ ev }: { ev: MatchEventDto }) {
  return (
    <View style={er.row}>
      <Text style={er.icon}>{EVENT_ICON[ev.type] ?? '•'}</Text>
      <View style={er.body}>
        <Text style={er.desc}>{ev.description}</Text>
        {ev.playerName && <Text style={er.player}>{ev.playerName}</Text>}
      </View>
      <Text style={er.time}>
        {ev.minute != null ? `${ev.minute}'` : ev.over ?? format(new Date(ev.timestamp), 'h:mm a')}
      </Text>
    </View>
  );
}

const er = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9, paddingHorizontal: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  icon:   { fontSize: 18, width: 24, textAlign: 'center', marginTop: 1 },
  body:   { flex: 1, gap: 1 },
  desc:   { fontSize: 14, color: COLORS.text, lineHeight: 19 },
  player: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  time:   { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', minWidth: 38, textAlign: 'right' },
});

// ── Main screen ────────────────────────────────────────────────
export default function LiveMatchScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const feedRef   = useRef<FlatList<MatchEventDto>>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const { match, events, isLoading, connected, matchEnded } = useLiveScore(Number(id));

  const prevEventsLen = useRef(0);

  // Flash on new events
  useEffect(() => {
    if (events.length > prevEventsLen.current) {
      prevEventsLen.current = events.length;
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      feedRef.current?.scrollToEnd({ animated: true });
    }
  }, [events.length]);

  if (isLoading) {
    return (
      <SafeAreaView style={scr.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }
  if (!match) return null;

  const isLive  = match.status === 'LIVE';
  const isDone  = match.status === 'COMPLETED';

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      {/* Top bar */}
      <View style={scr.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={scr.back}>‹</Text>
        </TouchableOpacity>
        <View style={scr.topMid}>
          <Text style={scr.sport}>{SPORT_EMOJI[match.sport]} {match.tournamentName}</Text>
          {match.round && <Text style={scr.round}>{match.round}</Text>}
        </View>
        {isLive && (
          <View style={scr.liveBadge}>
            <View style={scr.liveDot} />
            <Text style={scr.liveText}>LIVE</Text>
            {!connected && <Text style={scr.reconnect}> ·Reconnecting</Text>}
          </View>
        )}
        {isDone && <Text style={scr.doneBadge}>FT</Text>}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Scoreboard */}
        <View style={scr.scoreSection}>
          {/* Period / time */}
          {isLive && match.currentPeriod && (
            <Text style={scr.period}>
              {match.currentPeriod}
              {match.elapsedMinutes != null ? ` · ${match.elapsedMinutes}'` : ''}
            </Text>
          )}
          {match.status === 'SCHEDULED' && (
            <Text style={scr.scheduledTime}>
              {format(new Date(match.scheduledAt), 'EEE, dd MMM · h:mm a')}
            </Text>
          )}
          {match.venue && (
            <Text style={scr.venue}>📍 {match.venue}</Text>
          )}

          <Animated.View style={[scr.scoreboard, { opacity: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }]}>
            <Scoreboard match={match} />
          </Animated.View>

          {isDone && (
            <View style={scr.resultBanner}>
              <Text style={scr.resultText}>
                {match.homeScore > match.awayScore
                  ? `${match.homeTeamName} won!`
                  : match.awayScore > match.homeScore
                  ? `${match.awayTeamName} won!`
                  : 'Match drawn!'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Event feed header — sticky */}
        <View style={scr.feedHeader}>
          <Text style={scr.feedTitle}>
            {isLive ? '🔴 Live Commentary' : 'Match Events'}
          </Text>
          <Text style={scr.feedCount}>{events.length} events</Text>
        </View>

        {/* Events */}
        {events.length === 0 ? (
          <View style={scr.noEvents}>
            <Text style={scr.noEventsText}>
              {isLive ? 'Match has started. Events will appear here.' : 'No events recorded.'}
            </Text>
          </View>
        ) : (
          [...events].reverse().map((ev) => <EventRow key={ev.id} ev={ev} />)
        )}

        {/* Scheduled info */}
        {match.status === 'SCHEDULED' && (
          <View style={scr.scheduledCard}>
            <Text style={scr.scheduledEmoji}>⏰</Text>
            <Text style={scr.scheduledTitle}>Match not started yet</Text>
            <Text style={scr.scheduledSub}>
              Scheduled for {format(new Date(match.scheduledAt), 'EEEE, dd MMMM · h:mm a')}
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:           { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  topMid:         { flex: 1, gap: 1 },
  sport:          { fontSize: 13, fontWeight: '600', color: COLORS.text },
  round:          { fontSize: 11, color: COLORS.textMuted },
  liveBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.error },
  liveText:       { fontSize: 11, fontWeight: '800', color: COLORS.error },
  reconnect:      { fontSize: 10, color: COLORS.textMuted },
  doneBadge:      { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  scoreSection:   { backgroundColor: COLORS.surface, padding: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  period:         { fontSize: 13, fontWeight: '700', color: COLORS.error, textAlign: 'center', letterSpacing: 0.5 },
  scheduledTime:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  venue:          { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  scoreboard:     { paddingVertical: 8 },
  resultBanner:   { backgroundColor: '#EEF2FF', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  resultText:     { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  feedHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  feedTitle:      { fontSize: 14, fontWeight: '700', color: COLORS.text },
  feedCount:      { fontSize: 12, color: COLORS.textMuted },
  noEvents:       { padding: 32, alignItems: 'center' },
  noEventsText:   { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  scheduledCard:  { alignItems: 'center', padding: 40, gap: 10 },
  scheduledEmoji: { fontSize: 48 },
  scheduledTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  scheduledSub:   { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
