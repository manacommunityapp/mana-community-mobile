import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { sportsAuctionService } from '@/services/sportsAuctionService';
import type { SportsAuctionConfigResponse } from '@/types/api';

type Tab = 'active' | 'past';

const STATUS_COLOR: Record<string, string> = {
  LIVE:         '#dc2626',
  REGISTRATION: '#2563eb',
  DRAFT:        '#6b7280',
  ENDED:        '#9ca3af',
  CANCELLED:    '#9ca3af',
};

export default function SportsAuctionListScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('active');

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['auction-list'],
    queryFn: async () => {
      const [all, watched] = await Promise.all([
        sportsAuctionService.getMyConfigs(),
        sportsAuctionService.getWatchList(),
      ]);
      return { configs: all, watchSet: new Set(watched) };
    },
  });

  const configs = data?.configs ?? [];
  const watchSet = data?.watchSet ?? new Set<number>();

  const displayed = configs.filter((c) => {
    const st = String(c.status || '').toUpperCase();
    return tab === 'active'
      ? ['DRAFT', 'REGISTRATION', 'REGISTRATION_OPEN', 'OPEN', 'LIVE', 'ACTIVE', 'UPCOMING', 'PAUSED'].includes(st)
      : ['ENDED', 'COMPLETED', 'CANCELLED'].includes(st);
  });

  function formatBudget(raw?: number): string {
    if (!raw || raw <= 0) return 'TBD';
    if (raw >= 100000) return `₹${(raw / 100000).toFixed(1)}L/team`;
    if (raw >= 1000) return `₹${Math.round(raw / 1000)}K/team`;
    return `₹${raw}/team`;
  }

  async function toggleWatch(id: number) {
    if (watchSet.has(id)) {
      await sportsAuctionService.unwatchAuction(id);
    } else {
      await sportsAuctionService.watchAuction(id);
    }
    qc.invalidateQueries({ queryKey: ['auction-list'] });
  }

  function renderItem({ item }: { item: SportsAuctionConfigResponse }) {
    const isLive    = item.status === 'LIVE';
    const isWatched = watchSet.has(item.id);
    return (
      <TouchableOpacity
        style={[s.card, isLive && s.liveCard]}
        onPress={() => router.push(`/sports/auction/${item.id}` as never)}
        activeOpacity={0.85}
      >
        <View style={s.cardHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.eventName} numberOfLines={1}>{item.eventName}</Text>
            <Text style={s.meta}>{item.sportName} · {item.seasonName}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[item.status] ?? '#6b7280' }]}>
            {isLive && <View style={s.liveDot} />}
            <Text style={s.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <StatChip icon="people-outline"  label={`${item.totalTeams} teams`} />
          <StatChip icon="person-outline"  label={`${item.totalPlayers} players`} />
          <StatChip icon="wallet-outline"  label={formatBudget(item.budgetPerTeam)} />
        </View>

        <View style={s.cardFooter}>
          <Text style={s.formatText}>{item.auctionFormat?.replace('_', ' ')}</Text>
          <TouchableOpacity
            style={[s.watchBtn, isWatched && s.watchBtnActive]}
            onPress={() => toggleWatch(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isWatched ? 'eye' : 'eye-outline'}
              size={14}
              color={isWatched ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[s.watchText, isWatched && s.watchTextActive]}>
              {isWatched ? 'Watching' : 'Watch'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Player Auctions</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={s.tabRow}>
        {(['active', 'past'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'active' ? 'Active' : 'Past'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => { refetch(); }} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="trophy-outline" size={40} color={COLORS.textMuted} />
              <Text style={s.emptyText}>No {tab === 'active' ? 'active' : 'past'} auctions</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function StatChip({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={s.chip}>
      <Ionicons name={icon} size={12} color={COLORS.textMuted} />
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  back:         { fontSize: 28, color: COLORS.primary, lineHeight: 32, width: 32 },
  title:        { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  tabRow:       { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tab:          { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText:      { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive:{ color: COLORS.primary },
  card:         { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm, gap: 10 },
  liveCard:     { borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  eventName:    { fontSize: 15, fontWeight: '700', color: COLORS.text },
  meta:         { fontSize: 12, color: COLORS.textMuted },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  liveDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  statusText:   { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  statsRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.background, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  chipText:     { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formatText:   { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  watchBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: COLORS.border },
  watchBtnActive:{ borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  watchText:    { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  watchTextActive: { color: COLORS.primary },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyText:    { fontSize: 14, color: COLORS.textMuted },
});
