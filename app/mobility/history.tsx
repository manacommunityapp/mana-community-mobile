import { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, BackHandler, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { mobilityPassengerService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityTripDto, MobilityRideStatus } from '@/types/mobility';

const STATUS_CONFIG: Record<MobilityRideStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  REQUESTED:       { label: 'Searching',       color: '#D97706', bg: '#FFFBEB', icon: 'search' },
  SEARCHING:       { label: 'Searching',       color: '#D97706', bg: '#FFFBEB', icon: 'search' },
  ASSIGNED:        { label: 'Assigned',        color: '#4F46E5', bg: '#EEF2FF', icon: 'person' },
  DRIVER_ARRIVING: { label: 'Driver En Route', color: '#4F46E5', bg: '#EEF2FF', icon: 'navigate' },
  ARRIVED:         { label: 'Driver Arrived',  color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle' },
  PICKED_UP:       { label: 'Trip Started',    color: '#0891B2', bg: '#ECFEFF', icon: 'car' },
  IN_PROGRESS:     { label: 'In Progress',     color: '#0891B2', bg: '#ECFEFF', icon: 'car' },
  COMPLETED:       { label: 'Completed',       color: '#059669', bg: '#ECFDF5', icon: 'checkmark-done' },
  CANCELLED:       { label: 'Cancelled',       color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle' },
  NO_DRIVER_FOUND: { label: 'No Driver Found', color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle' },
  EXPIRED:         { label: 'Expired',         color: '#6B7280', bg: '#F3F4F6', icon: 'time' },
};

const SERVICE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  CARPOOL:    { label: 'Carpool',    icon: 'people',    color: '#4F46E5', bg: '#EEF2FF' },
  GROUP_RIDE: { label: 'Group Ride', icon: 'bus',       color: '#059669', bg: '#ECFDF5' },
  BIKE:       { label: 'Bike',       icon: 'bicycle',   color: '#D97706', bg: '#FFFBEB' },
  AUTO:       { label: 'Auto',       icon: 'car-sport', color: '#0891B2', bg: '#ECFEFF' },
  CAB:        { label: 'Cab',        icon: 'car',       color: '#7C3AED', bg: '#F5F3FF' },
};

function TripCard({ trip }: { trip: MobilityTripDto }) {
  const router   = useRouter();
  const cfg      = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.SEARCHING;
  const svc      = SERVICE_META[trip.serviceType] ?? SERVICE_META.CARPOOL;
  const isActive = ['REQUESTED','SEARCHING','ASSIGNED','DRIVER_ARRIVING','ARRIVED','PICKED_UP','IN_PROGRESS'].includes(trip.status);
  const fare     = trip.finalFare ?? trip.fareQuote?.total ?? 0;
  
  const tripDate = new Date(trip.requestedAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const tripTime = new Date(trip.requestedAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={s.tripCard}
      onPress={() => router.push(`/mobility/track/${trip.id}` as any)}
      activeOpacity={0.88}
    >
      {/* ── Top Header of Card ──────────────────────────────── */}
      <View style={s.tripTop}>
        <View style={s.serviceBadgeRow}>
          <View style={[s.serviceIconCircle, { backgroundColor: svc.bg }]}>
            <Ionicons name={svc.icon} size={15} color={svc.color} />
          </View>
          <View>
            <Text style={s.serviceTitle}>{svc.label}</Text>
            <Text style={s.dateSubtitle}>{tripDate} · {tripTime}</Text>
          </View>
        </View>

        <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* ── Route Timeline ──────────────────────────────────── */}
      <View style={s.routeBlock}>
        {/* Pickup */}
        <View style={s.routeRow}>
          <View style={s.originDotWrap}>
            <View style={s.originDot} />
          </View>
          <Text style={s.routeAddrText} numberOfLines={1}>
            {trip.pickup.address}
          </Text>
        </View>

        {/* Vertical Connector */}
        <View style={s.routeConnectorLine} />

        {/* Destination */}
        <View style={s.routeRow}>
          <View style={s.destDotWrap}>
            <Ionicons name="location" size={14} color="#EF4444" />
          </View>
          <Text style={s.routeAddrText} numberOfLines={1}>
            {trip.destination.address}
          </Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* ── Bottom Meta & Action ────────────────────────────── */}
      <View style={s.tripBottom}>
        <View style={s.driverMeta}>
          {trip.driver ? (
            <View style={s.driverRow}>
              <View style={s.driverMiniAvatar}>
                <Text style={s.driverMiniAvatarText}>
                  {trip.driver.driverName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={s.driverNameText}>{trip.driver.driverName}</Text>
                <Text style={s.vehicleNumberText}>{trip.driver.vehicleNumber}</Text>
              </View>
            </View>
          ) : (
            <Text style={s.tripRefText}>Ref #{trip.tripRef}</Text>
          )}
        </View>

        <View style={s.fareBox}>
          <Text style={s.fareText}>₹{fare.toFixed(2)}</Text>
        </View>
      </View>

      {/* ── Active Trip Quick Tracker ────────────────────────── */}
      {isActive && (
        <View style={s.activeTrackerRow}>
          <View style={s.activePulseWrap}>
            <View style={s.activePulseDot} />
          </View>
          <Text style={s.activeTrackerText}>Live ride active — tap to track</Text>
          <Ionicons name="chevron-forward" size={14} color="#059669" />
        </View>
      )}

      {/* ── Re-book Action for completed rides ────────────────── */}
      {trip.status === 'COMPLETED' && (
        <TouchableOpacity
          style={s.rebookBtn}
          onPress={() => router.push({
            pathname: '/mobility/book' as any,
            params: { dest: trip.destination.address },
          })}
          activeOpacity={0.85}
        >
          <Ionicons name="repeat-outline" size={14} color={COLORS.primary} />
          <Text style={s.rebookBtnText}>Book this trip again</Text>
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Modern Header ───────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Trip History</Text>
          <Text style={s.headerSubtitle}>
            {trips.length} ride{trips.length === 1 ? '' : 's'} recorded
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => refetch()} hitSlop={8}>
          <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Loading trip history…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <View style={s.errorIconCircle}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.error} />
          </View>
          <Text style={s.errorTitle}>Unable to load rides</Text>
          <Text style={s.errorSubtitle}>Please check your connection and try again.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()} activeOpacity={0.85}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : trips.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="car-sport-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={s.emptyTitle}>No rides taken yet</Text>
          <Text style={s.emptySubtitle}>
            Book a community carpool, group ride, or cab to see your receipts and trips here.
          </Text>
          <TouchableOpacity
            style={s.bookBtn}
            onPress={() => router.push('/mobility/book' as any)}
            activeOpacity={0.88}
          >
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={s.bookBtnText}>Book a Ride</Text>
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
            <View style={s.footer}>
              <Text style={s.footerNote}>Showing {trips.length} rides from your community activity</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ─────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },

  // ── Trip Card ──────────────────────────────────────────────
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  tripTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  dateSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  // ── Route Block ────────────────────────────────────────────
  routeBlock: {
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  originDotWrap: {
    width: 16,
    alignItems: 'center',
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  destDotWrap: {
    width: 16,
    alignItems: 'center',
  },
  routeConnectorLine: {
    width: 2,
    height: 12,
    backgroundColor: COLORS.border,
    marginLeft: 7,
  },
  routeAddrText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    lineHeight: 18,
  },

  // ── Bottom Section ─────────────────────────────────────────
  tripBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverMeta: {
    flex: 1,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverMiniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMiniAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  driverNameText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  vehicleNumberText: {
    fontSize: 10.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  tripRefText: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  fareBox: {
    alignItems: 'flex-end',
  },
  fareText: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },

  // ── Active Ride Bar ────────────────────────────────────────
  activeTrackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activePulseWrap: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeTrackerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#059669',
  },

  // ── Re-book Action ─────────────────────────────────────────
  rebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  rebookBtnText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // ── Empty & Error States ───────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 8,
    ...SHADOWS.primary,
  },
  bookBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 6,
  },
  retryText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },

  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
});
