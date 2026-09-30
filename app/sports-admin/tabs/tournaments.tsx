import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { SPORTS_ADMIN_COLORS } from '@/constants/sportsAdminTheme';
import { sportsAdminService, type TournamentSummary } from '@/services/sportsAdminService';

const FILTERS = ['All', 'ONGOING', 'REGISTRATION_OPEN', 'UPCOMING', 'COMPLETED'] as const;

export default function TournamentsScreen() {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await sportsAdminService.getTournaments(
      undefined,
      filter === 'All' ? undefined : filter,
    );
    setTournaments(data);
  };

  useEffect(() => { load(); }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusMeta: Record<string, { color: string; bg: string }> = {
    ONGOING: { color: SPORTS_ADMIN_COLORS.accent, bg: SPORTS_ADMIN_COLORS.accentLight },
    REGISTRATION_OPEN: { color: '#2563EB', bg: '#DBEAFE' },
    UPCOMING: { color: '#D97706', bg: '#FEF3C7' },
    COMPLETED: { color: COLORS.textMuted, bg: COLORS.surfaceAlt },
  };

  const renderItem = ({ item }: { item: TournamentSummary }) => {
    const meta = statusMeta[item.status] || statusMeta.UPCOMING;
    const progress = item.maxTeams > 0 ? item.teamsRegistered / item.maxTeams : 0;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.sportBadge, { backgroundColor: SPORTS_ADMIN_COLORS.accentLight }]}>
            <Ionicons name="trophy" size={14} color={SPORTS_ADMIN_COLORS.accent} />
            <Text style={[s.sportText, { color: SPORTS_ADMIN_COLORS.accentDark }]}>{formatSport(item.sport)}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[s.statusText, { color: meta.color }]}>{formatStatus(item.status)}</Text>
          </View>
        </View>
        <Text style={s.cardTitle}>{item.name}</Text>
        <Text style={s.cardMeta}>Format: {item.format} · Starts: {item.startDate.split('T')[0]}</Text>
        {item.registrationDeadline && (
          <Text style={s.cardMeta}>Registration deadline: {item.registrationDeadline.split('T')[0]}</Text>
        )}
        <View style={s.progressRow}>
          <Text style={s.progressLabel}>{item.teamsRegistered}/{item.maxTeams} teams</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Tournaments</Text>
        <Text style={s.headerSub}>{tournaments.length} total</Text>
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
              {f === 'All' ? 'All' : formatStatus(f)}
            </Text>
          </TouchableOpacity>
        )}
      />
      <FlatList
        data={tournaments}
        keyExtractor={t => String(t.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SPORTS_ADMIN_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="trophy-outline" size={48} color={COLORS.border} />
            <Text style={s.emptyText}>No tournaments found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatSport(sport: string): string {
  return sport.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}
function formatStatus(status: string): string {
  return status.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sportBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3,
  },
  sportText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 9, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, width: 80 },
  progressBar: { flex: 1, height: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: SPORTS_ADMIN_COLORS.accent, borderRadius: 3 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
