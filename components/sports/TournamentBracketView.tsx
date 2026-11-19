import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import type { MatchDto } from '@/types/api';

interface Props {
  tournamentId: number;
  matches: MatchDto[];
  loading?: boolean;
}

interface BracketMatch {
  id: string | number;
  roundName: string;
  roundIndex: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | string;
  awayScore?: number | string;
  winner?: 'HOME' | 'AWAY' | null;
  status: string;
  matchDate?: string;
  matchTime?: string;
  courtName?: string;
}

const ROUND_ORDER: Record<string, number> = {
  'ROUND OF 64': 1,
  'ROUND OF 32': 2,
  'ROUND OF 16': 3,
  'PRE-QUARTER': 3,
  'QUARTER FINAL': 4,
  'QUARTER-FINAL': 4,
  'QUARTERFINAL': 4,
  'SEMI FINAL': 5,
  'SEMI-FINAL': 5,
  'SEMIFINAL': 5,
  'FINAL': 6,
  'FINALS': 6,
  'THIRD PLACE': 7,
};

export function TournamentBracketView({ tournamentId, matches, loading }: Props) {
  const router = useRouter();

  // Deduce or group matches into rounds
  const rounds = useMemo(() => {
    const roundMap: Record<string, BracketMatch[]> = {};

    matches.forEach((item, idx) => {
      const m = item as any;
      const stage = (m.round || m.stage || '').toUpperCase().trim();
      let matchedRound = 'ROUND OF 16';
      for (const key of Object.keys(ROUND_ORDER)) {
        if (stage.includes(key)) {
          matchedRound = key;
          break;
        }
      }
      if (!stage) {
        // Fallback round estimation by index
        matchedRound = idx < 4 ? 'QUARTER FINAL' : idx < 6 ? 'SEMI FINAL' : 'FINAL';
      }

      if (!roundMap[matchedRound]) {
        roundMap[matchedRound] = [];
      }

      const homeName = m.homeTeamName || m.teamA?.name || m.teamAName || m.playerAName || 'TBD';
      const awayName = m.awayTeamName || m.teamB?.name || m.teamBName || m.playerBName || 'BYE';
      const homeScore = m.homeScore ?? m.teamAScore ?? m.scoreA ?? undefined;
      const awayScore = m.awayScore ?? m.teamBScore ?? m.scoreB ?? undefined;

      let winner: 'HOME' | 'AWAY' | null = null;
      if (m.winnerTeamName) {
        if (m.winnerTeamName === homeName) winner = 'HOME';
        else if (m.winnerTeamName === awayName) winner = 'AWAY';
      } else if (m.winnerId) {
        if (String(m.winnerId) === String(m.homeTeamId || m.teamA?.id || m.teamAId)) winner = 'HOME';
        else if (String(m.winnerId) === String(m.awayTeamId || m.teamB?.id || m.teamBId)) winner = 'AWAY';
      } else if (homeScore != null && awayScore != null && m.status === 'COMPLETED') {
        winner = Number(homeScore) > Number(awayScore) ? 'HOME' : 'AWAY';
      }

      roundMap[matchedRound].push({
        id: m.id,
        roundName: matchedRound,
        roundIndex: ROUND_ORDER[matchedRound] || 99,
        homeTeam: homeName,
        awayTeam: awayName,
        homeScore,
        awayScore,
        winner,
        status: m.status || 'SCHEDULED',
        matchDate: m.scheduledAt ? m.scheduledAt.split('T')[0] : m.matchDate,
        matchTime: m.scheduledAt ? (m.scheduledAt.includes('T') ? m.scheduledAt.split('T')[1]?.slice(0, 5) : undefined) : (m.matchTime || m.startTime),
        courtName: m.venue || m.courtName || m.venueName,
      });
    });

    // If no matches are found, generate mock tournament draw for visual clarity
    if (Object.keys(roundMap).length === 0) {
      roundMap['QUARTER FINAL'] = [
        { id: 'QF-1', roundName: 'QUARTER FINAL', roundIndex: 4, homeTeam: 'Seed #1 (A1)', awayTeam: 'Seed #8 (B4)', status: 'SCHEDULED' },
        { id: 'QF-2', roundName: 'QUARTER FINAL', roundIndex: 4, homeTeam: 'Seed #4 (A2)', awayTeam: 'Seed #5 (B3)', status: 'SCHEDULED' },
        { id: 'QF-3', roundName: 'QUARTER FINAL', roundIndex: 4, homeTeam: 'Seed #2 (B1)', awayTeam: 'Seed #7 (A4)', status: 'SCHEDULED' },
        { id: 'QF-4', roundName: 'QUARTER FINAL', roundIndex: 4, homeTeam: 'Seed #3 (B2)', awayTeam: 'Seed #6 (A3)', status: 'SCHEDULED' },
      ];
      roundMap['SEMI FINAL'] = [
        { id: 'SF-1', roundName: 'SEMI FINAL', roundIndex: 5, homeTeam: 'Winner QF 1', awayTeam: 'Winner QF 2', status: 'SCHEDULED' },
        { id: 'SF-2', roundName: 'SEMI FINAL', roundIndex: 5, homeTeam: 'Winner QF 3', awayTeam: 'Winner QF 4', status: 'SCHEDULED' },
      ];
      roundMap['FINAL'] = [
        { id: 'FN-1', roundName: 'FINAL', roundIndex: 6, homeTeam: 'Winner SF 1', awayTeam: 'Winner SF 2', status: 'SCHEDULED' },
      ];
    }

    return Object.entries(roundMap)
      .sort(([, a], [, b]) => (a[0]?.roundIndex || 0) - (b[0]?.roundIndex || 0))
      .map(([name, items]) => ({ name, matches: items }));
  }, [matches]);

  if (loading) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading playoff draw...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <View style={s.badge}>
          <Ionicons name="git-network-outline" size={12} color="#4F46E5" />
          <Text style={s.badgeText}>Knockout Bracket</Text>
        </View>
        <Text style={s.scrollHint}>Swipe left/right to view rounds →</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bracketScroll}>
        {rounds.map((r, rIdx) => (
          <View key={r.name} style={s.roundColumn}>
            <View style={s.roundHeader}>
              <Text style={s.roundTitle}>{r.name}</Text>
              <Text style={s.roundCount}>{r.matches.length} {r.matches.length === 1 ? 'Match' : 'Matches'}</Text>
            </View>

            <View style={[s.matchList, { justifyContent: 'space-around', flex: 1 }]}>
              {r.matches.map((m) => {
                const isFinal = r.name.includes('FINAL') && !r.name.includes('SEMI') && !r.name.includes('QUARTER');
                return (
                  <TouchableOpacity
                    key={String(m.id)}
                    style={[s.matchCard, isFinal && s.finalCard]}
                    onPress={() => {
                      if (typeof m.id === 'number' || !isNaN(Number(m.id))) {
                        router.push(`/sports/match/${m.id}` as any);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Top Home Team */}
                    <View style={[s.teamRow, m.winner === 'HOME' && s.winnerTeamRow]}>
                      <View style={[s.seedDot, m.winner === 'HOME' && { backgroundColor: '#10B981' }]} />
                      <Text
                        style={[s.teamName, m.winner === 'HOME' && s.winnerTeamText]}
                        numberOfLines={1}
                      >
                        {m.homeTeam}
                      </Text>
                      {m.homeScore != null && (
                        <Text style={[s.teamScore, m.winner === 'HOME' && s.winnerTeamScore]}>
                          {m.homeScore}
                        </Text>
                      )}
                    </View>

                    <View style={s.divider} />

                    {/* Bottom Away Team */}
                    <View style={[s.teamRow, m.winner === 'AWAY' && s.winnerTeamRow]}>
                      <View style={[s.seedDot, m.winner === 'AWAY' && { backgroundColor: '#10B981' }]} />
                      <Text
                        style={[s.teamName, m.winner === 'AWAY' && s.winnerTeamText]}
                        numberOfLines={1}
                      >
                        {m.awayTeam}
                      </Text>
                      {m.awayScore != null && (
                        <Text style={[s.teamScore, m.winner === 'AWAY' && s.winnerTeamScore]}>
                          {m.awayScore}
                        </Text>
                      )}
                    </View>

                    {/* Match Footer */}
                    {(m.matchTime || m.courtName) && (
                      <View style={s.cardFooter}>
                        <Ionicons name="time-outline" size={10} color={COLORS.textMuted} />
                        <Text style={s.footerText} numberOfLines={1}>
                          {m.matchTime ? `${m.matchTime} • ` : ''}{m.courtName || 'Court TBD'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
    ...SHADOWS.sm,
  },
  centerBox: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  scrollHint: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  bracketScroll: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 8,
  },
  roundColumn: {
    width: 220,
    minHeight: 280,
  },
  roundHeader: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  roundTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roundCount: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  matchList: {
    gap: 12,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 8,
    ...SHADOWS.sm,
  },
  finalCard: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF5',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  winnerTeamRow: {
    backgroundColor: '#ECFDF5',
  },
  seedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  teamName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  winnerTeamText: {
    color: '#065F46',
    fontWeight: '800',
  },
  teamScore: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  winnerTeamScore: {
    color: '#059669',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  footerText: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
});
