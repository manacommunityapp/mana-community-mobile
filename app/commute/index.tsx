import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { commuteService } from '@/services/commuteService';
import { RideCard } from '@/components/commute/RideCard';
import { COLORS } from '@/constants/config';

const QUICK_ACTIONS = [
  { emoji: '🔍', label: 'Find a Ride',    route: '/commute/find-rides'  },
  { emoji: '🚗', label: 'Offer a Ride',   route: '/commute/offer-ride'  },
  { emoji: '📋', label: 'My Rides',       route: '/commute/my-rides'    },
];

export default function CommuteHubScreen() {
  const router = useRouter();

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
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Commute</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Stats */}
        {stats && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.activeRides}</Text>
              <Text style={s.statLabel}>Active Rides</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.myOfferedRides}</Text>
              <Text style={s.statLabel}>My Offers</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.myBookedRides}</Text>
              <Text style={s.statLabel}>My Bookings</Text>
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={s.quickCard}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <Text style={s.quickEmoji}>{a.emoji}</Text>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming rides */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Upcoming Rides</Text>
            <TouchableOpacity onPress={() => router.push('/commute/find-rides')}>
              <Text style={s.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {loadingRides ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : rides.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🚗</Text>
              <Text style={s.emptyTitle}>No rides yet</Text>
              <Text style={s.emptySubtitle}>Be the first to offer a ride in your community!</Text>
              <TouchableOpacity
                style={s.offerBtn}
                onPress={() => router.push('/commute/offer-ride')}
              >
                <Text style={s.offerBtnText}>Offer a Ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.cards}>
              {rides.slice(0, 5).map((r) => (
                <RideCard key={r.id} ride={r} />
              ))}
              {rides.length > 5 && (
                <TouchableOpacity style={s.moreBtn} onPress={() => router.push('/commute/find-rides')}>
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
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:       { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  headerTitle:   { fontSize: 22, fontWeight: '800', color: COLORS.text },
  scroll:        { padding: 16, gap: 20 },
  statsRow:      { flexDirection: 'row', gap: 10 },
  statCard:      { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum:       { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel:     { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', marginTop: 2 },
  quickGrid:     { flexDirection: 'row', gap: 10 },
  quickCard:     { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border },
  quickEmoji:    { fontSize: 28 },
  quickLabel:    { fontSize: 12, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  section:       { gap: 10 },
  sectionRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.text },
  seeAll:        { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  cards:         { gap: 10 },
  empty:         { backgroundColor: COLORS.surface, borderRadius: 14, padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border },
  emptyIcon:     { fontSize: 40 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  offerBtn:      { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  offerBtnText:  { color: '#FFF', fontWeight: '700', fontSize: 14 },
  moreBtn:       { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12, alignItems: 'center' },
  moreBtnText:   { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
});
