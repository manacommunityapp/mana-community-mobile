import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { sportsService, doesSportMatchFilter } from '@/services/sportsService';
import { SportsRegisterModal } from '@/components/sports/SportsRegisterModal';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { safeFormat } from '@/utils/dateUtils';
import { useAuth } from '@/hooks/useAuth';

const SPORT_EMOJI_MAP: Record<string, string> = {
  BADMINTON: '🏸',
  CRICKET: '🏏',
  FOOTBALL: '⚽',
  TENNIS: '🎾',
  TABLE_TENNIS: '🏓',
  PICKLEBALL: '🏓',
  SWIMMING: '🏊',
  BASKETBALL: '🏀',
  VOLLEYBALL: '🏐',
  CHESS: '♟️',
  CARROM: '🎯',
  SQUASH: '🎾',
};

const STATUS_TABS = ['ALL', 'CONFIRMED', 'PENDING'] as const;

export default function MyRegistrationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>('ALL');
  const [sportFilter, setSportFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const { data: rawRegs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sports-my-registrations'],
    queryFn: sportsService.getMyRegistrations,
    staleTime: 30_000,
  });

  const normalized = useMemo(() => {
    return (rawRegs || []).map((r: any) => {
      const st = String(r.status || '').toUpperCase();
      const isConfirmed = ['CONFIRMED', 'APPROVED', 'REGISTERED', 'ACTIVE'].includes(st);
      const isWithdrawn = ['WITHDRAWN', 'REJECTED', 'CANCELLED'].includes(st);
      const sport = r.sportName || 'Sport';
      const sportKey = sport.toUpperCase().replace(/\s+/g, '_');
      return {
        id: String(r.id),
        eventId: r.eventId ?? null,
        tournamentId: r.tournamentId ?? r.eventId ?? null,
        eventName: r.tournamentName || r.eventName || 'Tournament Event',
        sport,
        sportKey,
        emoji: SPORT_EMOJI_MAP[sportKey] || '🏅',
        categoryName: r.categoryName || null,
        matchType: r.matchType || null,
        playerName: r.playerName || r.teamName || user?.fullName || user?.name || 'Resident',
        relation: r.relation || null,
        flatNumber: r.flatNumber || r.flatNo || null,
        partnerName: r.partnerName || null,
        partnerFlatNumber: r.partnerFlatNumber || null,
        partnerStatus: r.partnerStatus || r.partnerConfirmationStatus || null,
        captainNomination: Boolean(r.captainNomination),
        eventDateStart: r.eventDateStart || null,
        startTime: r.startTime || null,
        venueName: r.venueName || null,
        rawStatus: st,
        statusGroup: isConfirmed ? 'CONFIRMED' : isWithdrawn ? 'WITHDRAWN' : 'PENDING',
        displayStatus: isConfirmed ? 'Confirmed' : isWithdrawn ? st : 'Pending',
      };
    });
  }, [rawRegs, user?.fullName, user?.name]);

  const sportsOptions = useMemo(() => {
    const unique = new Set<string>(['ALL']);
    normalized.forEach((r) => {
      if (r.sport) unique.add(r.sport);
    });
    return Array.from(unique);
  }, [normalized]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return normalized.filter((r) => {
      if (statusTab !== 'ALL' && r.statusGroup !== statusTab) return false;
      if (sportFilter !== 'ALL' && !doesSportMatchFilter(r.sport, sportFilter)) return false;
      if (!q) return true;
      return (
        r.eventName.toLowerCase().includes(q) ||
        r.sport.toLowerCase().includes(q) ||
        r.playerName.toLowerCase().includes(q) ||
        (r.categoryName || '').toLowerCase().includes(q) ||
        (r.partnerName || '').toLowerCase().includes(q)
      );
    });
  }, [normalized, statusTab, sportFilter, search]);

  const confirmedCount = normalized.filter((r) => r.statusGroup === 'CONFIRMED').length;
  const pendingCount = normalized.filter((r) => r.statusGroup === 'PENDING').length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>My Registrations</Text>
          <Text style={s.subTitle}>
            {normalized.length} total · {confirmedCount} confirmed{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={() => setShowRegister(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={s.newBtnText}>Register</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search event, category, player or partner..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Tabs */}
      <View style={s.tabRow}>
        {STATUS_TABS.map((t) => {
          const active = statusTab === t;
          const label = t === 'ALL' ? `All (${normalized.length})` : t === 'CONFIRMED' ? `Confirmed (${confirmedCount})` : `Pending (${pendingCount})`;
          return (
            <TouchableOpacity
              key={t}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setStatusTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sport Filter Chips */}
      {sportsOptions.length > 2 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sportScroll} style={s.sportWrap}>
          {sportsOptions.map((sp) => {
            const active = sportFilter === sp;
            return (
              <TouchableOpacity
                key={sp}
                style={[s.sportChip, active && s.sportChipActive]}
                onPress={() => setSportFilter(sp)}
                activeOpacity={0.8}
              >
                <Text style={[s.sportChipText, active && s.sportChipTextActive]}>
                  {sp === 'ALL' ? 'All Sports' : sp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* List */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => {
            const isConfirmed = item.statusGroup === 'CONFIRMED';
            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={item.tournamentId ? 0.82 : 1}
                onPress={() => {
                  if (item.tournamentId) {
                    router.push(`/sports/tournament/${item.tournamentId}` as any);
                  }
                }}
              >
                <View style={s.cardTop}>
                  <View style={s.emojiWrap}>
                    <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.eventTitle} numberOfLines={2}>{item.eventName}</Text>
                    <Text style={s.eventSub} numberOfLines={1}>
                      {item.sport}
                      {item.categoryName ? ` · ${item.categoryName}` : ''}
                      {item.matchType ? ` · ${item.matchType}` : ''}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, isConfirmed ? s.badgeOk : s.badgeWarn]}>
                    <Ionicons name={isConfirmed ? 'checkmark-circle' : 'time-outline'} size={11} color={isConfirmed ? '#065F46' : '#92400E'} />
                    <Text style={[s.statusText, { color: isConfirmed ? '#065F46' : '#92400E' }]}>{item.displayStatus}</Text>
                  </View>
                </View>

                <View style={s.metaGrid}>
                  <View style={s.metaItem}>
                    <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
                    <Text style={s.metaText} numberOfLines={1}>
                      {item.playerName}
                      {item.relation && item.relation.toUpperCase() !== 'SELF' ? ` (${item.relation})` : ''}
                      {item.flatNumber ? ` · ${item.flatNumber}` : ''}
                    </Text>
                  </View>
                  {item.partnerName && (
                    <View style={s.metaItem}>
                      <Ionicons name="people-outline" size={12} color={COLORS.primary} />
                      <Text style={s.metaText} numberOfLines={1}>
                        Partner: {item.partnerName}
                        {item.partnerStatus ? ` (${item.partnerStatus})` : ''}
                      </Text>
                    </View>
                  )}
                  {item.eventDateStart && (
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                      <Text style={s.metaText}>
                        {safeFormat(item.eventDateStart, 'dd MMM yyyy', 'TBD')}
                        {item.startTime ? ` · ${item.startTime}` : ''}
                      </Text>
                    </View>
                  )}
                  {item.venueName && (
                    <View style={s.metaItem}>
                      <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                      <Text style={s.metaText} numberOfLines={1}>{item.venueName}</Text>
                    </View>
                  )}
                </View>

                <View style={s.cardFooter}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {item.captainNomination && (
                      <View style={s.capBadge}>
                        <Text style={{ fontSize: 10 }}>👑</Text>
                        <Text style={s.capText}>Captain</Text>
                      </View>
                    )}
                  </View>
                  {item.tournamentId && (
                    <View style={s.linkRow}>
                      <Text style={s.linkText}>View Tournament</Text>
                      <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="clipboard-outline" size={34} color={COLORS.primary} />
              </View>
              <Text style={s.emptyTitle}>No registrations found</Text>
              <Text style={s.emptySub}>
                {search || sportFilter !== 'ALL' || statusTab !== 'ALL'
                  ? 'Try adjusting your filters or search query.'
                  : 'Register for community tournaments and sports categories to track them here.'}
              </Text>
              <TouchableOpacity style={s.emptyCta} onPress={() => setShowRegister(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={15} color="#fff" />
                <Text style={s.emptyCtaText}>Register Now</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <SportsRegisterModal
        visible={showRegister}
        onClose={() => setShowRegister(false)}
        onRegistered={() => {
          qc.invalidateQueries({ queryKey: ['sports-my-registrations'] });
          qc.invalidateQueries({ queryKey: ['sports-dashboard-stats'] });
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  subTitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  newBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: '#E2E7FF',
    borderRadius: RADIUS.md,
    padding: 3,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: 7, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.surface, ...SHADOWS.sm },
  tabText: { fontSize: 11.5, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
  sportWrap: { maxHeight: 46, marginTop: 8 },
  sportScroll: { paddingHorizontal: 14, gap: 6, alignItems: 'center' },
  sportChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sportChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sportChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  sportChipTextActive: { color: '#fff', fontWeight: '700' },
  listContent: { padding: 14, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 9,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  eventSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeOk: { backgroundColor: '#ECFDF5' },
  badgeWarn: { backgroundColor: '#FFFBEB' },
  statusText: { fontSize: 10, fontWeight: '800' },
  metaGrid: { gap: 5, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11.5, color: COLORS.textSecondary, flex: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  capText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  linkText: { fontSize: 11.5, fontWeight: '700', color: COLORS.primary },
  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 24, gap: 8 },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12.5, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    marginTop: 6,
  },
  emptyCtaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
