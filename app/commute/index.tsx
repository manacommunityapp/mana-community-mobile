import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { commuteService } from '@/services/commuteService';
import { RideCard } from '@/components/commute/RideCard';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

const QUICK_ACTIONS = [
  { icon: 'search' as const,     label: 'Find a Ride',  route: '/commute/find-rides', color: '#2563EB', bg: '#EFF6FF' },
  { icon: 'add-circle' as const, label: 'Offer a Ride', route: '/commute/offer-ride', color: '#059669', bg: '#ECFDF5' },
  { icon: 'receipt' as const,    label: 'My Rides',     route: '/commute/my-rides',    color: '#7C3AED', bg: '#F5F3FF' },
];

export default function CommuteHubScreen() {
  const router = useRouter();

  const goHome = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tabs/feed');
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['commute-stats'],
    queryFn:  commuteService.getStats,
  });

  const {
    data: ridesPage,
    isLoading: loadingRides,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['commute-upcoming'],
    queryFn:  () => commuteService.getUpcomingRides(undefined, 0),
  });

  const rides = ridesPage?.content ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Community Carpool</Text>
          <Text style={s.headerSubtitle}>Share rides with your neighbors</Text>
        </View>
        <TouchableOpacity
          style={s.offerHeaderBtn}
          onPress={() => router.push('/commute/offer-ride')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.offerHeaderBtnText}>Offer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ── Stats ─────────────────────────────────────────────────── */}
        {stats && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <View style={[s.statIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="car" size={16} color="#2563EB" />
              </View>
              <Text style={s.statNum}>{stats.activeRides}</Text>
              <Text style={s.statLabel}>Active Rides</Text>
            </View>
            <View style={s.statCard}>
              <View style={[s.statIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="hand-right" size={16} color="#059669" />
              </View>
              <Text style={s.statNum}>{stats.myOfferedRides}</Text>
              <Text style={s.statLabel}>My Offers</Text>
            </View>
            <View style={s.statCard}>
              <View style={[s.statIconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="ticket" size={16} color="#7C3AED" />
              </View>
              <Text style={s.statNum}>{stats.myBookedRides}</Text>
              <Text style={s.statLabel}>My Bookings</Text>
            </View>
          </View>
        )}

        {/* ── Quick actions ─────────────────────────────────────────── */}
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[s.quickCard, { backgroundColor: a.bg }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <View style={s.quickIconCircle}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={[s.quickLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Upcoming rides ────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <View style={s.sectionLeft}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
              <Text style={s.sectionTitle}>Available Rides</Text>
            </View>
            <TouchableOpacity
              style={s.seeAllBtn}
              onPress={() => router.push('/commute/find-rides')}
            >
              <Text style={s.seeAll}>See all</Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loadingRides ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : rides.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="car-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={s.emptyTitle}>No rides scheduled</Text>
              <Text style={s.emptySubtitle}>Be the first to offer a ride to your neighbors!</Text>
              <TouchableOpacity
                style={s.offerBtn}
                onPress={() => router.push('/commute/offer-ride')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={16} color="#fff" />
                <Text style={s.offerBtnText}>Offer a Ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.cards}>
              {rides.slice(0, 5).map((r) => (
                <RideCard key={r.id} ride={r} />
              ))}
              {rides.length > 5 && (
                <TouchableOpacity
                  style={s.moreBtn}
                  onPress={() => router.push('/commute/find-rides')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-down-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={s.moreBtnText}>+{ridesPage!.totalElements - 5} more rides</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Top Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  offerHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  offerHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Scroll Content ──────────────────────────────────────────────
  scroll: {
    padding: 14,
    gap: 16,
  },

  // ── Stats ───────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    ...SHADOWS.sm,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // ── Quick Actions ───────────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── Section ─────────────────────────────────────────────────────
  section: {
    gap: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cards: {
    gap: 10,
  },

  // ── Empty State ─────────────────────────────────────────────────
  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  offerBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  moreBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});

