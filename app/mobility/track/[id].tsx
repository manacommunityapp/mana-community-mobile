import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, BackHandler, Linking, Share, Modal, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { mobilityPassengerService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityRideStatus } from '@/types/mobility';

const STATUS_CONFIG: Record<MobilityRideStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; step: number }> = {
  REQUESTED:       { label: 'Connecting to Drivers…', color: '#D97706', bg: '#FFFBEB', icon: 'search', step: 1 },
  SEARCHING:       { label: 'Connecting to Drivers…', color: '#D97706', bg: '#FFFBEB', icon: 'search', step: 1 },
  ASSIGNED:        { label: 'Driver Assigned',        color: '#4F46E5', bg: '#EEF2FF', icon: 'person', step: 2 },
  DRIVER_ARRIVING: { label: 'Driver is on the way',   color: '#4F46E5', bg: '#EEF2FF', icon: 'navigate', step: 2 },
  ARRIVED:         { label: 'Driver has arrived!',    color: '#059669', bg: '#ECFDF5', icon: 'flag', step: 2 },
  PICKED_UP:       { label: 'Ride in Progress',       color: '#0891B2', bg: '#ECFEFF', icon: 'car', step: 3 },
  IN_PROGRESS:     { label: 'En Route to Destination',color: '#0891B2', bg: '#ECFEFF', icon: 'car', step: 3 },
  COMPLETED:       { label: 'Trip Completed',         color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle', step: 4 },
  CANCELLED:       { label: 'Trip Cancelled',         color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle', step: 0 },
  NO_DRIVER_FOUND: { label: 'No Driver Found',        color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle', step: 0 },
  EXPIRED:         { label: 'Request Expired',        color: '#6B7280', bg: '#F3F4F6', icon: 'time', step: 0 },
};

const ACTIVE_STATUSES: MobilityRideStatus[] = [
  'REQUESTED', 'SEARCHING', 'ASSIGNED', 'DRIVER_ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS',
];

const CANCEL_REASONS = [
  'Booked by mistake',
  'Driver taking too long to arrive',
  'Change of plans / Not travelling',
  'Entered wrong pickup or dropoff location',
  'Found alternate transport',
  'Driver asked to cancel',
  'Other reason',
];

const FEEDBACK_TAGS = [
  'Safe driving', 'Clean vehicle', 'Punctual', 'Polite & friendly',
  'Smooth navigation', 'AC comfortable',
];

export default function TrackScreen() {
  const router      = useRouter();
  const { id }      = useLocalSearchParams<{ id: string }>();
  const tripId      = Number(id);
  const queryClient = useQueryClient();

  const [showRating, setShowRating]           = useState(false);
  const [rating, setRating]                   = useState(0);
  const [selectedTags, setSelectedTags]       = useState<string[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason]       = useState<string | null>(null);

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['mobility-trip', tripId],
    queryFn:  () => mobilityPassengerService.getTrip(tripId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 8000;
      return ACTIVE_STATUSES.includes(status) ? 8000 : false;
    },
  });

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.push('/mobility' as any); return true;
      });
      return () => sub.remove();
    }, [router]),
  );

  useEffect(() => {
    if (trip?.status === 'COMPLETED' && !trip.rating) {
      const t = setTimeout(() => setShowRating(true), 800);
      return () => clearTimeout(t);
    }
  }, [trip?.status, trip?.rating]);

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => mobilityPassengerService.cancelRide(tripId, { reason }),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['mobility-trip', tripId] }); },
    onError:    () => Alert.alert('Error', 'Could not cancel trip. Please try again.'),
  });

  const rateMutation = useMutation({
    mutationFn: (r: number) => mobilityPassengerService.rateTrip(tripId, { rating: r }),
    onSuccess:  () => {
      setShowRating(false);
      queryClient.invalidateQueries({ queryKey: ['mobility-trip', tripId] });
      router.push('/mobility/history' as any);
    },
    onError: () => Alert.alert('Error', 'Could not submit rating.'),
  });

  function handleShareTrip() {
    Share.share({
      message: `I'm riding with Mana Mobility! Track my trip #${trip?.tripRef ?? tripId} from ${trip?.pickup.address} to ${trip?.destination.address}.`,
    });
  }

  function handleCancelPress() {
    setCancelReason(null);
    setShowCancelModal(true);
  }

  function confirmCancel() {
    if (!cancelReason) return;
    setShowCancelModal(false);
    cancelMutation.mutate(cancelReason);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Fetching live ride details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.centered}>
          <View style={s.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
          </View>
          <Text style={s.errorTitle}>Trip Not Found</Text>
          <Text style={s.errorSubtitle}>Could not locate this ride reference.</Text>
          <TouchableOpacity style={s.returnBtn} onPress={() => router.push('/mobility' as any)}>
            <Text style={s.returnBtnText}>Return to Mobility Hub</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cfg    = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.SEARCHING;
  const isLive = ACTIVE_STATUSES.includes(trip.status);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Modern Header ───────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.push('/mobility' as any)}
          hitSlop={12}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Trip #{trip.tripRef}</Text>
          <Text style={s.headerSubtitle}>{trip.serviceType.replace('_', ' ')}</Text>
        </View>

        {isLive && (
          <View style={s.liveChip}>
            <View style={s.livePulseDot} />
            <Text style={s.liveChipText}>LIVE</Text>
          </View>
        )}

        <TouchableOpacity hitSlop={10} onPress={handleShareTrip} style={s.shareBtn}>
          <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* ── Step Progression Bar ─────────────────────────────── */}
        {isLive && (
          <View style={s.stepperCard}>
            <View style={s.stepperRow}>
              {[
                { step: 1, label: 'Assigned' },
                { step: 2, label: 'Arriving' },
                { step: 3, label: 'In Transit' },
                { step: 4, label: 'Arrived' },
              ].map((st, idx) => {
                const isPassed = cfg.step > st.step;
                const isCurrent = cfg.step === st.step;
                return (
                  <View key={st.label} style={s.stepItem}>
                    <View style={s.stepCircleRow}>
                      <View style={[
                        s.stepCircle,
                        isPassed && s.stepCirclePassed,
                        isCurrent && s.stepCircleCurrent,
                      ]}>
                        {isPassed ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : (
                          <Text style={[s.stepNum, isCurrent && s.stepNumCurrent]}>{st.step}</Text>
                        )}
                      </View>
                      {idx < 3 && (
                        <View style={[
                          s.stepLine,
                          isPassed && s.stepLinePassed,
                        ]} />
                      )}
                    </View>
                    <Text style={[s.stepLabel, isCurrent && s.stepLabelCurrent]}>{st.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Status Banner ────────────────────────────────────── */}
        <View style={[s.statusBanner, { backgroundColor: cfg.bg, borderColor: cfg.color + '35' }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
          <View style={s.statusBannerTextWrap}>
            <Text style={[s.statusBannerTitle, { color: cfg.color }]}>{cfg.label}</Text>
            {trip.status === 'DRIVER_ARRIVING' && (
              <Text style={s.statusBannerSub}>Driver is navigating to your pickup location</Text>
            )}
            {trip.status === 'IN_PROGRESS' && (
              <Text style={s.statusBannerSub}>Sit back & relax, you are on the way</Text>
            )}
          </View>
          {isLive && <ActivityIndicator size="small" color={cfg.color} />}
        </View>

        {/* ── Vector Map Visual ────────────────────────────────── */}
        <View style={s.mapArea}>
          <LinearGradient
            colors={['#E0E7FF', '#EFF6FF', '#F1F5F9']}
            style={s.mapCanvas}
          >
            <View style={s.roadH} />
            <View style={s.roadV} />

            <View style={s.mapMarkerRow}>
              <View style={s.markerBeacon}>
                <Ionicons name="car" size={18} color="#2563EB" />
              </View>
              <View style={s.markerPathLine} />
              <View style={s.markerDestBeacon}>
                <Ionicons name="location" size={18} color="#EF4444" />
              </View>
            </View>

            <View style={s.mapInfoPill}>
              <Ionicons name="navigate-circle" size={14} color={COLORS.primary} />
              <Text style={s.mapInfoText}>Live GPS Tracking Active</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Pickup PIN Card ──────────────────────────────────── */}
        {trip.pickupPin && (trip.status === 'ARRIVED' || trip.status === 'ASSIGNED' || trip.status === 'DRIVER_ARRIVING') && (
          <View style={s.pinCard}>
            <View style={s.pinIconCircle}>
              <Ionicons name="key" size={18} color={COLORS.primary} />
            </View>
            <View style={s.pinInfo}>
              <Text style={s.pinHeading}>Pickup Security PIN</Text>
              <Text style={s.pinSub}>Share with your driver to start the trip</Text>
            </View>
            <View style={s.pinCodeBox}>
              <Text style={s.pinCodeText}>{trip.pickupPin}</Text>
            </View>
          </View>
        )}

        {/* ── Driver Profile Card ──────────────────────────────── */}
        {trip.driver && (
          <View style={s.driverCard}>
            <View style={s.driverAvatarWrap}>
              <View style={s.driverAvatar}>
                <Text style={s.driverAvatarText}>
                  {trip.driver.driverName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={s.driverVerifiedShield}>
                <Ionicons name="shield-checkmark" size={12} color="#059669" />
              </View>
            </View>

            <View style={s.driverDetails}>
              <View style={s.driverNameRow}>
                <Text style={s.driverName}>{trip.driver.driverName}</Text>
                <View style={s.driverRatingBadge}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={s.driverRatingText}>{trip.driver.rating.toFixed(1)}</Text>
                </View>
              </View>

              <View style={s.driverVehicleRow}>
                <View style={s.vehiclePlatePill}>
                  <Text style={s.vehiclePlateText}>{trip.driver.vehicleNumber}</Text>
                </View>
                <Text style={s.vehicleModelText}>{trip.driver.vehicleModel}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.callBtn}
              onPress={() => Linking.openURL(`tel:${trip.driver?.phone}`)}
              activeOpacity={0.85}
              accessibilityLabel="Call Driver"
            >
              <Ionicons name="call" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Route Card ───────────────────────────────────────── */}
        <View style={s.routeCard}>
          <View style={s.routeStopRow}>
            <View style={s.pickupMarkerWrap}>
              <View style={s.pickupDot} />
            </View>
            <View style={s.routeStopTextWrap}>
              <Text style={s.routeStopLabel}>PICKUP</Text>
              <Text style={s.routeStopAddr}>{trip.pickup.address}</Text>
            </View>
          </View>

          <View style={s.routeTrackLine} />

          <View style={s.routeStopRow}>
            <View style={s.destMarkerWrap}>
              <Ionicons name="location" size={15} color="#EF4444" />
            </View>
            <View style={s.routeStopTextWrap}>
              <Text style={s.routeStopLabel}>DESTINATION</Text>
              <Text style={s.routeStopAddr}>{trip.destination.address}</Text>
            </View>
          </View>
        </View>

        {/* ── Fare & Payment Card ──────────────────────────────── */}
        <View style={s.fareCard}>
          <View style={s.fareCardLeft}>
            <Text style={s.fareCardLabel}>Trip Fare ({trip.paymentStatus})</Text>
            <Text style={s.fareCardTotal}>₹{(trip.finalFare ?? trip.fareQuote?.total ?? 0).toFixed(2)}</Text>
          </View>
          <View style={s.fareGuaranteePill}>
            <Ionicons name="lock-closed" size={12} color="#059669" />
            <Text style={s.fareGuaranteeText}>Fare Locked</Text>
          </View>
        </View>

        {/* ── Actions: SOS & Cancel ────────────────────────────── */}
        {isLive && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.sosBtn}
              onPress={() => Alert.alert('Emergency SOS', 'Direct helpline: Dial 112 for Police or contact Society Security at 9999-000-111')}
              activeOpacity={0.85}
            >
              <Ionicons name="warning" size={16} color="#fff" />
              <Text style={s.sosBtnText}>Emergency SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.cancelTripBtn, cancelMutation.isPending && s.btnDisabled]}
              onPress={handleCancelPress}
              disabled={cancelMutation.isPending}
              activeOpacity={0.85}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Text style={s.cancelTripText}>Cancel Ride</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ── Cancel Reason Modal ───────────────────────────────── */}
      <Modal visible={showCancelModal} transparent animationType="slide" onRequestClose={() => setShowCancelModal(false)}>
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCancelModal(false)}
        />
        <View style={s.cancelSheet}>
          <View style={s.sheetHandle} />
          <Text style={s.cancelSheetTitle}>Reason for Cancellation</Text>
          <Text style={s.cancelSheetSub}>Please let us know why you need to cancel this ride.</Text>

          <ScrollView style={s.reasonsScroll} showsVerticalScrollIndicator={false}>
            {CANCEL_REASONS.map((r) => {
              const isSelected = cancelReason === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[s.reasonRow, isSelected && s.reasonRowSelected]}
                  onPress={() => setCancelReason(r)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.reasonText, isSelected && s.reasonTextSelected]}>{r}</Text>
                  <View style={[s.radioDot, isSelected && s.radioDotSelected]}>
                    {isSelected && <View style={s.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[s.confirmCancelBtn, !cancelReason && s.btnDisabled]}
            onPress={confirmCancel}
            disabled={!cancelReason}
            activeOpacity={0.88}
          >
            <Text style={s.confirmCancelText}>Cancel My Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.keepRideBtn} onPress={() => setShowCancelModal(false)}>
            <Text style={s.keepRideText}>Keep My Ride</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Rating & Feedback Overlay ─────────────────────────── */}
      {showRating && (
        <View style={s.ratingOverlay}>
          <View style={s.ratingCard}>
            <View style={s.ratingHeader}>
              <Ionicons name="ribbon-outline" size={28} color={COLORS.primary} />
              <Text style={s.ratingTitle}>Rate Your Experience</Text>
              <Text style={s.ratingSubtitle}>How was your ride with {trip.driver?.driverName ?? 'your driver'}?</Text>
            </View>

            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} hitSlop={8}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={38}
                    color={star <= rating ? '#F59E0B' : COLORS.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating >= 4 && (
              <View style={s.complimentsWrap}>
                <Text style={s.complimentHeading}>What went well?</Text>
                <View style={s.tagsGrid}>
                  {FEEDBACK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[s.tagChip, isSelected && s.tagChipSelected]}
                        onPress={() =>
                          setSelectedTags(prev =>
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
                          )
                        }
                        activeOpacity={0.85}
                      >
                        <Text style={[s.tagChipText, isSelected && s.tagChipTextSelected]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[s.submitRatingBtn, rating === 0 && s.btnDisabled]}
              onPress={() => rateMutation.mutate(rating)}
              disabled={rating === 0 || rateMutation.isPending}
              activeOpacity={0.88}
            >
              {rateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitRatingBtnText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowRating(false); router.push('/mobility/history' as any); }}
              style={s.skipRatingBtn}
            >
              <Text style={s.skipRatingText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    fontSize: 16.5,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveChipText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#059669',
    letterSpacing: 0.5,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: 16,
    gap: 14,
  },

  // ── Stepper Card ───────────────────────────────────────────
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCirclePassed: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepCircleCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepNum: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  stepNumCurrent: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
  },
  stepLinePassed: {
    backgroundColor: '#10B981',
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },

  // ── Status Banner ──────────────────────────────────────────
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1.5,
  },
  statusBannerTextWrap: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  statusBannerSub: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // ── Vector Map ─────────────────────────────────────────────
  mapArea: {
    height: 160,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  mapCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  roadH: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  roadV: {
    position: 'absolute',
    left: 80,
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mapMarkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.xl,
    ...SHADOWS.sm,
  },
  markerBeacon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPathLine: {
    width: 36,
    height: 2,
    backgroundColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  markerDestBeacon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapInfoPill: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  mapInfoText: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // ── Pickup PIN Card ────────────────────────────────────────
  pinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.xl,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(79, 70, 229, 0.25)',
  },
  pinIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInfo: {
    flex: 1,
  },
  pinHeading: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  pinSub: {
    fontSize: 10.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  pinCodeBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
  },
  pinCodeText: {
    fontSize: 22,
    fontFamily: FONTS.displayBold,
    color: COLORS.primary,
    letterSpacing: 4,
  },

  // ── Driver Card ────────────────────────────────────────────
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  driverAvatarWrap: {
    position: 'relative',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  driverVerifiedShield: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
    ...SHADOWS.sm,
  },
  driverDetails: {
    flex: 1,
    gap: 3,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    fontSize: 14.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  driverRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  driverRatingText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#D97706',
  },
  driverVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehiclePlatePill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vehiclePlateText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  vehicleModelText: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },

  // ── Route Card ─────────────────────────────────────────────
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    ...SHADOWS.sm,
  },
  routeStopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pickupMarkerWrap: {
    width: 18,
    alignItems: 'center',
    marginTop: 2,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  destMarkerWrap: {
    width: 18,
    alignItems: 'center',
    marginTop: 2,
  },
  routeTrackLine: {
    width: 2,
    height: 14,
    backgroundColor: COLORS.border,
    marginLeft: 8,
  },
  routeStopTextWrap: {
    flex: 1,
  },
  routeStopLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  routeStopAddr: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    lineHeight: 18,
    marginTop: 1,
  },

  // ── Fare Card ──────────────────────────────────────────────
  fareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  fareCardLeft: {
    gap: 2,
  },
  fareCardLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  fareCardTotal: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  fareGuaranteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  fareGuaranteeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#059669',
  },

  // ── Action Buttons ─────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.lg,
    paddingVertical: 13,
    paddingHorizontal: 16,
    ...SHADOWS.sm,
  },
  sosBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  cancelTripBtn: {
    flex: 1,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  cancelTripText: {
    color: COLORS.error,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.55,
  },

  // ── Cancel Modal ───────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  cancelSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    maxHeight: '75%',
    ...SHADOWS.floating,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  cancelSheetTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  cancelSheetSub: {
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  reasonsScroll: {
    maxHeight: 220,
    marginVertical: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  reasonRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  reasonText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  reasonTextSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  confirmCancelBtn: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmCancelText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  keepRideBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  keepRideText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },

  // ── Rating Overlay ─────────────────────────────────────────
  ratingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xxl,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    ...SHADOWS.floating,
  },
  ratingHeader: {
    alignItems: 'center',
    gap: 4,
  },
  ratingTitle: {
    fontSize: 19,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  ratingSubtitle: {
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  complimentsWrap: {
    width: '100%',
    gap: 8,
  },
  complimentHeading: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  tagChip: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  tagChipText: {
    fontSize: 11.5,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  tagChipTextSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  submitRatingBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.primary,
  },
  submitRatingBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  skipRatingBtn: {
    paddingVertical: 4,
  },
  skipRatingText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },

  // ── Loading & Error ────────────────────────────────────────
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
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  returnBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 6,
  },
  returnBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
});
