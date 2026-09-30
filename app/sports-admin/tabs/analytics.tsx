import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { SPORTS_ADMIN_COLORS } from '@/constants/sportsAdminTheme';
import { sportsAdminService, type SportsAnalyticsData } from '@/services/sportsAdminService';

export default function SportsAnalyticsScreen() {
  const [data, setData] = useState<SportsAnalyticsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const d = await sportsAdminService.getAnalytics();
    setData(d);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!data) return <View style={s.container} />;

  const maxSportCount = Math.max(...data.tournamentsBySport.map(d => d.count), 1);
  const maxMatchCount = Math.max(...data.matchesByStatus.map(d => d.count), 1);
  const maxParticipation = Math.max(...data.participationTrend.map(d => d.players), 1);

  const barColors = ['#059669', '#34D399', '#4F46E5', '#D97706', '#DC2626', '#7C3AED'];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SPORTS_ADMIN_COLORS.accent} />}
      >
        <View style={s.header}>
          <Text style={s.headerTitle}>Analytics</Text>
          <Text style={s.headerSub}>Sports overview</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Tournaments by Sport</Text>
          {data.tournamentsBySport.map((item, i) => (
            <View key={item.sport} style={s.barRow}>
              <Text style={s.barLabel}>{item.sport}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${(item.count / maxSportCount) * 100}%`, backgroundColor: barColors[i % barColors.length] }]} />
              </View>
              <Text style={s.barValue}>{item.count}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Matches by Status</Text>
          <View style={s.donutRow}>
            {data.matchesByStatus.map((item, i) => {
              const total = data.matchesByStatus.reduce((s, d) => s + d.count, 0);
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <View key={item.status} style={s.donutItem}>
                  <View style={[s.donutDot, { backgroundColor: barColors[i % barColors.length] }]} />
                  <View>
                    <Text style={s.donutLabel}>{item.status}</Text>
                    <Text style={s.donutValue}>{item.count} ({pct}%)</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Participation Trend</Text>
          <View style={s.chartRow}>
            {data.participationTrend.map(item => (
              <View key={item.month} style={s.chartCol}>
                <View style={s.chartBarWrap}>
                  <View style={[s.chartBar, { height: `${(item.players / maxParticipation) * 100}%` }]} />
                </View>
                <Text style={s.chartLabel}>{item.month}</Text>
                <Text style={s.chartValue}>{item.players}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Top Players</Text>
          {data.topPlayers.map((p, i) => (
            <View key={p.name} style={s.playerRow}>
              <Text style={s.rankText}>#{i + 1}</Text>
              <View style={s.playerInfo}>
                <Text style={s.playerName}>{p.name}</Text>
                <Text style={s.playerMeta}>{p.wins} wins</Text>
              </View>
              <View style={s.ratingBadge}>
                <Ionicons name="star" size={10} color="#D97706" />
                <Text style={s.ratingText}>{p.rating}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Sport Popularity</Text>
          {data.sportPopularity.map(item => (
            <View key={item.sport} style={s.popRow}>
              <Text style={s.popSport}>{item.sport}</Text>
              <View style={s.popStats}>
                <View style={s.popStat}>
                  <Ionicons name="football-outline" size={12} color={COLORS.textMuted} />
                  <Text style={s.popValue}>{item.matches}</Text>
                </View>
                <View style={s.popStat}>
                  <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
                  <Text style={s.popValue}>{item.players}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  section: {
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 10,
    borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, width: 80 },
  barTrack: { flex: 1, height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { fontSize: 12, fontWeight: '800', color: COLORS.text, width: 24, textAlign: 'right' },

  donutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  donutItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '40%' },
  donutDot: { width: 10, height: 10, borderRadius: 5 },
  donutLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  donutValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  chartCol: { alignItems: 'center', flex: 1 },
  chartBarWrap: { width: 24, height: 90, justifyContent: 'flex-end' },
  chartBar: { width: 24, backgroundColor: SPORTS_ADMIN_COLORS.accent, borderRadius: 4 },
  chartLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginTop: 4 },
  chartValue: { fontSize: 10, fontWeight: '700', color: COLORS.text },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rankText: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, width: 26 },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  playerMeta: { fontSize: 11, color: COLORS.textMuted },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.xs,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: '#D97706' },

  popRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  popSport: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  popStats: { flexDirection: 'row', gap: 16 },
  popStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  popValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});
