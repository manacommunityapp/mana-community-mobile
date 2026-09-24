import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { BadgeCard, BadgeRow } from '@/components/sports/BadgeCard';
import { COLORS } from '@/constants/config';
import { SPORT_EMOJI } from '@/components/sports/TournamentCard';
import { format } from 'date-fns';
import type { SportStatDto } from '@/types/api';

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Text key={i} style={{ fontSize: 14, color: i < Math.round(value) ? '#F59E0B' : '#E5E7EB' }}>★</Text>
      ))}
      <Text style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>
        {value.toFixed(1)}
      </Text>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={sp.pill}>
      <Text style={sp.value}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  pill:  { alignItems: 'center', flex: 1 },
  value: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  label: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center' },
});

function SportCard({ stat }: { stat: SportStatDto }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={sc.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
    >
      <View style={sc.header}>
        <Text style={sc.emoji}>{SPORT_EMOJI[stat.sport] ?? '🏅'}</Text>
        <View style={sc.info}>
          <Text style={sc.sport}>{stat.sport.replace('_', ' ')}</Text>
          <Text style={sc.winRate}>{(stat.winRate * 100).toFixed(0)}% win rate</Text>
        </View>
        <View style={sc.quickStats}>
          <Text style={sc.qVal}>{stat.wins}W</Text>
          <Text style={sc.qSep}>/</Text>
          <Text style={sc.qVal}>{stat.losses}L</Text>
          {stat.draws > 0 && <><Text style={sc.qSep}>/</Text><Text style={sc.qVal}>{stat.draws}D</Text></>}
        </View>
        <Text style={sc.arrow}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={sc.details}>
          <View style={sc.statsGrid}>
            <StatPill label="Matches" value={stat.matchesPlayed} />
            <StatPill label="Tournaments" value={stat.tournaments} />
            <StatPill label="Trophies" value={stat.trophies} />
          </View>
          {/* Cricket specifics */}
          {stat.sport === 'CRICKET' && (stat.totalRuns != null || stat.totalWickets != null) && (
            <View style={sc.cricketStats}>
              {stat.totalRuns != null && (
                <View style={sc.statsGrid}>
                  <StatPill label="Total Runs" value={stat.totalRuns} />
                  <StatPill label="Highest" value={stat.highestScore ?? 0} />
                  <StatPill label="Avg" value={stat.battingAverage?.toFixed(1) ?? '—'} />
                </View>
              )}
              {stat.totalWickets != null && (
                <View style={sc.statsGrid}>
                  <StatPill label="Wickets" value={stat.totalWickets} />
                  <StatPill label="Best" value={stat.bestBowling ?? '—'} />
                </View>
              )}
            </View>
          )}
          {/* Football specifics */}
          {stat.sport === 'FOOTBALL' && stat.goals != null && (
            <View style={sc.statsGrid}>
              <StatPill label="Goals" value={stat.goals} />
              <StatPill label="Assists" value={stat.assists ?? 0} />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card:       { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji:      { fontSize: 24 },
  info:       { flex: 1 },
  sport:      { fontSize: 14, fontWeight: '700', color: COLORS.text },
  winRate:    { fontSize: 12, color: COLORS.textMuted },
  quickStats: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  qVal:       { fontSize: 13, fontWeight: '700', color: COLORS.text },
  qSep:       { fontSize: 12, color: COLORS.textMuted },
  arrow:      { fontSize: 12, color: COLORS.textMuted },
  details:    { gap: 10 },
  statsGrid:  { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 10, paddingVertical: 12, gap: 4 },
  cricketStats:{ gap: 8 },
});

export default function PlayerProfileScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['player-profile', id],
    queryFn:  () => sportsService.getPlayerProfile(Number(id)),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }
  if (!profile) return null;

  const earnedBadges  = [...profile.badges].filter((b) => b.isEarned)
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
  const lockedBadges  = profile.badges.filter((b) => !b.isEarned);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Player Profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View style={s.identityCard}>
          <View style={s.bigAvatar}>
            <Text style={s.bigAvatarText}>{profile.name[0]}</Text>
          </View>
          <View style={s.identityInfo}>
            <Text style={s.name}>{profile.name}</Text>
            {profile.flatNo && <Text style={s.flat}>🏠 {profile.flatNo}</Text>}
            <StarRating value={profile.communityRating} />
            {profile.ratingCount > 0 && (
              <Text style={s.ratingCount}>{profile.ratingCount} peer ratings</Text>
            )}
          </View>
        </View>

        {/* Quick summary */}
        <View style={s.summaryRow}>
          <StatPill label="Matches"  value={profile.totalMatches}  />
          <View style={s.summaryDivider} />
          <StatPill label="Trophies" value={profile.totalTrophies} />
          <View style={s.summaryDivider} />
          <StatPill label="Badges"   value={earnedBadges.length}   />
        </View>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🏅 Badges Earned</Text>
            <BadgeRow badges={profile.badges} maxVisible={8} />
          </View>
        )}

        {/* Sport stats */}
        {profile.sportStats.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📊 Career Stats</Text>
            <View style={s.cards}>
              {profile.sportStats.map((stat) => (
                <SportCard key={stat.sport} stat={stat} />
              ))}
            </View>
          </View>
        )}

        {/* Recent matches */}
        {profile.recentMatches.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🕐 Recent Matches</Text>
            {profile.recentMatches.map((m, i) => (
              <TouchableOpacity
                key={i}
                style={s.matchRow}
                onPress={() => router.push(`/sports/match/${m.matchId}`)}
              >
                <Text style={s.matchSport}>{SPORT_EMOJI[m.sport]}</Text>
                <Text style={s.matchResult} numberOfLines={1}>{m.result}</Text>
                <Text style={s.matchDate}>{format(new Date(m.date), 'dd MMM')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Locked badges */}
        {lockedBadges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🔒 Locked Badges</Text>
            <View style={s.lockedGrid}>
              {lockedBadges.slice(0, 6).map((b) => (
                <BadgeCard key={b.id} badge={b} size="sm" />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:           { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:          { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  scroll:         { padding: 16, gap: 16 },
  identityCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  bigAvatar:      { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText:  { color: '#fff', fontWeight: '900', fontSize: 26 },
  identityInfo:   { flex: 1, gap: 4 },
  name:           { fontSize: 20, fontWeight: '800', color: COLORS.text },
  flat:           { fontSize: 12, color: COLORS.textMuted },
  ratingCount:    { fontSize: 11, color: COLORS.textMuted },
  summaryRow:     { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.border },
  summaryDivider: { width: 1, backgroundColor: COLORS.border },
  section:        { gap: 10 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cards:          { gap: 8 },
  matchRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  matchSport:     { fontSize: 20 },
  matchResult:    { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  matchDate:      { fontSize: 12, color: COLORS.textMuted },
  lockedGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
