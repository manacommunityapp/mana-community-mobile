import { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { mobilityPassengerService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityTripDto, MobilityRideStatus } from '@/types/mobility';

const STATUS_COLOR: Record<MobilityRideStatus, string> = {
  REQUESTED:       '#F59E0B',
  SEARCHING:       '#F59E0B',
  ASSIGNED:        '#4F46E5',
  DRIVER_ARRIVING: '#4F46E5',
  ARRIVED:         '#4F46E5',
  PICKED_UP:       '#0891B2',
  IN_PROGRESS:     '#0891B2',
  COMPLETED:       '#10B981',
  CANCELLED:       '#EF4444',
  NO_DRIVER_FOUND: '#EF4444',
  EXPIRED:         '#6B7280',
};

const STATUS_LABEL: Record<MobilityRideStatus, string> = {
  REQUESTED:       'Searching',
  SEARCHING:       'Searching',
  ASSIGNED:        'Assigned',
  DRIVER_ARRIVING: 'Driver arriving',
  ARRIVED:         'Driver arrived',
  PICKED_UP:       'In progress',
  IN_PROGRESS:     'In progress',
  COMPLETED:       'Completed',
  CANCELLED:       'Cancelled',
  NO_DRIVER_FOUND: 'No driver',
  EXPIRED:         'Expired',
};

const SERVICE_LABEL: Record<string, string> = {
  CARPOOL:    'Carpool',
  GROUP_RIDE: 'Group Ride',
  BIKE:       'Bike',
  AUTO:       'Auto',
  CAB:        'Cab',
};

function TripCard({ trip }: { trip: MobilityTripDto }) {
  const router     = useRouter();
  const color      = STATUS_COLOR[trip.status] ?? '#6B7280';
  const isActive   = ['REQUESTED','SEARCHING','ASSIGNED','DRIVER_ARRIVING','ARRIVED','PICKED_UP','IN_PROGRESS'].includes(trip.status);
  const fare       = trip.finalFare ?? trip.fareQuote?.total ?? 0;
  const date       = new Date(trip.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <TouchableOpacity
      style={s.tripCard}
      onPress={() => router.push(`/mobility/track/${trip.id}` as any)}
      activeOpacity={0.85}
    >
      <View style={s.tripTop}>
        <View style={[s.statusPill, { backgroundColor: color + '18' }]}>
          <View style={[s.statusDot, { backgroundColor: color }]} />
          <Text style={[s.statusText, { color }]}>{STATUS_LABEL[trip.status]}</Text>
        </View>
        <Text style={s.dateText}>{date}</Text>
      </View>

      <View style={s.tripRoute}>
        <View style={s.routeRow}>
          <View style={[s.dot, { backgroundColor: '#10B981' }]} />
          <Text style={s.routeAddr} numberOfLines={1}>{trip.pickup.address}</Text>
        </View>
        <View style={s.routeLine} />
        <View style={s.routeRow}>
          <View style={[s.dot, { backgroundColor: '#EF4444' }]} />
          <Text style={s.routeAddr} numberOfLines={1}>{trip.destination.address}</Text>
        </View>
      </View>

      <View style={s.tripBottom}>
        <View style={s.metaRow}>
          <Ionicons name="car-outline" size={13} color={COLORS.textMuted} />
          <Text style={s.metaText}>{SERVICE_LABEL[trip.serviceType] ?? trip.serviceType}</Text>
          {trip.driver && (
            <>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaText}>{trip.driver.driverName}</Text>
            </>
          )}
        </View>
        <Text style={s.fareText}>₹{fare.toFixed(2)}</Text>
      </View>

      {isActive && (
        <View style={s.activeRow}>
          <View style={s.activeDot} />
          <Text style={s.activeText}>Trip in progress — tap to track</Text>
        </View>
      )}

      {trip.status === 'COMPLETED' && (
        <TouchableOpacity
          style={s.rebookBtn}
          onPress={() => router.push({
            pathname: '/mobility/book' as any,
            params: { dest: trip.destination.address },
          })}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-outline" size={13} color={COLORS.primary} />
          <Text style={s.rebookBtnText}>Re-book</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.back(); return true; });
      return () => sub.remove();
    }, [router]),
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['mobility-history'],
    queryFn:  () => mobilityPassengerService.getTripHistory(0),
  });

  const trips = data?.content ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Trip History</Text>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={36} color={COLORS.error} />
          <Text style={s.errorText}>Failed to load history</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : trips.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="car-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={s.emptyTitle}>No trips yet</Text>
          <Text style={s.emptySubtitle}>Your completed rides will appear here</Text>
          <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/mobility' as any)}>
            <Text style={s.bookBtnText}>Book a ride</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <TripCard trip={item} />}
          contentContainerStyle={s.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Text style={s.footerNote}>{data?.totalElements ?? 0} total trips</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },

  header:      {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12, ...SHADOWS.sm,
  },
  backBtn:     {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontFamily: FONTS.displayBold, color: COLORS.text },

  list:        { padding: 14, gap: 10, paddingBottom: 32 },

  tripCard:    {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  tripTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 11, fontFamily: FONTS.bold },
  dateText:    { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular },

  tripRoute:   { gap: 4 },
  routeRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot:         { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  routeLine:   { width: 1.5, height: 12, backgroundColor: COLORS.border, marginLeft: 3.25 },
  routeAddr:   { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: FONTS.regular, lineHeight: 18 },

  tripBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular },
  metaDot:     { color: COLORS.textMuted },
  fareText:    { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },

  activeRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot:   { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' },
  activeText:  { fontSize: 11.5, color: '#059669', fontFamily: FONTS.semiBold },

  footerNote:  { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular, padding: 12 },
  rebookBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end',
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  rebookBtnText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText:   { color: COLORS.error, fontFamily: FONTS.semiBold, fontSize: 15 },
  retryBtn:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:   { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  emptyIcon:   { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular },
  bookBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 11, marginTop: 4 },
  bookBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
});
