import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, isPast } from 'date-fns';
import { pollService } from '@/services/pollService';
import { AnimatedBar } from './AnimatedBar';
import { COLORS } from '@/constants/config';
import type { PostDto, PollOptionDto } from '@/types/api';

interface PollCardProps {
  post:            PostDto;
  currentUserId?:  number;
  compact?:        boolean;   // true = feed embed, false = full detail view
  onVoted?:        () => void;
}

export function PollCard({ post, currentUserId, compact = true, onVoted }: PollCardProps) {
  const router = useRouter();
  const qc     = useQueryClient();
  const poll   = post.poll;

  // Which options the user has selected (before submitting)
  const alreadyVotedIds = poll?.votedOptionIds
    ?? (poll?.votedOptionId ? [poll.votedOptionId] : []);

  const [selected, setSelected] = useState<number[]>(alreadyVotedIds);
  const hasVoted  = alreadyVotedIds.length > 0;
  const isExpired = poll?.deadline ? isPast(new Date(poll.deadline)) : false;
  const isClosed  = !poll?.isActive || isExpired;
  const showResults = hasVoted || isClosed;

  // Determine winner
  const maxVotes = Math.max(...(poll?.options.map((o) => o.voteCount) ?? [0]));

  const voteMutation = useMutation({
    mutationFn: () => pollService.vote(post.id, selected),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['polls'] });
      qc.invalidateQueries({ queryKey: ['poll', post.id] });
      onVoted?.();
    },
  });

  const retractMutation = useMutation({
    mutationFn: () => pollService.retractVote(post.id),
    onSuccess: () => {
      setSelected([]);
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['polls'] });
    },
  });

  const toggleOption = useCallback((id: number) => {
    if (isClosed || hasVoted) return;
    if (poll?.allowMultipleVotes) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelected([id]);
    }
  }, [isClosed, hasVoted, poll?.allowMultipleVotes]);

  if (!poll) return null;

  return (
    <View style={[s.wrap, !compact && s.wrapFull]}>
      {/* Status pill */}
      <View style={s.statusRow}>
        {isClosed ? (
          <View style={s.closedPill}><Text style={s.closedText}>🔒 Poll closed</Text></View>
        ) : (
          <View style={s.activePill}><Text style={s.activeText}>📊 Active poll</Text></View>
        )}
        {poll.deadline && !isClosed && (
          <Text style={s.deadline}>
            Closes {formatDistanceToNow(new Date(poll.deadline), { addSuffix: true })}
          </Text>
        )}
        {poll.isAnonymous && (
          <Text style={s.anon}>🔏 Anonymous</Text>
        )}
      </View>

      {/* Options */}
      <View style={s.options}>
        {showResults ? (
          /* ── Results view: animated bars ── */
          poll.options.map((opt, i) => (
            <AnimatedBar
              key={opt.id}
              label={opt.text}
              count={opt.voteCount}
              total={poll.totalVotes}
              isSelected={alreadyVotedIds.includes(opt.id)}
              isWinning={opt.voteCount === maxVotes && maxVotes > 0}
              delay={i * 80}
            />
          ))
        ) : (
          /* ── Voting view: selectable options ── */
          poll.options.map((opt) => {
            const isChosen = selected.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.option, isChosen && s.optionSelected]}
                onPress={() => toggleOption(opt.id)}
                activeOpacity={0.75}
              >
                {/* Radio / checkbox */}
                <View style={[
                  s.optionDot,
                  poll.allowMultipleVotes ? s.optionSquare : null,
                  isChosen && s.optionDotSelected,
                ]}>
                  {isChosen && (
                    <Text style={s.optionDotCheck}>
                      {poll.allowMultipleVotes ? '✓' : ''}
                    </Text>
                  )}
                </View>
                <Text style={[s.optionText, isChosen && s.optionTextSelected]}>
                  {opt.text}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.totalVotes}>
          {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
        </Text>

        {/* Retract vote */}
        {hasVoted && !isClosed && (
          <TouchableOpacity
            onPress={() => retractMutation.mutate()}
            disabled={retractMutation.isPending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.retract}>
              {retractMutation.isPending ? '…' : 'Change vote'}
            </Text>
          </TouchableOpacity>
        )}

        {/* View full detail */}
        {compact && (
          <TouchableOpacity
            onPress={() => router.push(`/polls/${post.id}`)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.viewFull}>Full results →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Vote button */}
      {!showResults && !isClosed && selected.length > 0 && (
        <TouchableOpacity
          style={[s.voteBtn, voteMutation.isPending && s.voteBtnDisabled]}
          onPress={() => voteMutation.mutate()}
          disabled={voteMutation.isPending}
          activeOpacity={0.85}
        >
          {voteMutation.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.voteBtnText}>
                Vote{poll.allowMultipleVotes && selected.length > 1 ? ` (${selected.length})` : ''}
              </Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:              { marginTop: 10, gap: 12 },
  wrapFull:          { gap: 14 },
  statusRow:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  activePill:        { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeText:        { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  closedPill:        { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  closedText:        { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  deadline:          { fontSize: 11, color: COLORS.textMuted },
  anon:              { fontSize: 11, color: COLORS.textMuted },
  options:           { gap: 0 },
  option:            { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, backgroundColor: '#F9FAFB' },
  optionSelected:    { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  optionDot:         { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionSquare:      { borderRadius: 4 },
  optionDotSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionDotCheck:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  optionText:        { fontSize: 14, color: COLORS.text, flex: 1, lineHeight: 20 },
  optionTextSelected:{ color: COLORS.primary, fontWeight: '600' },
  footer:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalVotes:        { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  retract:           { fontSize: 12, color: COLORS.textMuted, textDecorationLine: 'underline' },
  viewFull:          { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  voteBtn:           { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  voteBtnDisabled:   { opacity: 0.7 },
  voteBtnText:       { color: '#fff', fontWeight: '700', fontSize: 14 },
});
