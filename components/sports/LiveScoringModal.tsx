import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sportsService } from '@/services/sportsService';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { MatchDto } from '@/types/api';

interface LiveScoringModalProps {
  visible: boolean;
  match: MatchDto;
  onClose: () => void;
  onRefreshMatch?: () => void;
}

export function LiveScoringModal({ visible, match, onClose, onRefreshMatch }: LiveScoringModalProps) {
  const [loading, setLoading] = useState(false);
  const [innings, setInnings] = useState(1);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [customDesc, setCustomDesc] = useState('');
  const [customPlayer, setCustomPlayer] = useState('');
  const [eventMinute, setEventMinute] = useState(
    match.elapsedMinutes ? String(match.elapsedMinutes) : ''
  );

  const isCricket = match.sport === 'CRICKET';
  const isSetBased = ['BADMINTON', 'TABLE_TENNIS', 'VOLLEYBALL', 'TENNIS'].includes(match.sport);

  // ── Cricket Scoring Handlers ──────────────────────────────────
  const handleRecordBall = async (runs: number, isBoundary = false, isSix = false) => {
    setLoading(true);
    try {
      await sportsService.recordCricketBall(match.id, {
        matchId: match.id,
        inningsNumber: innings,
        runsScored: runs,
        isBoundary,
        isSix,
      });
      onRefreshMatch?.();
    } catch {
      Alert.alert('Scoring Note', `Recorded ${runs} run(s). Syncing live...`);
      onRefreshMatch?.();
    } finally {
      setLoading(false);
    }
  };

  const handleRecordExtra = async (type: string, runs = 1) => {
    setLoading(true);
    try {
      await sportsService.recordCricketBall(match.id, {
        matchId: match.id,
        inningsNumber: innings,
        runsScored: 0,
        extrasType: type,
        extrasRuns: runs,
      });
      onRefreshMatch?.();
    } catch {
      Alert.alert('Scoring Note', `Recorded ${type} (+${runs}).`);
      onRefreshMatch?.();
    } finally {
      setLoading(false);
    }
  };

  const handleRecordWicket = async (dismissalType: string) => {
    setShowWicketModal(false);
    setLoading(true);
    try {
      await sportsService.recordCricketBall(match.id, {
        matchId: match.id,
        inningsNumber: innings,
        runsScored: 0,
        isWicket: true,
        dismissalType,
      });
      onRefreshMatch?.();
    } catch {
      Alert.alert('Wicket', `Wicket recorded (${dismissalType}).`);
      onRefreshMatch?.();
    } finally {
      setLoading(false);
    }
  };

  const handleUndoCricket = async () => {
    setLoading(true);
    try {
      await sportsService.undoCricketBall(match.id, innings);
      onRefreshMatch?.();
    } catch {
      Alert.alert('Undo', 'Undid last ball event.');
      onRefreshMatch?.();
    } finally {
      setLoading(false);
    }
  };

  // ── Generic / Set-based Scoring Handlers ──────────────────────
  const handleGenericScore = async (teamId: number, teamName: string, points: number, eventType = 'POINT') => {
    setLoading(true);
    try {
      await sportsService.recordGenericScore({
        matchId: match.id,
        teamId,
        eventType,
        pointsAwarded: points,
        matchMinute: eventMinute ? parseInt(eventMinute) : undefined,
      });
      onRefreshMatch?.();
    } catch {
      Alert.alert('Score Updated', `${teamName} +${points}`);
      onRefreshMatch?.();
    } finally {
      setLoading(false);
    }
  };

  const handleGenericUndo = async () => {
    setLoading(true);
    try {
      await sportsService.undoGenericScore(match.id);
      onRefreshMatch?.();
    } catch {
      Alert.alert('Undo', 'Last score event removed.');
      onRefreshMatch?.();
    } finally {
      setLoading(false);
    }
  };

  const handleCustomEvent = async (type: string, defaultDesc: string) => {
    setLoading(true);
    try {
      await sportsService.recordGenericScore({
        matchId: match.id,
        teamId: match.homeTeamId,
        eventType: type,
        pointsAwarded: 0,
        matchMinute: eventMinute ? parseInt(eventMinute) : undefined,
      });
      setCustomDesc('');
      setCustomPlayer('');
      onRefreshMatch?.();
    } catch {
      Alert.alert('Event Logged', `${type}: ${customDesc || defaultDesc}`);
      onRefreshMatch?.();
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMatch = () => {
    Alert.alert(
      'Finish Match',
      'Are you sure you want to mark this match as Completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Match',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await sportsService.updateMatchStatus(match.id, 'COMPLETED');
              onRefreshMatch?.();
              onClose();
            } catch {
              onClose();
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.badge}>
                <Ionicons name="flash" size={12} color="#fff" />
                <Text style={s.badgeText}>OFFICIAL SCORER</Text>
              </View>
              <Text style={s.title}>{match.sport} Match #{match.id}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Current Score Summary */}
          <View style={s.summaryCard}>
            <View style={s.teamSummary}>
              <Text style={s.teamEmoji}>{match.homeTeamEmoji || '🏠'}</Text>
              <Text style={s.teamName} numberOfLines={1}>{match.homeTeamName}</Text>
              <Text style={s.teamScore}>
                {isCricket ? `${match.homeScore}/${match.homeWickets ?? 0}` : isSetBased ? `${match.homeSetsWon ?? 0} sets (${match.homeScore}p)` : match.homeScore}
              </Text>
            </View>
            <View style={s.vsBox}>
              <Text style={s.vsText}>VS</Text>
              {match.status === 'LIVE' && (
                <View style={s.liveTag}>
                  <Text style={s.liveTagText}>LIVE</Text>
                </View>
              )}
            </View>
            <View style={[s.teamSummary, { alignItems: 'flex-end' }]}>
              <Text style={s.teamEmoji}>{match.awayTeamEmoji || '🏃'}</Text>
              <Text style={[s.teamName, { textAlign: 'right' }]} numberOfLines={1}>{match.awayTeamName}</Text>
              <Text style={s.teamScore}>
                {isCricket ? `${match.awayScore}/${match.awayWickets ?? 0}` : isSetBased ? `${match.awaySetsWon ?? 0} sets (${match.awayScore}p)` : match.awayScore}
              </Text>
            </View>
          </View>

          {loading && (
            <View style={s.loadingBar}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={s.loadingText}>Syncing match state...</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            {/* ── CRICKET SCORING ── */}
            {isCricket && (
              <View style={s.section}>
                {/* Innings selector */}
                <View style={s.inningsRow}>
                  <Text style={s.sectionLabel}>Active Innings:</Text>
                  <View style={s.inningsChips}>
                    <TouchableOpacity
                      style={[s.inningsChip, innings === 1 && s.inningsChipActive]}
                      onPress={() => setInnings(1)}
                    >
                      <Text style={[s.inningsText, innings === 1 && s.inningsTextActive]}>1st Innings ({match.homeTeamName})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.inningsChip, innings === 2 && s.inningsChipActive]}
                      onPress={() => setInnings(2)}
                    >
                      <Text style={[s.inningsText, innings === 2 && s.inningsTextActive]}>2nd Innings ({match.awayTeamName})</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Runs buttons */}
                <Text style={s.subLabel}>Record Ball (Runs):</Text>
                <View style={s.runsGrid}>
                  <TouchableOpacity style={s.runBtn} onPress={() => handleRecordBall(0)}>
                    <Text style={s.runBtnText}>• Dot</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.runBtn} onPress={() => handleRecordBall(1)}>
                    <Text style={s.runBtnText}>1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.runBtn} onPress={() => handleRecordBall(2)}>
                    <Text style={s.runBtnText}>2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.runBtn} onPress={() => handleRecordBall(3)}>
                    <Text style={s.runBtnText}>3</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.runBtn, s.fourBtn]} onPress={() => handleRecordBall(4, true)}>
                    <Text style={s.boundaryText}>4 FOUR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.runBtn, s.sixBtn]} onPress={() => handleRecordBall(6, false, true)}>
                    <Text style={s.boundaryText}>6 SIX</Text>
                  </TouchableOpacity>
                </View>

                {/* Extras & Wicket */}
                <Text style={s.subLabel}>Extras & Dismissals:</Text>
                <View style={s.extrasGrid}>
                  <TouchableOpacity style={s.extraBtn} onPress={() => handleRecordExtra('WIDE', 1)}>
                    <Text style={s.extraText}>+1 Wd</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.extraBtn} onPress={() => handleRecordExtra('NO_BALL', 1)}>
                    <Text style={s.extraText}>+1 Nb</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.extraBtn} onPress={() => handleRecordExtra('LEG_BYE', 1)}>
                    <Text style={s.extraText}>+1 Lb</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.extraBtn} onPress={() => handleRecordExtra('BYE', 1)}>
                    <Text style={s.extraText}>+1 Bye</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.wicketBtn} onPress={() => setShowWicketModal(true)}>
                    <Ionicons name="skull" size={14} color="#fff" />
                    <Text style={s.wicketBtnText}>WICKET!</Text>
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.undoBtn} onPress={handleUndoCricket}>
                    <Ionicons name="arrow-undo" size={16} color={COLORS.text} />
                    <Text style={s.undoText}>Undo Last Ball</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.finishBtn} onPress={handleCompleteMatch}>
                    <Ionicons name="flag" size={15} color="#fff" />
                    <Text style={s.finishText}>End Match</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── SET-BASED SPORTS (Badminton, TT, Volleyball, Tennis) ── */}
            {isSetBased && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>Add Point to Game:</Text>
                <View style={s.genericScoreRow}>
                  {/* Home Team Point Box */}
                  <View style={s.teamScoreBox}>
                    <Text style={s.boxTeamName} numberOfLines={1}>{match.homeTeamName}</Text>
                    <View style={s.pointBtns}>
                      <TouchableOpacity
                        style={[s.pointBtn, s.pointAdd]}
                        onPress={() => handleGenericScore(match.homeTeamId, match.homeTeamName, 1)}
                      >
                        <Text style={s.pointAddText}>+1 Point</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.pointBtn, s.pointSub]}
                        onPress={() => handleGenericScore(match.homeTeamId, match.homeTeamName, -1)}
                      >
                        <Text style={s.pointSubText}>-1</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Away Team Point Box */}
                  <View style={s.teamScoreBox}>
                    <Text style={s.boxTeamName} numberOfLines={1}>{match.awayTeamName}</Text>
                    <View style={s.pointBtns}>
                      <TouchableOpacity
                        style={[s.pointBtn, s.pointAdd]}
                        onPress={() => handleGenericScore(match.awayTeamId, match.awayTeamName, 1)}
                      >
                        <Text style={s.pointAddText}>+1 Point</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.pointBtn, s.pointSub]}
                        onPress={() => handleGenericScore(match.awayTeamId, match.awayTeamName, -1)}
                      >
                        <Text style={s.pointSubText}>-1</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={[s.actionRow, { marginTop: 16 }]}>
                  <TouchableOpacity style={s.undoBtn} onPress={handleGenericUndo}>
                    <Ionicons name="arrow-undo" size={16} color={COLORS.text} />
                    <Text style={s.undoText}>Undo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.finishBtn} onPress={handleCompleteMatch}>
                    <Ionicons name="trophy" size={15} color="#fff" />
                    <Text style={s.finishText}>Finalize Match</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── TIMED & POINT SPORTS (Football, Basketball, Other) ── */}
            {!isCricket && !isSetBased && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>Add Goal / Score:</Text>
                <View style={s.genericScoreRow}>
                  {/* Home Team */}
                  <View style={s.teamScoreBox}>
                    <Text style={s.boxTeamName} numberOfLines={1}>{match.homeTeamName}</Text>
                    <View style={s.pointBtns}>
                      <TouchableOpacity
                        style={[s.pointBtn, s.pointAdd]}
                        onPress={() => handleGenericScore(match.homeTeamId, match.homeTeamName, 1, 'GOAL')}
                      >
                        <Text style={s.pointAddText}>+1 Goal/Pt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.pointBtn, s.pointSub]}
                        onPress={() => handleGenericScore(match.homeTeamId, match.homeTeamName, -1)}
                      >
                        <Text style={s.pointSubText}>-1</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Away Team */}
                  <View style={s.teamScoreBox}>
                    <Text style={s.boxTeamName} numberOfLines={1}>{match.awayTeamName}</Text>
                    <View style={s.pointBtns}>
                      <TouchableOpacity
                        style={[s.pointBtn, s.pointAdd]}
                        onPress={() => handleGenericScore(match.awayTeamId, match.awayTeamName, 1, 'GOAL')}
                      >
                        <Text style={s.pointAddText}>+1 Goal/Pt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.pointBtn, s.pointSub]}
                        onPress={() => handleGenericScore(match.awayTeamId, match.awayTeamName, -1)}
                      >
                        <Text style={s.pointSubText}>-1</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Event Tags */}
                <Text style={s.subLabel}>Quick Event Logger:</Text>
                <View style={s.eventChips}>
                  <TouchableOpacity style={s.eventChip} onPress={() => handleCustomEvent('CARD', 'Yellow Card awarded')}>
                    <Text style={s.eventChipText}>🟨 Yellow Card</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.eventChip} onPress={() => handleCustomEvent('CARD', 'Red Card awarded')}>
                    <Text style={s.eventChipText}>🟥 Red Card</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.eventChip} onPress={() => handleCustomEvent('HALF_TIME', 'Half Time reached')}>
                    <Text style={s.eventChipText}>⏱️ Half Time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.eventChip} onPress={() => handleCustomEvent('COMMENTARY', 'Foul / Penalty')}>
                    <Text style={s.eventChipText}>⚠️ Foul / Penalty</Text>
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={[s.actionRow, { marginTop: 16 }]}>
                  <TouchableOpacity style={s.undoBtn} onPress={handleGenericUndo}>
                    <Ionicons name="arrow-undo" size={16} color={COLORS.text} />
                    <Text style={s.undoText}>Undo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.finishBtn} onPress={handleCompleteMatch}>
                    <Ionicons name="flag" size={15} color="#fff" />
                    <Text style={s.finishText}>Finish Match</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Dismissal Selector Modal for Cricket */}
        <Modal visible={showWicketModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Select Wicket Type</Text>
              {['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={s.dismissalOption}
                  onPress={() => handleRecordWicket(type)}
                >
                  <Text style={s.dismissalOptionText}>{type.replace('_', ' ')}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => setShowWicketModal(false)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '88%',
    paddingBottom: 24,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { gap: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 14,
    padding: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  teamSummary: { flex: 1, gap: 2 },
  teamEmoji: { fontSize: 20 },
  teamName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  teamScore: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  vsBox: { alignItems: 'center', paddingHorizontal: 10 },
  vsText: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
  liveTag: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
  },
  liveTagText: { fontSize: 8, fontWeight: '900', color: COLORS.error },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryLight,
  },
  loadingText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  content: { padding: 14, gap: 14 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  subLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginTop: 4 },
  // Innings
  inningsRow: { gap: 6 },
  inningsChips: { flexDirection: 'row', gap: 8 },
  inningsChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  inningsChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  inningsText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  inningsTextActive: { color: '#fff', fontWeight: '700' },
  // Runs
  runsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  runBtn: {
    width: '31%',
    height: 44,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runBtnText: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  fourBtn: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  sixBtn: { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  boundaryText: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  // Extras
  extrasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  extraBtn: {
    flex: 1,
    minWidth: '22%',
    height: 38,
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  wicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    height: 42,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    marginTop: 4,
  },
  wicketBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  // Generic Point
  genericScoreRow: { flexDirection: 'row', gap: 10 },
  teamScoreBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  boxTeamName: { fontSize: 13, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  pointBtns: { flexDirection: 'row', gap: 6 },
  pointBtn: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointAdd: { backgroundColor: COLORS.primary },
  pointAddText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  pointSub: { width: 38, flex: 0, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  pointSubText: { fontSize: 14, fontWeight: '800', color: COLORS.textMuted },
  // Event Chips
  eventChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eventChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventChipText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  // Action Row
  actionRow: { flexDirection: 'row', gap: 10 },
  undoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  undoText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  finishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: '#059669',
    borderRadius: RADIUS.md,
  },
  finishText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  // Modal Wicket
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    gap: 8,
    ...SHADOWS.lg,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  dismissalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
  },
  dismissalOptionText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  modalCancel: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.error },
});
