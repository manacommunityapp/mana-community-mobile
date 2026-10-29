import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, BackHandler, Switch, Alert, Linking, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
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
    'Navigate to Pickup',
    'Choose your preferred navigation app:',
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
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Loading driver profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If user has not registered as driver yet
  if (!profile) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Driver Partner Portal</Text>
        </View>

        <View style={s.centered}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="car-sport" size={44} color={COLORS.primary} />
          </View>
          <Text style={s.emptyTitle}>Drive & Earn with Mana</Text>
          <Text style={s.emptySubtitle}>
            Monetize your daily commute or drive for community members. Verified society rides with 0% commission.
          </Text>

          <View style={s.benefitCard}>
            {[
              { icon: 'shield-checkmark', title: 'Community Verified', desc: 'Rides only with verified society members' },
              { icon: 'cash-outline',     title: 'Zero Commission',   desc: 'Keep 100% of community fares' },
              { icon: 'time-outline',     title: 'Flexible Hours',     desc: 'Drive whenever you are available' },
            ].map((b) => (
              <View key={b.title} style={s.benefitRow}>
                <Ionicons name={b.icon as any} size={18} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={s.benefitTitle}>{b.title}</Text>
                  <Text style={s.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={s.registerBtn}
            onPress={() => router.push('/mobility/driver/onboard' as any)}
            activeOpacity={0.88}
          >
            <Text style={s.registerBtnText}>Start Driver Registration</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOnline   = profile.availability === 'ONLINE';
  const isPending  = profile.status === 'PENDING' || profile.status === 'UNDER_REVIEW';
  const isApproved = profile.status === 'APPROVED';

  // Countdown timer calculation
  const countdownPct   = countdown / OFFER_TIMEOUT_SECS;
  const countdownColor = countdownPct > 0.45 ? '#10B981' : countdownPct > 0.2 ? '#F59E0B' : '#EF4444';
  const offerExpired   = countdown === 0 && !!pendingOffer;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Modern Header ───────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Driver Portal</Text>
          <View style={s.headerStatusRow}>
            <View style={[
              s.statusDot,
              { backgroundColor: isApproved && isOnline ? '#10B981' : '#94A3B8' },
            ]} />
            <Text style={s.headerStatusText}>
              {isPending ? 'Under Review' : isOnline ? 'Online · Accepting Rides' : 'Offline'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/mobility/driver/onboard' as any)}
          hitSlop={8}
          style={s.docsIconBtn}
          accessibilityLabel="Documents & KYC"
        >
          <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Pending Verification Banner ──────────────────────── */}
        {isPending && (
          <View style={s.reviewBanner}>
            <View style={s.reviewIconCircle}>
              <Ionicons name="time" size={18} color="#D97706" />
            </View>
            <View style={s.reviewTextWrap}>
              <Text style={s.reviewTitle}>Application Under Verification</Text>
              <Text style={s.reviewText}>
                Our operations team is validating your vehicle RC and driver license. You will receive a notification once activated.
              </Text>
            </View>
          </View>
        )}

        {/* ── Online / Offline Availability Switch ────────────── */}
        {isApproved && (
          <View style={[s.availCard, isOnline && s.availCardOnline]}>
            <View style={s.availTextWrap}>
              <View style={s.availStatusRow}>
                <View style={[s.pulseIndicator, { backgroundColor: isOnline ? '#10B981' : '#94A3B8' }]} />
                <Text style={s.availTitle}>
                  {isOnline ? 'You Are Currently Online' : 'You Are Currently Offline'}
                </Text>
              </View>
              <Text style={s.availSub}>
                {isOnline ? 'Active for incoming nearby trip offers' : 'Turn on to start receiving ride requests'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={(v) => availabilityMutation.mutate(v ? 'ONLINE' : 'OFFLINE')}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={isOnline ? '#059669' : '#F1F5F9'}
              disabled={availabilityMutation.isPending}
            />
          </View>
        )}

        {/* ── Pending Offer with Countdown ─────────────────────── */}
        {pendingOffer && !offerExpired && (
          <View style={s.offerCard}>
            <View style={s.offerTopRow}>
              <View style={s.offerLiveBadge}>
                <View style={s.radarDot} />
                <Text style={s.offerLiveBadgeText}>NEW RIDE REQUEST</Text>
              </View>

              <View style={[s.countdownPill, { borderColor: countdownColor, backgroundColor: countdownColor + '15' }]}>
                <Ionicons name="timer-outline" size={14} color={countdownColor} />
                <Text style={[s.countdownText, { color: countdownColor }]}>{countdown}s</Text>
              </View>
            </View>

            {/* Countdown Progress Bar */}
            <View style={s.timerTrack}>
              <View
                style={[
                  s.timerFill,
                  { width: `${(countdown / OFFER_TIMEOUT_SECS) * 100}%` as any, backgroundColor: countdownColor },
                ]}
              />
            </View>

            {/* Passenger Info */}
            <View style={s.riderRow}>
              <View style={s.riderAvatar}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
              </View>
              <View style={s.riderDetails}>
                <Text style={s.riderName}>{pendingOffer.passengerName}</Text>
                <Text style={s.riderType}>Community Passenger</Text>
              </View>
              <View style={s.fareBadge}>
                <Text style={s.fareBadgeText}>₹{(pendingOffer.fareAmount ?? 0).toFixed(0)}</Text>
              </View>
            </View>

            {/* Route */}
            <View style={s.offerRouteBlock}>
              <View style={s.routeRow}>
                <View style={s.originDot} />
                <Text style={s.offerAddrText} numberOfLines={1}>{pendingOffer.pickupAddress}</Text>
              </View>
              <View style={s.routeTrackLine} />
              <View style={s.routeRow}>
                <Ionicons name="location" size={14} color="#EF4444" />
                <Text style={s.offerAddrText} numberOfLines={1}>{pendingOffer.destAddress}</Text>
              </View>
            </View>

            <View style={s.offerDistanceRow}>
              <Ionicons name="speedometer-outline" size={14} color={COLORS.textMuted} />
              <Text style={s.offerDistanceText}>Est. distance: {(pendingOffer.distanceKm ?? 0).toFixed(1)} km</Text>
            </View>

            {/* Accept / Decline CTAs */}
            <View style={s.offerActionsRow}>
              <TouchableOpacity
                style={s.declineBtn}
                onPress={() => offerMutation.mutate({ offerId: pendingOffer.offerId, accept: false })}
                disabled={offerMutation.isPending}
                activeOpacity={0.85}
              >
                <Text style={s.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.acceptBtn}
                onPress={() => offerMutation.mutate({ offerId: pendingOffer.offerId, accept: true })}
                disabled={offerMutation.isPending}
                activeOpacity={0.88}
              >
                {offerMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.acceptBtnText}>Accept Ride</Text>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Offer Expired Notice */}
        {offerExpired && (
          <View style={s.expiredCard}>
            <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
            <Text style={s.expiredText}>Offer expired. Waiting for next incoming ride request…</Text>
          </View>
        )}

        {/* ── Active Trip in Progress ──────────────────────────── */}
        {activeTrip && (
          <View style={s.activeTripCard}>
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              style={s.activeTripInner}
            >
              <View style={s.activeTripTop}>
                <View>
                  <Text style={s.activeTripHeaderTitle}>ACTIVE PASSENGER</Text>
                  <Text style={s.activePassengerName}>{activeTrip.passengerName}</Text>
                </View>
                <View style={s.activeStatusBadge}>
                  <Text style={s.activeStatusBadgeText}>{activeTrip.status.replace('_', ' ')}</Text>
                </View>
              </View>

              {/* Navigation launcher */}
              <TouchableOpacity
                style={s.navigationBtn}
                onPress={() => openNavigation(
                  activeTrip.pickup?.lat ?? 0,
                  activeTrip.pickup?.lng ?? 0,
                  activeTrip.pickup?.address ?? 'Pickup',
                )}
                activeOpacity={0.88}
              >
                <Ionicons name="navigate" size={18} color="#2563EB" />
                <Text style={s.navigationBtnText}>Launch Turn-by-Turn GPS Navigation</Text>
                <Ionicons name="open-outline" size={15} color="#2563EB" />
              </TouchableOpacity>

              {/* Step Action Buttons */}
              <View style={s.activeActionArea}>
                {(activeTrip.status === 'ASSIGNED' || activeTrip.status === 'DRIVER_ARRIVING') ? (
                  <TouchableOpacity
                    style={s.statusActionBtn}
                    onPress={() => tripStatusMutation.mutate({ tripId: activeTrip.id, status: 'ARRIVED' })}
                    disabled={tripStatusMutation.isPending}
                    activeOpacity={0.88}
                  >
                    <Text style={s.statusActionBtnText}>I Have Arrived at Pickup</Text>
                  </TouchableOpacity>
                ) : activeTrip.status === 'ARRIVED' ? (
                  <TouchableOpacity
                    style={[s.statusActionBtn, { backgroundColor: '#0284C7' }]}
                    onPress={() => tripStatusMutation.mutate({ tripId: activeTrip.id, status: 'PICKED_UP' })}
                    disabled={tripStatusMutation.isPending}
                    activeOpacity={0.88}
                  >
                    <Text style={s.statusActionBtnText}>Passenger On Board (Start Trip)</Text>
                  </TouchableOpacity>
                ) : (activeTrip.status === 'PICKED_UP' || activeTrip.status === 'IN_PROGRESS') ? (
                  <TouchableOpacity
                    style={[s.statusActionBtn, { backgroundColor: '#059669' }]}
                    onPress={() => tripStatusMutation.mutate({ tripId: activeTrip.id, status: 'COMPLETED' })}
                    disabled={tripStatusMutation.isPending}
                    activeOpacity={0.88}
                  >
                    <Text style={s.statusActionBtnText}>Complete Trip & Collect Fare</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Driver Earnings Overview ─────────────────────────── */}
        {earnings && (
          <View style={s.earningsSection}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Earnings Summary</Text>
              <Text style={s.sectionSub}>All payments settled weekly</Text>
            </View>

            <View style={s.earningsGrid}>
              {[
                { label: 'Today',      amount: earnings.todayEarnings, icon: 'today-outline', color: '#059669', bg: '#ECFDF5' },
                { label: 'This Week',  amount: earnings.weekEarnings,  icon: 'calendar-outline', color: '#4F46E5', bg: '#EEF2FF' },
                { label: 'This Month', amount: earnings.monthEarnings, icon: 'wallet-outline', color: '#D97706', bg: '#FFFBEB' },
              ].map(({ label, amount, icon, color, bg }) => (
                <View key={label} style={s.earningBox}>
                  <View style={[s.earningIconCircle, { backgroundColor: bg }]}>
                    <Ionicons name={icon as any} size={16} color={color} />
                  </View>
                  <Text style={s.earningAmount}>₹{(amount ?? 0).toFixed(0)}</Text>
                  <Text style={s.earningPeriod}>{label}</Text>
                </View>
              ))}
            </View>

            {(earnings.pendingSettlement ?? 0) > 0 && (
              <View style={s.settlementCard}>
                <Ionicons name="card-outline" size={16} color="#D97706" />
                <Text style={s.settlementCardText}>
                  ₹{(earnings.pendingSettlement ?? 0).toFixed(2)} scheduled for next settlement cycle
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
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
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStatusText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  docsIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    padding: 16,
    gap: 14,
  },

  // ── Under Review Banner ────────────────────────────────────
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  reviewIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  reviewTextWrap: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: '#92400E',
  },
  reviewText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#B45309',
    lineHeight: 17,
    marginTop: 2,
  },

  // ── Availability Card ──────────────────────────────────────
  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  availCardOnline: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  availTextWrap: {
    flex: 1,
    gap: 2,
  },
  availStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availTitle: {
    fontSize: 14.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  availSub: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // ── Incoming Offer Card ────────────────────────────────────
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.lg,
  },
  offerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  radarDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  offerLiveBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countdownText: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
  },
  timerTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: {
    height: 4,
    borderRadius: 2,
  },

  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  riderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderDetails: {
    flex: 1,
  },
  riderName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  riderType: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  fareBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  fareBadgeText: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: '#059669',
  },

  offerRouteBlock: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  routeTrackLine: {
    width: 2,
    height: 10,
    backgroundColor: COLORS.border,
    marginLeft: 3,
  },
  offerAddrText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },

  offerDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerDistanceText: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },

  offerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  declineBtn: {
    flex: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.error,
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    backgroundColor: '#059669',
    ...SHADOWS.primary,
  },
  acceptBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  expiredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expiredText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },

  // ── Active Trip ────────────────────────────────────────────
  activeTripCard: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  activeTripInner: {
    padding: 16,
    gap: 14,
  },
  activeTripTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeTripHeaderTitle: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  activePassengerName: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeStatusBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  activeStatusBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#E2E8F0',
  },
  navigationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  navigationBtnText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: '#2563EB',
  },
  activeActionArea: {},
  statusActionBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: RADIUS.xl,
    paddingVertical: 13,
    alignItems: 'center',
    ...SHADOWS.primary,
  },
  statusActionBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  // ── Earnings ───────────────────────────────────────────────
  earningsSection: {
    gap: 12,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  sectionSub: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  earningBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 4,
  },
  earningIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  earningAmount: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  earningPeriod: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  settlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  settlementCardText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#92400E',
    flex: 1,
  },

  // ── Empty / Non-driver State ───────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
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
  benefitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    marginVertical: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  benefitDesc: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...SHADOWS.primary,
    marginTop: 6,
  },
  registerBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
});
