import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { sportsService } from '@/services/sportsService';
import { InningsCard } from '@/components/sports/ScorecardTable';
import { useAppBack } from '@/hooks/useAppBack';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

export default function CricketScorecardScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { goBack } = useAppBack({ fallbackRoute: `/sports/match/${id}` });
  const { user, hasRole, isAnyAdmin } = useAuth();

  const canScore = user != null && (
    isAnyAdmin ||
    hasRole('ADMIN', 'SUPER_ADMIN', 'SPORTS_ADMIN', 'SPORTS_REFEREE', 'MODERATOR')
  );

  const { data: card, isLoading } = useQuery({
    queryKey: ['scorecard', id],
    queryFn:  () => sportsService.getScorecard(Number(id)),
  });

  const { data: match } = useQuery({
    queryKey: ['match', id],
    queryFn: () => sportsService.getMatch(Number(id)),
  });

  async function handleShare() {
    if (!card) return;
    const first  = card.firstInnings || card.innings?.[0];
    const second = card.secondInnings || card.innings?.[1];
    const momName = card.manOfMatch?.playerName || card.manOfMatch?.name;
    const text = [
      `🏏 ${card.matchTitle || match?.tournamentName || 'Cricket Match'}`,
      ``,
      first ? `${first.battingTeamName || first.teamName}: ${first.totalRuns}/${first.wickets ?? first.totalWickets} (${first.overs ?? first.totalOvers} ov)` : '',
      second
        ? `${second.battingTeamName || second.teamName}: ${second.totalRuns}/${second.wickets ?? second.totalWickets} (${second.overs ?? second.totalOvers} ov)`
        : '',
      ``,
      card.result ?? '',
      momName ? `⭐ Man of the Match: ${momName}` : '',
      ``,
      `via Mana Community`,
    ].filter(Boolean).join('\n');
    Share.share({ message: text });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  const matchTitle = card?.matchTitle || (match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Match Scorecard');

  if (!card) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} hitSlop={8} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>{matchTitle}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.emptyContainer}>
          <Text style={s.emptyEmoji}>📋</Text>
          <Text style={s.emptyTitle}>No Detailed Scorecard Yet</Text>
          <Text style={s.emptySub}>
            The detailed scorecard for this match has not been entered or published yet.
          </Text>

          {canScore && (
            <TouchableOpacity
              style={s.entryBtn}
              onPress={() => router.push(`/sports/scorecard/entry/${id}` as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={s.entryBtnText}>Enter / Publish Scorecard</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.matchDetailBtn}
            onPress={() => router.push(`/sports/match/${id}` as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="stats-chart" size={16} color={COLORS.primary} />
            <Text style={s.matchDetailBtnText}>View Match Summary</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const firstInnings = card.firstInnings || card.innings?.[0];
  const secondInnings = card.secondInnings || card.innings?.[1];
  const momName = card.manOfMatch?.playerName || card.manOfMatch?.name;
  const momContrib = card.manOfMatch?.contribution || card.manOfMatch?.performance;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{matchTitle}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {canScore && (
            <TouchableOpacity
              onPress={() => router.push(`/sports/scorecard/entry/${id}` as any)}
              hitSlop={8}
              style={s.editBtn}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare} hitSlop={8} style={s.shareBtn}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Result banner */}
        {card.result && (
          <View style={s.resultBanner}>
            <Text style={s.resultEmoji}>🏆</Text>
            <Text style={s.resultText}>{card.result}</Text>
          </View>
        )}

        {/* Man of the Match */}
        {card.manOfMatch && momName && (
          <View style={s.momCard}>
            <Text style={s.momLabel}>⭐ Man of the Match</Text>
            <Text style={s.momName}>{momName}</Text>
            {momContrib && (
              <Text style={s.momContrib}>{momContrib}</Text>
            )}
          </View>
        )}

        {/* First innings */}
        {firstInnings && (
          <InningsCard innings={firstInnings} title="1st Innings" />
        )}

        {/* Second innings */}
        {secondInnings && (
          <InningsCard innings={secondInnings} title="2nd Innings" />
        )}

        {canScore && (
          <TouchableOpacity
            style={s.editFooterBtn}
            onPress={() => router.push(`/sports/scorecard/entry/${id}` as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={s.editFooterText}>Edit Scorecard Entries</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1E1B4B', gap: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: '800', color: '#fff', flex: 1 },
  editBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  shareBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 12, gap: 0 },
  resultBanner: { backgroundColor: '#1E1B4B', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, marginBottom: 10 },
  resultEmoji:  { fontSize: 32 },
  resultText:   { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  momCard:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FCD34D' },
  momLabel:     { fontSize: 12, fontWeight: '700', color: '#92400E' },
  momName:      { fontSize: 15, fontWeight: '800', color: '#78350F', flex: 1 },
  momContrib:   { fontSize: 12, color: '#92400E' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  emptyEmoji:   { fontSize: 48, marginBottom: 4 },
  emptyTitle:   { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptySub:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  entryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 12, ...SHADOWS.sm },
  entryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  matchDetailBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md },
  matchDetailBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  editFooterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 12 },
  editFooterText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
