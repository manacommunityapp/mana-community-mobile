import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, BackHandler, Switch, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobilityDriverService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { DriverRideOfferDto } from '@/types/mobility';

// ── Countdown timer for offer card ────────────────────────────────
const OFFER_TIMEOUT_SECS = 35;

function useOfferCountdown(offer: DriverRideOfferDto | null | undefined): number {
  const [remaining, setRemaining] = useState(OFFER_TIMEOUT_SECS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerIdRef  = useRef<string | null>(null);

  useEffect(() => {
    if (!offer) { setRemaining(OFFER_TIMEOUT_SECS); return; }

    // Reset when a new offer arrives
    if (offer.offerId !== offerIdRef.current) {
      offerIdRef.current = offer.offerId;
      setRemaining(OFFER_TIMEOUT_SECS);
    }

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [offer?.offerId]);

  return remaining;
}

// ── Navigation deep link ───────────────────────────────────────────
function openNavigation(lat: number, lng: number, label: string) {
  const encoded = encodeURIComponent(label);
  Alert.alert(
    'Navigate to pickup',
    'Open in:',
    [
      {
        text: 'Google Maps',
        onPress: () =>
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encoded}&travelmode=driving`),
      },
      {
        text: 'Waze',
        onPress: () =>
          Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`),
      },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
}

export default function DriverDashboardScreen() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.back(); return true; });
      return () => sub.remove();
    }, [router]),
  );

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['mobility-driver-profile'],
    queryFn:  mobilityDriverService.getMyProfile,
  });

  const { data: activeTrip } = useQuery({
    queryKey: ['mobility-driver-active-trip'],
    queryFn:  mobilityDriverService.getActiveTrip,
    refetchInterval: profile?.availability === 'ONLINE' ? 10_000 : false,
  });

  const { data: pendingOffer } = useQuery({
    queryKey: ['mobility-driver-offer'],
    queryFn:  mobilityDriverService.getPendingOffer,
    refetchInterval: profile?.availability === 'ONLINE' ? 5_000 : false,
    enabled:  !!profile && profile.availability === 'ONLINE',
  });

  const { data: earnings } = useQuery({
    queryKey: ['mobility-driver-earnings'],
    queryFn:  mobilityDriverService.getEarnings,
  });

  const countdown = useOfferCountdown(pendingOffer);

  const availabilityMutation = useMutation({
    mutationFn: (av: 'ONLINE' | 'OFFLINE') => mobilityDriverService.setAvailability(av),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['mobility-driver-profile'] }),
    onError:    () => Alert.alert('Error', 'Could not update availability.'),
  });

  const offerMutation = useMutation({
    mutationFn: ({ offerId, accept }: { offerId: string; accept: boolean }) =>
      mobilityDriverService.respondToOffer(offerId, { accept }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobility-driver-offer'] });
      queryClient.invalidateQueries({ queryKey: ['mobility-driver-active-trip'] });
    },
    onError: () => Alert.alert('Error', 'Could not respond to offer.'),
  });

  const tripStatusMutation = useMutation({
    mutationFn: ({ tripId, status }: { tripId: number; status: 'ARRIVED' | 'PICKED_UP' | 'COMPLETED' }) =>
      mobilityDriverService.updateTripStatus(tripId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobility-driver-active-trip'] }),
    onError:   () => Alert.alert('Error', 'Could not update trip status.'),
  });

  if (loadingProfile) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Driver Portal</Text>
        </View>
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="car-sport-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={s.emptyTitle}>Drive with Mana Mobility</Text>
          <Text style={s.emptySubtitle}>Register as a driver to start earning from community rides</Text>
          <TouchableOpacity
            style={s.registerBtn}
            onPress={() => router.push('/mobility/driver/onboard' as any)}
            activeOpacity={0.85}
          >
            <Text style={s.registerBtnText}>Register as Driver</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOnline   = profile.availability === 'ONLINE';
  const isPending  = profile.status === 'PENDING' || profile.status === 'UNDER_REVIEW';
  const isApproved = profile.status === 'APPROVED';

  // Countdown colors
  const countdownPct   = countdown / OFFER_TIMEOUT_SECS;
  const countdownColor = countdownPct > 0.5 ? '#10B981' : countdownPct > 0.25 ? '#F59E0B' : '#EF4444';
  const offerExpired   = countdown === 0 && !!pendingOffer;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Driver Dashboard</Text>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: isApproved && isOnline ? '#10B981' : '#6B7280' }]} />
            <Text style={s.statusLabel}>
              {isPending ? 'Under review' : isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/mobility/driver/onboard' as any)} hitSlop={8}>
          <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {isPending && (
          <View style={s.reviewBanner}>
            <Ionicons name="time-outline" size={18} color="#D97706" />
            <Text style={s.reviewText}>
              Your application is under review. We'll notify you once approved.
            </Text>
          </View>
        )}

        {isApproved && (
          <View style={s.availCard}>
            <View>
              <Text style={s.availTitle}>{isOnline ? "You're Online" : 'Go Online to Accept Rides'}</Text>
              <Text style={s.availSub}>Toggle to start / stop receiving ride offers</Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={(v) => availabilityMutation.mutate(v ? 'ONLINE' : 'OFFLINE')}
              trackColor={{ false: COLORS.border, true: '#10B981' }}
              thumbColor="#fff"
              disabled={availabilityMutation.isPending}
            />
          </View>
        )}

        {/* ── Pending offer with countdown ──────────────────── */}
        {pendingOffer && !offerExpired && (
          <View style={[s.offerCard, offerExpired && s.offerCardExpired]}>
            {/* Header row with badge + countdown */}
            <View style={s.offerHeader}>
              <View style={s.offerBadge}>
                <Ionicons name="radio-button-on" size={10} color={COLORS.primary} />
                <Text style={s.offerBadgeText}>New Ride Offer</Text>
              </View>
              {/* Countdown pill */}
              <View style={[s.countdownPill, { borderColor: countdownColor }]}>
                <Ionicons name="timer-outline" size={13} color={countdownColor} />
                <Text style={[s.countdownText, { color: countdownColor }]}>
                  {countdown}s
                </Text>
              </View>
            </View>

            {/* Circular progress ring (simplified bar) */}
            <View style={s.timerBar}>
              <View
                style={[
                  s.timerBarFill,
                  { width: `${(countdown / OFFER_TIMEOUT_SECS) * 100}%` as any, backgroundColor: countdownColor },
                ]}
              />
            </View>

            <Text style={s.offerPassenger}>{pendingOffer.passengerName}</Text>

            <View style={s.offerRoute}>
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#10B981' }]} />
                <Text style={s.offerAddr} numberOfLines={1}>{pendingOffer.pickupAddress}</Text>
              </View>
              <View style={[s.dot, { backgroundColor: COLORS.border, width: 1.5, height: 10, borderRadius: 1, marginLeft: 3 }]} />
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#EF4444' }]} />
                <Text style={s.offerAddr} numberOfLines={1}>{pendingOffer.destAddress}</Text>
              </View>
            </View>

            <View style={s.offerMeta}>
              <Text style={s.offerFare}>₹{pendingOffer.fareAmount.toFixed(2)}</Text>
              <Text style={s.offerDist}>{pendingOffer.distanceKm.toFixed(1)} km</Text>
            </View>

            <View style={s.offerActions}>
              <TouchableOpacity
                style={s.rejectBtn}
                onPress={() => offerMutation.mutate({ offerId: pendingOffer.offerId, accept: false })}
                disabled={offerMutation.isPending}
              >
                <Text style={s.rejectBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.acceptBtn}
                onPress={() => offerMutation.mutate({ offerId: pendingOffer.offerId, accept: true })}
                disabled={offerMutation.isPending}
              >
                {offerMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.acceptBtnText}>Accept Ride</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Offer expired notice */}
        {offerExpired && (
          <View style={s.expiredCard}>
            <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
            <Text style={s.expiredText}>Offer expired — waiting for next ride request</Text>
          </View>
        )}

        {/* ── Active trip ──────────────────────────────────── */}
        {activeTrip && (
          <View style={s.activeTripCard}>
            <Text style={s.activeTripTitle}>Active Trip</Text>
            <Text style={s.activeTripPassenger}>{activeTrip.passengerName}</Text>

            {/* Navigation button */}
            <TouchableOpacity
              style={s.navBtn}
              onPress={() => openNavigation(
                activeTrip.pickup?.lat ?? 0,
                activeTrip.pickup?.lng ?? 0,
                activeTrip.pickup?.address ?? 'Pickup',
              )}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={16} color="#2563EB" />
              <Text style={s.navBtnText}>Navigate to pickup</Text>
              <Ionicons name="chevron-forward" size={14} color="#2563EB" />
            </TouchableOpacity>

            <View style={s.tripActions}>
              {(activeTrip.status === 'ASSIGNED' || activeTrip.status === 'DRIVER_ARRIVING') ? (
                <TouchableOpacity
                  style={s.tripActionBtn}
                  onPress={() => tripStatusMutation.mutate({ tripId: activeTrip.id, status: 'ARRIVED' })}
                  disabled={tripStatusMutation.isPending}
                >
                  <Text style={s.tripActionText}>I've Arrived</Text>
                </TouchableOpacity>
              ) : activeTrip.status === 'ARRIVED' ? (
                <TouchableOpacity
                  style={s.tripActionBtn}
                  onPress={() => tripStatusMutation.mutate({ tripId: activeTrip.id, status: 'PICKED_UP' })}
                  disabled={tripStatusMutation.isPending}
                >
                  <Text style={s.tripActionText}>Passenger On Board</Text>
                </TouchableOpacity>
              ) : (activeTrip.status === 'PICKED_UP' || activeTrip.status === 'IN_PROGRESS') ? (
                <TouchableOpacity
                  style={[s.tripActionBtn, { backgroundColor: '#059669' }]}
                  onPress={() => tripStatusMutation.mutate({ tripId: activeTrip.id, status: 'COMPLETED' })}
                  disabled={tripStatusMutation.isPending}
                >
                  <Text style={s.tripActionText}>Complete Trip</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Earnings ─────────────────────────────────────── */}
        {earnings && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Earnings</Text>
            <View style={s.earningsGrid}>
              {[
                { label: 'Today',      amount: earnings.todayEarnings },
                { label: 'This week',  amount: earnings.weekEarnings },
                { label: 'This month', amount: earnings.monthEarnings },
              ].map(({ label, amount }) => (
                <View key={label} style={s.earningCard}>
                  <Text style={s.earningAmount}>₹{amount.toFixed(0)}</Text>
                  <Text style={s.earningLabel}>{label}</Text>
                </View>
              ))}
            </View>
            {earnings.pendingSettlement > 0 && (
              <View style={s.settlementRow}>
                <Ionicons name="wallet-outline" size={14} color={COLORS.warning} />
                <Text style={s.settlementText}>
                  ₹{earnings.pendingSettlement.toFixed(2)} pending settlement
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: COLORS.background },

  header:              {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12, ...SHADOWS.sm,
  },
  backBtn:             {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerCenter:        { flex: 1 },
  headerTitle:         { fontSize: 17, fontFamily: FONTS.displayBold, color: COLORS.text },
  statusRow:           { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot:           { width: 6, height: 6, borderRadius: 3 },
  statusLabel:         { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.medium },

  scroll:              { padding: 14, gap: 14 },

  reviewBanner:        {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  reviewText:          { flex: 1, fontSize: 13, color: '#92400E', fontFamily: FONTS.regular, lineHeight: 18 },

  availCard:           {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  availTitle:          { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
  availSub:            { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 2 },

  // ── Offer card ───────────────────────────────────────────────
  offerCard:           {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, gap: 10,
    borderWidth: 2, borderColor: '#4F46E5', ...SHADOWS.md,
  },
  offerCardExpired:    { borderColor: COLORS.border, opacity: 0.6 },
  offerHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offerBadge:          {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  offerBadgeText:      { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary },

  countdownPill:       {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.md, borderWidth: 1.5,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  countdownText:       { fontSize: 13, fontFamily: FONTS.displayBold },

  timerBar:            {
    height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden',
  },
  timerBarFill:        { height: 4, borderRadius: 2 },

  offerPassenger:      { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  offerRoute:          { gap: 3 },
  routeRow:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:                 { width: 8, height: 8, borderRadius: 4 },
  offerAddr:           { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: FONTS.regular },
  offerMeta:           { flexDirection: 'row', gap: 12 },
  offerFare:           { fontSize: 20, fontFamily: FONTS.displayBold, color: COLORS.text },
  offerDist:           { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 4 },
  offerActions:        { flexDirection: 'row', gap: 10 },
  rejectBtn:           {
    flex: 1, borderRadius: RADIUS.md, paddingVertical: 12, borderWidth: 1,
    borderColor: COLORS.error, alignItems: 'center',
  },
  rejectBtnText:       { color: COLORS.error, fontFamily: FONTS.semiBold, fontSize: 14 },
  acceptBtn:           {
    flex: 2, borderRadius: RADIUS.md, paddingVertical: 12, backgroundColor: COLORS.primary,
    alignItems: 'center', ...SHADOWS.primary,
  },
  acceptBtnText:       { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },

  expiredCard:         {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  expiredText:         { flex: 1, fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular },

  // ── Active trip ──────────────────────────────────────────────
  activeTripCard:      {
    backgroundColor: '#0F172A', borderRadius: RADIUS.lg, padding: 16, gap: 10, ...SHADOWS.md,
  },
  activeTripTitle:     { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.regular },
  activeTripPassenger: { fontSize: 18, fontFamily: FONTS.bold, color: '#fff' },
  navBtn:              {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#DBEAFE', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  navBtnText:          { flex: 1, fontSize: 13, fontFamily: FONTS.semiBold, color: '#2563EB' },
  tripActions:         {},
  tripActionBtn:       {
    backgroundColor: '#4F46E5', borderRadius: RADIUS.md, paddingVertical: 12,
    alignItems: 'center', ...SHADOWS.primary,
  },
  tripActionText:      { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },

  // ── Earnings ─────────────────────────────────────────────────
  section:             { gap: 10 },
  sectionTitle:        { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },
  earningsGrid:        { flexDirection: 'row', gap: 10 },
  earningCard:         {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  earningAmount:       { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text },
  earningLabel:        { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.medium, marginTop: 2 },
  settlementRow:       {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.md, padding: 10,
  },
  settlementText:      { fontSize: 13, color: '#92400E', fontFamily: FONTS.semiBold },

  centered:            { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyIcon:           { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:          { fontSize: 20, fontFamily: FONTS.displayBold, color: COLORS.text, textAlign: 'center' },
  emptySubtitle:       { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 20 },
  registerBtn:         {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingHorizontal: 24, paddingVertical: 13, marginTop: 8, ...SHADOWS.primary,
  },
  registerBtnText:     { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
});
