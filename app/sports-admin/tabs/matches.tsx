import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { SPORTS_ADMIN_COLORS } from '@/constants/sportsAdminTheme';
import { sportsAdminService, type MatchSummary } from '@/services/sportsAdminService';

const FILTERS = ['All', 'LIVE', 'SCHEDULED', 'COMPLETED'] as const;

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await sportsAdminService.getMatches(
      filter === 'All' ? undefined : filter,
    );
    setMatches(data);
  };

  useEffect(() => { load(); }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusMeta: Record<string, { color: string; bg: string; icon: string }> = {
    LIVE: { color: '#DC2626', bg: '#FEE2E2', icon: 'pulse' },
    SCHEDULED: { color: '#4F46E5', bg: '#EEF2FF', icon: 'time' },
    COMPLETED: { color: COLORS.textMuted, bg: COLORS.surfaceAlt, icon: 'checkmark-circle' },
    CANCELLED: { color: '#D97706', bg: '#FEF3C7', icon: 'close-circle' },
  };

  const renderItem = ({ item }: { item: MatchSummary }) => {
    const meta = statusMeta[item.status] || statusMeta.SCHEDULED;
    const isLive = item.status === 'LIVE';
    return (
      <View style={[s.card, isLive && { borderLeftColor: '#DC2626', borderLeftWidth: 3 }]}>
        <View style={s.cardTop}>
          <Text style={s.tournamentLabel}>{item.tournamentName}</Text>
          <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon as any} size={10} color={meta.color} />
            <Text style={[s.statusText, { color: meta.color }]}>{item.status}</Text>
          </View>
        </View>
        <View style={s.teamsRow}>
          <View style={s.teamCol}>
            <Text style={s.teamName} numberOfLines={1}>{item.teamA}</Text>
            {item.scoreA && <Text style={[s.teamScore, isLive && s.liveScore]}>{item.scoreA}</Text>}
          </View>
          <Text style={s.vsText}>VS</Text>
          <View style={[s.teamCol, { alignItems: 'flex-end' }]}>
            <Text style={s.teamName} numberOfLines={1}>{item.teamB}</Text>
            {item.scoreB && <Text style={[s.teamScore, isLive && s.liveScore]}>{item.scoreB}</Text>}
          </View>
        </View>
        <View style={s.cardFooter}>
          <View style={s.footerItem}>
            <Ionicons name="football-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.footerText}>{formatSport(item.sport)}</Text>
          </View>
          {item.venue && (
            <View style={s.footerItem}>
              <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
              <Text style={s.footerText}>{item.venue}</Text>
            </View>
          )}
          <View style={s.footerItem}>
            <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.footerText}>{formatDate(item.scheduledAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Matches</Text>
        <Text style={s.headerSub}>{matches.length} total</Text>
      </View>
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={f => f}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'All' ? 'All' : f}
            </Text>
          </TouchableOpacity>
        )}
      />
      <FlatList
        data={matches}
        keyExtractor={m => String(m.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SPORTS_ADMIN_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="football-outline" size={48} color={COLORS.border} />
            <Text style={s.emptyText}>No matches found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatSport(sport: string): string {
  return sport.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: SPORTS_ADMIN_COLORS.accent,
    borderColor: SPORTS_ADMIN_COLORS.accent,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: 12, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tournamentLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusText: { fontSize: 9, fontWeight: '800' },

  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  teamCol: { flex: 1, gap: 2 },
  teamName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  teamScore: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  liveScore: { color: SPORTS_ADMIN_COLORS.accent },
  vsText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, paddingHorizontal: 10 },

  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerText: { fontSize: 11, color: COLORS.textMuted },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
