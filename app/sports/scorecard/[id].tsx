import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { InningsCard } from '@/components/sports/ScorecardTable';
import { COLORS } from '@/constants/config';

export default function CricketScorecardScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const { data: card, isLoading } = useQuery({
    queryKey: ['scorecard', id],
    queryFn:  () => sportsService.getScorecard(Number(id)),
  });

  async function handleShare() {
    if (!card) return;
    const first  = card.firstInnings;
    const second = card.secondInnings;
    const text = [
      `🏏 ${card.matchTitle}`,
      ``,
      `${first.battingTeamName}: ${first.totalRuns}/${first.wickets} (${first.overs} ov)`,
      second
        ? `${second.battingTeamName}: ${second.totalRuns}/${second.wickets} (${second.overs} ov)`
        : '',
      ``,
      card.result ?? '',
      card.manOfMatch ? `⭐ Man of the Match: ${card.manOfMatch.playerName}` : '',
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
  if (!card) return null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{card.matchTitle}</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.share}>Share</Text>
        </TouchableOpacity>
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
        {card.manOfMatch && (
          <View style={s.momCard}>
            <Text style={s.momLabel}>⭐ Man of the Match</Text>
            <Text style={s.momName}>{card.manOfMatch.playerName}</Text>
            {card.manOfMatch.contribution && (
              <Text style={s.momContrib}>{card.manOfMatch.contribution}</Text>
            )}
          </View>
        )}

        {/* First innings */}
        <InningsCard innings={card.firstInnings} title="1st Innings" />

        {/* Second innings */}
        {card.secondInnings && (
          <InningsCard innings={card.secondInnings} title="2nd Innings" />
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1E1B4B', gap: 10 },
  back:         { fontSize: 30, color: '#fff', lineHeight: 34, fontWeight: '300' },
  title:        { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  share:        { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  scroll:       { padding: 12, gap: 0 },
  resultBanner: { backgroundColor: '#1E1B4B', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, marginBottom: 10 },
  resultEmoji:  { fontSize: 32 },
  resultText:   { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  momCard:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FCD34D' },
  momLabel:     { fontSize: 12, fontWeight: '700', color: '#92400E' },
  momName:      { fontSize: 15, fontWeight: '800', color: '#78350F', flex: 1 },
  momContrib:   { fontSize: 12, color: '#92400E' },
});
