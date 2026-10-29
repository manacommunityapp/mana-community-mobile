import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  governanceService,
  type ElectionDto,
  type ElectionCandidate,
  type MCPosition,
} from '@/services/governanceService';

const PHASE_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  UPCOMING:    { label: 'Upcoming',   color: '#6B7280', bg: '#F3F4F6', icon: 'time-outline' },
  NOMINATION:  { label: 'Nominations Open', color: '#2563EB', bg: '#DBEAFE', icon: 'person-add-outline' },
  VOTING:      { label: 'Voting Open', color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
  RESULTS:     { label: 'Results',    color: '#7C3AED', bg: '#EDE9FE', icon: 'podium-outline' },
};

const POSITION_ORDER: MCPosition[] = ['PRESIDENT', 'SECRETARY', 'TREASURER', 'JOINT_SECRETARY', 'GENERAL_MEMBER'];

function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.ceil(diff / 86400_000);
  return d === 1 ? '1 day left' : `${d} days left`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ElectionsScreen() {
  const qc = useQueryClient();
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({});
  const [receiptModal, setReceiptModal] = useState(false);
  const [receipt, setReceipt] = useState<{ hash: string; election: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [activeElectionId, setActiveElectionId] = useState<string | null>(null);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  const { data: elections = [], isLoading, refetch, isRefetching } = useQuery<ElectionDto[]>({
    queryKey: ['elections'],
    queryFn: () => governanceService.getElections(),
    staleTime: 60_000,
  });

  const voteMutation = useMutation({
    mutationFn: ({ electionId, votes }: { electionId: string; votes: { position: MCPosition; candidateId: string }[] }) =>
      governanceService.castElectionVote(electionId, votes),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['elections'] });
      const el = elections.find(e => e.id === vars.electionId);
      setReceipt({ hash: data.receiptHash, election: el?.title ?? 'Election' });
      setConfirmModal(false);
      setReceiptModal(true);
      setSelectedVotes({});
    },
  });

  const activeEl = elections.find(e => e.id === activeElectionId) ?? elections[0] ?? null;

  const handleSelectCandidate = (position: MCPosition, candidateId: string) => {
    setSelectedVotes(prev => ({ ...prev, [position]: candidateId }));
  };

  const candidatesForPosition = (el: ElectionDto, pos: MCPosition) =>
    el.candidates.filter(c => c.position === pos);

  const totalPositions = (el: ElectionDto) => [...new Set(el.candidates.map(c => c.position))];

  const allPositionsVoted = (el: ElectionDto) => {
    const positions = totalPositions(el);
    return positions.every(pos => selectedVotes[pos]);
  };

  const turnout = (el: ElectionDto) =>
    el.totalEligibleVoters > 0
      ? Math.round((el.totalVotesCast / el.totalEligibleVoters) * 100)
      : 0;

  const winnerForPosition = (el: ElectionDto, pos: MCPosition) => {
    const cands = candidatesForPosition(el, pos);
    if (el.phase !== 'RESULTS') return null;
    return cands.find(c => c.isWinner) ?? cands.sort((a, b) => (b.votesCount ?? 0) - (a.votesCount ?? 0))[0];
  };

  const renderCandidateCard = (el: ElectionDto, candidate: ElectionCandidate) => {
    const isSelected = selectedVotes[candidate.position] === candidate.id;
    const isWinner = el.phase === 'RESULTS' && (candidate.isWinner ?? false);
    const totalInPos = candidatesForPosition(el, candidate.position)
      .reduce((s, c) => s + (c.votesCount ?? 0), 0);
    const pct = totalInPos > 0 ? Math.round(((candidate.votesCount ?? 0) / totalInPos) * 100) : 0;
    const isExpanded = expandedCandidateId === candidate.id;

    return (
      <TouchableOpacity
        key={candidate.id}
        style={[
          s.candidateCard,
          isSelected && s.candidateCardSelected,
          isWinner && s.candidateCardWinner,
        ]}
        onPress={() => {
          if (el.phase === 'VOTING' && !el.hasUserVoted) {
            handleSelectCandidate(candidate.position, candidate.id);
          }
          setExpandedCandidateId(isExpanded ? null : candidate.id);
        }}
        activeOpacity={0.85}
      >
        <View style={s.candidateRow}>
          <View style={[s.candidateAvatar, isWinner && { backgroundColor: '#FEF3C7' }]}>
            <Ionicons
              name={isWinner ? 'trophy' : 'person'}
              size={20}
              color={isWinner ? '#D97706' : COLORS.textSecondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.candidateNameRow}>
              <Text style={s.candidateName}>{candidate.name}</Text>
              {isWinner && (
                <View style={s.winnerBadge}>
                  <Text style={s.winnerBadgeText}>ELECTED</Text>
                </View>
              )}
            </View>
            <Text style={s.candidateMeta}>
              Flat {candidate.flat} · {candidate.yearsInSociety}yr resident
            </Text>
          </View>
          {el.phase === 'VOTING' && !el.hasUserVoted && (
            <View style={[s.radioOuter, isSelected && s.radioOuterSelected]}>
              {isSelected && <View style={s.radioInner} />}
            </View>
          )}
          {(el.phase === 'RESULTS' || (el.hasUserVoted)) && typeof candidate.votesCount === 'number' && (
            <Text style={[s.votePct, isWinner && { color: '#D97706', fontWeight: '800' }]}>{pct}%</Text>
          )}
        </View>

        {(el.phase === 'RESULTS' || el.hasUserVoted) && typeof candidate.votesCount === 'number' && (
          <View style={s.voteBarTrack}>
            <View style={[s.voteBarFill, { width: `${pct}%` as any, backgroundColor: isWinner ? '#D97706' : COLORS.primary }]} />
          </View>
        )}

        {isExpanded && candidate.manifesto ? (
          <View style={s.manifestoBox}>
            <Text style={s.manifestoText}>{candidate.manifesto}</Text>
          </View>
        ) : candidate.manifesto ? (
          <TouchableOpacity onPress={() => setExpandedCandidateId(candidate.id)}>
            <Text style={s.viewManifesto}>Read manifesto ›</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderPositionSection = (el: ElectionDto, pos: MCPosition) => {
    const cands = candidatesForPosition(el, pos);
    if (cands.length === 0) return null;
    const label = governanceService.POSITION_LABELS[pos];
    const winner = winnerForPosition(el, pos);

    return (
      <View key={pos} style={s.posSection}>
        <View style={s.posSectionHeader}>
          <Text style={s.posSectionTitle}>{label}</Text>
          {el.phase === 'RESULTS' && winner && (
            <Text style={s.posWinnerName}>{winner.name}</Text>
          )}
        </View>
        {cands
          .sort((a, b) => (b.votesCount ?? 0) - (a.votesCount ?? 0))
          .map(c => renderCandidateCard(el, c))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Election selector tabs */}
      {elections.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.electionTabs}>
          {elections.map(el => (
            <TouchableOpacity
              key={el.id}
              style={[s.electionTab, (activeElectionId ?? elections[0]?.id) === el.id && s.electionTabActive]}
              onPress={() => { setActiveElectionId(el.id); setSelectedVotes({}); }}
            >
              <Text style={[s.electionTabText, (activeElectionId ?? elections[0]?.id) === el.id && s.electionTabTextActive]}>
                {el.year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeEl ? (
        <>
          {/* Header card */}
          <View style={s.headerCard}>
            <View style={s.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.electionTitle}>{activeEl.title}</Text>
                <View style={[s.phasePill, { backgroundColor: PHASE_META[activeEl.phase]?.bg }]}>
                  <Ionicons name={PHASE_META[activeEl.phase]?.icon} size={13} color={PHASE_META[activeEl.phase]?.color} />
                  <Text style={[s.phaseLabel, { color: PHASE_META[activeEl.phase]?.color }]}>
                    {PHASE_META[activeEl.phase]?.label}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statCell}>
                <Text style={s.statVal}>{activeEl.totalEligibleVoters}</Text>
                <Text style={s.statLbl}>Eligible</Text>
              </View>
              <View style={s.statCell}>
                <Text style={s.statVal}>{activeEl.totalVotesCast}</Text>
                <Text style={s.statLbl}>Voted</Text>
              </View>
              <View style={s.statCell}>
                <Text style={[s.statVal, { color: '#059669' }]}>{turnout(activeEl)}%</Text>
                <Text style={s.statLbl}>Turnout</Text>
              </View>
              <View style={s.statCell}>
                <Text style={s.statVal}>{activeEl.candidates.length}</Text>
                <Text style={s.statLbl}>Candidates</Text>
              </View>
            </View>

            {/* Turnout bar */}
            <View style={s.turnoutBarTrack}>
              <View style={[s.turnoutBarFill, { width: `${turnout(activeEl)}%` as any }]} />
            </View>

            {/* Timeline row */}
            <View style={s.timelineRow}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.timelineText}>
                {activeEl.phase === 'VOTING'
                  ? `Voting closes ${fmtDate(activeEl.votingEnd)} · ${daysLeft(activeEl.votingEnd)}`
                  : activeEl.phase === 'NOMINATION'
                  ? `Nominations close ${fmtDate(activeEl.nominationDeadline)}`
                  : activeEl.phase === 'RESULTS'
                  ? `Concluded ${fmtDate(activeEl.votingEnd)}`
                  : `Voting opens ${fmtDate(activeEl.votingStart)}`
                }
              </Text>
            </View>
          </View>

          {/* Already voted banner */}
          {activeEl.hasUserVoted && activeEl.phase === 'VOTING' && (
            <View style={s.votedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={s.votedBannerText}>You have cast your vote. Results will be announced after voting closes.</Text>
            </View>
          )}

          {/* Positions */}
          {POSITION_ORDER
            .filter(pos => activeEl.positions.includes(pos))
            .map(pos => renderPositionSection(activeEl, pos))}

          {/* Cast vote button */}
          {activeEl.phase === 'VOTING' && !activeEl.hasUserVoted && (
            <TouchableOpacity
              style={[s.castVoteBtn, !allPositionsVoted(activeEl) && { opacity: 0.45 }]}
              disabled={!allPositionsVoted(activeEl) || voteMutation.isPending}
              onPress={() => setConfirmModal(true)}
            >
              {voteMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="lock-closed" size={17} color="#fff" />
                    <Text style={s.castVoteBtnText}>Cast Confidential Ballot</Text>
                  </>
              }
            </TouchableOpacity>
          )}
          {activeEl.phase === 'VOTING' && !activeEl.hasUserVoted && (
            <Text style={s.castVoteHint}>
              Select one candidate per position to enable voting.
            </Text>
          )}
        </>
      ) : (
        <View style={s.empty}>
          <Ionicons name="ribbon-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No elections scheduled</Text>
          <Text style={s.emptySub}>Society committee elections will appear here when announced by the MC.</Text>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Confirm Modal */}
      <Modal visible={confirmModal} transparent animationType="slide" onRequestClose={() => setConfirmModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setConfirmModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Confirm Your Ballot</Text>
          <Text style={s.sheetSub}>Once submitted, your vote cannot be changed. Your ballot is confidential.</Text>

          {activeEl && totalPositions(activeEl).map(pos => {
            const cand = activeEl.candidates.find(c => c.id === selectedVotes[pos]);
            return cand ? (
              <View key={pos} style={s.confirmRow}>
                <Text style={s.confirmPos}>{governanceService.POSITION_LABELS[pos]}</Text>
                <Text style={s.confirmName}>{cand.name} · {cand.flat}</Text>
              </View>
            ) : null;
          })}

          <TouchableOpacity
            style={s.confirmBtn}
            onPress={() => {
              if (!activeEl) return;
              const votes = Object.entries(selectedVotes).map(([position, candidateId]) => ({
                position: position as MCPosition,
                candidateId,
              }));
              voteMutation.mutate({ electionId: activeEl.id, votes });
            }}
            disabled={voteMutation.isPending}
          >
            {voteMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="lock-closed" size={16} color="#fff" /><Text style={s.confirmBtnText}>Submit Ballot</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={() => setConfirmModal(false)}>
            <Text style={s.cancelBtnText}>Review Selections</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={receiptModal} transparent animationType="fade" onRequestClose={() => setReceiptModal(false)}>
        <View style={s.receiptOverlay}>
          <View style={s.receiptCard}>
            <View style={s.receiptIcon}>
              <Ionicons name="checkmark-circle" size={40} color="#059669" />
            </View>
            <Text style={s.receiptTitle}>Vote Recorded!</Text>
            <Text style={s.receiptSub}>{receipt?.election}</Text>
            <View style={s.receiptHashBox}>
              <Text style={s.receiptHashLabel}>BALLOT RECEIPT</Text>
              <Text style={s.receiptHash} numberOfLines={2}>{receipt?.hash}</Text>
            </View>
            <Text style={s.receiptNote}>Your ballot is anonymous. This receipt proves your vote was counted.</Text>
            <TouchableOpacity style={s.receiptDoneBtn} onPress={() => setReceiptModal(false)}>
              <Text style={s.receiptDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, gap: SPACING.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  electionTabs: { marginBottom: 4 },
  electionTab: {
    paddingHorizontal: 16, paddingVertical: 8, marginRight: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  electionTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  electionTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  electionTabTextActive: { color: '#fff', fontWeight: '700' },

  headerCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, gap: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  electionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2, marginBottom: 6 },
  phasePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  phaseLabel: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 4 },
  statCell: { flex: 1, alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, paddingVertical: 8 },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLbl: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 1 },
  turnoutBarTrack: { height: 5, backgroundColor: COLORS.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  turnoutBarFill: { height: 5, backgroundColor: '#059669', borderRadius: 3 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timelineText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },

  votedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#D1FAE5', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#6EE7B7',
  },
  votedBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#065F46', lineHeight: 18 },

  posSection: { gap: 8 },
  posSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  posSectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  posWinnerName: { fontSize: 12, fontWeight: '700', color: '#D97706' },

  candidateCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1.5, borderColor: COLORS.border, gap: 8, ...SHADOWS.sm,
  },
  candidateCardSelected: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  candidateCardWinner: { borderColor: '#D97706', backgroundColor: '#FFFBEB' },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  candidateAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  candidateNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  candidateName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  candidateMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  winnerBadge: {
    backgroundColor: '#D97706', borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  winnerBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  votePct: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, minWidth: 36, textAlign: 'right' },
  voteBarTrack: { height: 4, backgroundColor: COLORS.surfaceAlt, borderRadius: 2, overflow: 'hidden' },
  voteBarFill: { height: 4, borderRadius: 2 },
  manifestoBox: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    padding: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  manifestoText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  viewManifesto: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  castVoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 16, ...SHADOWS.md,
  },
  castVoteBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  castVoteHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: -4 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: 36, gap: 10,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  sheetSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  confirmRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  confirmPos: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, marginTop: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },

  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  receiptCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    width: '100%', alignItems: 'center', gap: 10, ...SHADOWS.lg,
  },
  receiptIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  receiptTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  receiptSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  receiptHashBox: {
    width: '100%', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    padding: 12, gap: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  receiptHashLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  receiptHash: { fontSize: 11, fontFamily: 'monospace', color: COLORS.text, letterSpacing: 0.5 },
  receiptNote: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 17 },
  receiptDoneBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 13,
    paddingHorizontal: 40, marginTop: 4,
  },
  receiptDoneBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
