import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS, FONTS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { fetchAllActivity, type ActivityCategory, type ActivityItem } from '@/services/activityService';
import { ActivityCard } from '@/components/activity/ActivityCard';

const FILTERS: Array<{ key: ActivityCategory; label: string; emoji: string }> = [
  { key: 'ALL',          label: 'All',         emoji: '📋' },
  { key: 'ORDERS',       label: 'Orders',       emoji: '🛍️' },
  { key: 'BOOKINGS',     label: 'Bookings',     emoji: '📅' },
  { key: 'PAYMENTS',     label: 'Payments',     emoji: '💳' },
  { key: 'COMPLAINTS',   label: 'Complaints',   emoji: '🎫' },
  { key: 'SPORTS_EVENTS',label: 'Sports',       emoji: '🏆' },
  { key: 'VISITORS',     label: 'Visitors',     emoji: '🛡️' },
];

const EMPTY_MESSAGES: Record<ActivityCategory, string> = {
  ALL:          'Your activity history will appear here.',
  ORDERS:       'No food or store orders yet.',
  BOOKINGS:     'No amenity or trip bookings yet.',
  PAYMENTS:     'No payment receipts found.',
  COMPLAINTS:   'No maintenance requests raised.',
  SPORTS_EVENTS:'No tournament or event registrations.',
  VISITORS:     'No visitor passes issued.',
};

export default function ActivityLogScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ActivityCategory>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const { data: items = [], isLoading, refetch } = useQuery<ActivityItem[]>({
    queryKey: ['activity-all'],
    queryFn: fetchAllActivity,
    staleTime: 2 * 60 * 1000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const filtered = useMemo(
    () => (filter === 'ALL' ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  const handlePress = useCallback(
    (item: ActivityItem) => { if (item.route) router.push(item.route as any); },
    [router],
  );

  const counts = useMemo(() => {
    const map: Partial<Record<ActivityCategory, number>> = {};
    for (const item of items) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return map;
  }, [items]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Activity</Text>
          {items.length > 0 && (
            <Text style={styles.headerSub}>{items.length} total records</Text>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const count = f.key === 'ALL' ? items.length : (counts[f.key] ?? 0);
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.chipEmoji}>{f.emoji}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {f.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.badge, active && styles.badgeActive]}>
                    <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={THEME.brandDark} size="large" />
          <Text style={styles.loadingText}>Loading your activity...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.brandDark}
            />
          }
          renderItem={({ item }) => (
            <ActivityCard item={item} onPress={handlePress} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 36 }}>
                {FILTERS.find((f) => f.key === filter)?.emoji ?? '📋'}
              </Text>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>{EMPTY_MESSAGES[filter]}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: THEME.background },
  header:        {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1,
    borderBottomColor: THEME.border, ...SHADOWS.sm, gap: 12,
  },
  backBtn:       {
    width: 36, height: 36, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  headerSub:     { fontSize: 11, color: THEME.textSecondary, marginTop: 1 },
  filterWrap:    { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border },
  filterScroll:  { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 8 },
  chip:          {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: '#F1F5F9',
  },
  chipActive:    { backgroundColor: THEME.brandDark },
  chipEmoji:     { fontSize: 13 },
  chipLabel:     { fontSize: 12, fontWeight: '600', color: THEME.textSecondary },
  chipLabelActive:{ color: '#FFFFFF', fontWeight: '700' },
  badge:         {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#E2E8F0', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeActive:   { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText:     { fontSize: 10, fontWeight: '700', color: '#475569' },
  badgeTextActive:{ color: '#FFFFFF' },
  listContent:   { padding: SPACING.md, paddingBottom: 40, gap: 10 },
  loadingWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:   { fontSize: 13, color: THEME.textSecondary },
  emptyWrap:     { alignItems: 'center', paddingTop: 70, gap: 8, paddingHorizontal: 32 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: THEME.textPrimary },
  emptySub:      { fontSize: 12, color: THEME.textSecondary, textAlign: 'center', maxWidth: 240 },
});
