import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS, getInitials } from '@/constants/config';
import type { PlayerReaction, MatchRatingPlayerDto } from '@/types/api';

const REACTIONS: { key: PlayerReaction; emoji: string; label: string }[] = [
  { key: 'BEST_PLAYER', emoji: '🌟', label: 'Best Player' },
  { key: 'CLUTCH',      emoji: '🎯', label: 'Clutch'      },
  { key: 'TEAM_PLAYER', emoji: '🤝', label: 'Team Player' },
  { key: 'CONSISTENT',  emoji: '💪', label: 'Consistent'  },
  { key: 'GOOD_SPORT',  emoji: '🏅', label: 'Good Sport'  },
];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={{ fontSize: 26, color: n <= value ? '#D97706' : '#E5E7EB' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface PlayerRating {
  stars:       number;
  reaction?:   PlayerReaction;
  isManOfMatch: boolean;
}

export default function PeerRatingScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['match-ratings', id],
    queryFn:  () => sportsService.getMatchRatings(Number(id)),
  });

  const [ratings, setRatings] = useState<Record<number, PlayerRating>>({});
  const [momId,   setMomId]   = useState<number | null>(null);

  // One MOM at a time
  function toggleMom(playerId: number) {
    const newMom = momId === playerId ? null : playerId;
    setMomId(newMom);
    setRatings((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[Number(k)] = { ...updated[Number(k)], isManOfMatch: Number(k) === newMom };
      });
      if (newMom && !updated[newMom]) {
        updated[newMom] = { stars: 4, reaction: 'BEST_PLAYER', isManOfMatch: true };
      }
      return updated;
    });
  }

  function setStars(playerId: number, stars: number) {
    setRatings((prev) => ({
      ...prev,
      [playerId]: { stars, reaction: prev[playerId]?.reaction, isManOfMatch: prev[playerId]?.isManOfMatch ?? false },
    }));
  }

  function setReaction(playerId: number, reaction: PlayerReaction) {
    setRatings((prev) => ({
      ...prev,
      [playerId]: { stars: prev[playerId]?.stars ?? 3, reaction, isManOfMatch: prev[playerId]?.isManOfMatch ?? false },
    }));
  }

  const submitMutation = useMutation({
    mutationFn: () => sportsService.submitMatchRatings(Number(id), {
      matchId: Number(id),
      ratings: (summary?.players ?? [])
        .map((p) => {
          const pid = p.playerId ?? p.userId ?? p.id ?? 0;
          return {
            playerId:     pid,
            userId:       p.userId ?? pid,
            stars:        ratings[pid]?.stars ?? 0,
            rating:       ratings[pid]?.stars ?? 0,
            reaction:     ratings[pid]?.reaction,
            isManOfMatch: ratings[pid]?.isManOfMatch ?? false,
          };
        })
        .filter((r) => r.stars > 0),
      playerRatings: (summary?.players ?? [])
        .map((p) => {
          const pid = p.playerId ?? p.userId ?? p.id ?? 0;
          return {
            userId: p.userId ?? pid,
            rating: ratings[pid]?.stars ?? 0,
            reaction: ratings[pid]?.reaction,
          };
        })
        .filter((r) => r.rating > 0),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-ratings', id] });
      Alert.alert('Ratings submitted!', 'Thanks for rating your fellow players.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to submit ratings.'),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (summary?.hasRated) {
    // Show result view
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.back}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>Match Ratings</Text>
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          {summary.manOfMatch && (
            <View style={s.momBanner}>
              <Text style={s.momEmoji}>⭐</Text>
              <View>
                <Text style={s.momLabel}>Man of the Match</Text>
                <Text style={s.momName}>{summary.manOfMatch.playerName || summary.manOfMatch.name || 'Player'}</Text>
                <Text style={s.momVotes}>{summary.manOfMatch.voteCount ?? 0} votes</Text>
              </View>
            </View>
          )}
          {(summary.players || []).map((p: any) => {
            const pid = p.playerId ?? p.userId ?? p.id ?? 0;
            const pName = p.playerName || p.name || 'Player';
            const avgRating = Number(p.averageRating ?? p.rating ?? 0);
            return (
              <View key={pid} style={s.resultRow}>
                <View style={s.resultAvatar}>
                  <Text style={s.resultAvatarText}>{getInitials(pName)}</Text>
                </View>
                <View style={s.resultInfo}>
                  <Text style={s.resultName}>{pName}</Text>
                  {p.flatNo && <Text style={s.resultFlat}>{p.flatNo}</Text>}
                </View>
                <View style={s.resultStats}>
                  <Text style={s.resultRating}>{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(Math.max(0, 5 - Math.round(avgRating)))}</Text>
                  <Text style={s.resultAvg}>{avgRating.toFixed(1)} avg</Text>
                  {p.topReaction && (
                    <Text style={s.resultReaction}>
                      {REACTIONS.find((r) => r.key === p.topReaction)?.emoji} {REACTIONS.find((r) => r.key === p.topReaction)?.label}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!summary?.canRate) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>‹</Text></TouchableOpacity>
          <Text style={s.title}>Match Ratings</Text>
        </View>
        <View style={s.cantRate}>
          <Text style={s.cantRateEmoji}>🔒</Text>
          <Text style={s.cantRateText}>Ratings are only available to players who participated in this match.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ratedCount = Object.values(ratings).filter((r) => r.stars > 0).length;
  const canSubmit  = ratedCount > 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Rate Your Players</Text>
        <TouchableOpacity
          onPress={() => submitMutation.mutate()}
          disabled={!canSubmit || submitMutation.isPending}
        >
          {submitMutation.isPending
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}>Submit</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Rate each player who participated in this match. Ratings are anonymous.
        </Text>

        {/* MOM section */}
        <View style={s.momSection}>
          <Text style={s.momSectionTitle}>⭐ Man of the Match — tap to vote</Text>
          <View style={s.momRow}>
            {(summary?.players ?? []).map((p) => {
              const pid = p.playerId ?? p.userId ?? p.id ?? 0;
              const pName = p.playerName || p.name || 'Player';
              return (
                <TouchableOpacity
                  key={pid}
                  style={[s.momChip, momId === pid && s.momChipActive]}
                  onPress={() => toggleMom(pid)}
                >
                  <Text style={s.momChipAvatar}>{getInitials(pName)}</Text>
                  <Text style={[s.momChipName, momId === pid && s.momChipNameActive]} numberOfLines={1}>
                    {pName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Per-player rating */}
        {(summary?.players ?? []).map((p: MatchRatingPlayerDto) => {
          const pid = p.playerId ?? p.userId ?? p.id ?? 0;
          const pName = p.playerName || p.name || 'Player';
          const r = ratings[pid];
          return (
            <View key={pid} style={[s.playerCard, momId === pid && s.playerCardMom]}>
              <View style={s.playerHeader}>
                <View style={s.playerAvatar}>
                  <Text style={s.playerAvatarText}>{getInitials(pName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.playerName}>{pName}</Text>
                  {p.flatNo && <Text style={s.playerFlat}>{p.flatNo}</Text>}
                </View>
                {momId === pid && <Text style={s.momStar}>⭐ MOM</Text>}
              </View>

              <StarPicker value={r?.stars ?? 0} onChange={(v) => setStars(pid, v)} />

              {/* Reactions */}
              <View style={s.reactions}>
                {REACTIONS.map((react) => (
                  <TouchableOpacity
                    key={react.key}
                    style={[s.reactionChip, r?.reaction === react.key && s.reactionChipActive]}
                    onPress={() => setReaction(pid, react.key)}
                  >
                    <Text style={s.reactionEmoji}>{react.emoji}</Text>
                    <Text style={[s.reactionLabel, r?.reaction === react.key && s.reactionLabelActive]}>
                      {react.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:               { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:              { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text, flex: 1 },
  submitBtn:          { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  submitBtnDisabled:  { color: COLORS.textMuted },
  scroll:             { padding: 16, gap: 14 },
  intro:              { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  momSection:         { backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#FCD34D' },
  momSectionTitle:    { fontSize: 13, fontWeight: '700', color: '#92400E' },
  momRow:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  momChip:            { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FCD34D' },
  momChipActive:      { backgroundColor: '#D97706', borderColor: '#B45309' },
  momChipAvatar:      { fontSize: 20 },
  momChipName:        { fontSize: 11, color: '#92400E', fontWeight: '600' },
  momChipNameActive:  { color: '#fff' },
  playerCard:         { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  playerCardMom:      { borderColor: '#D97706', backgroundColor: '#FFFBEB' },
  playerHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerAvatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  playerAvatarText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  playerName:         { fontSize: 15, fontWeight: '700', color: COLORS.text },
  playerFlat:         { fontSize: 12, color: COLORS.textMuted },
  momStar:            { fontSize: 12, fontWeight: '700', color: '#D97706', backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  reactions:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reactionChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  reactionChipActive: { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  reactionEmoji:      { fontSize: 14 },
  reactionLabel:      { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  reactionLabelActive:{ color: COLORS.primary, fontWeight: '700' },
  // Results view
  momBanner:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF3C7', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCD34D', marginBottom: 4 },
  momEmoji:           { fontSize: 40 },
  momLabel:           { fontSize: 11, fontWeight: '700', color: '#92400E', textTransform: 'uppercase' },
  momName:            { fontSize: 18, fontWeight: '800', color: '#78350F' },
  momVotes:           { fontSize: 12, color: '#92400E' },
  resultRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  resultAvatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  resultAvatarText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  resultInfo:         { flex: 1 },
  resultName:         { fontSize: 14, fontWeight: '600', color: COLORS.text },
  resultFlat:         { fontSize: 11, color: COLORS.textMuted },
  resultStats:        { alignItems: 'flex-end', gap: 2 },
  resultRating:       { fontSize: 14, color: '#D97706' },
  resultAvg:          { fontSize: 11, color: COLORS.textMuted },
  resultReaction:     { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  // Can't rate
  cantRate:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  cantRateEmoji:      { fontSize: 48 },
  cantRateText:       { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
});
