import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, BackHandler, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobilityPassengerService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityRideStatus } from '@/types/mobility';

const STATUS_CONFIG: Record<MobilityRideStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  REQUESTED:       { label: 'Searching for drivers…', color: '#F59E0B', icon: 'search' },
  SEARCHING:       { label: 'Searching for drivers…', color: '#F59E0B', icon: 'search' },
  ASSIGNED:        { label: 'Driver assigned',         color: '#4F46E5', icon: 'person' },
  DRIVER_ARRIVING: { label: 'Driver is on the way',    color: '#4F46E5', icon: 'navigate' },
  ARRIVED:         { label: 'Driver has arrived',      color: '#059669', icon: 'flag' },
  PICKED_UP:       { label: 'Ride started',            color: '#0891B2', icon: 'car' },
  IN_PROGRESS:     { label: 'On the way',              color: '#0891B2', icon: 'car' },
  COMPLETED:       { label: 'Trip completed',          color: '#10B981', icon: 'checkmark-circle' },
  CANCELLED:       { label: 'Trip cancelled',          color: '#EF4444', icon: 'close-circle' },
  NO_DRIVER_FOUND: { label: 'No driver found',         color: '#EF4444', icon: 'alert-circle' },
  EXPIRED:         { label: 'Request expired',         color: '#6B7280', icon: 'time' },
};

const ACTIVE_STATUSES: MobilityRideStatus[] = [
  'REQUESTED', 'SEARCHING', 'ASSIGNED', 'DRIVER_ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS',
];

export default function TrackScreen() {
  const router      = useRouter();
  const { id }      = useLocalSearchParams<{ id: string }>();
  const tripId      = Number(id);
  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating]         = useState(0);

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
  }, [trip?.status]);

  const cancelMutation = useMutation({
    mutationFn: () => mobilityPassengerService.cancelRide(tripId, { reason: 'Cancelled by passenger' }),
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

  function handleCancel() {
    Alert.alert(
      'Cancel trip?',
      'Are you sure you want to cancel this trip?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Loading trip…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
          <Text style={s.errorText}>Trip not found</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.push('/mobility' as any)}>
            <Text style={s.retryText}>Go to Mobility</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cfg    = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.SEARCHING;
  const isLive = ACTIVE_STATUSES.includes(trip.status);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.push('/mobility' as any)}
          hitSlop={8} style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Trip #{trip.tripRef}</Text>
        {isLive && (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Live</Text>
          </View>
        )}
      </View>

      <View style={s.content}>
        {/* Status banner */}
        <View style={[s.statusBanner, { backgroundColor: cfg.color + '15', borderColor: cfg.color + '40' }]}>
          <Ionicons name={cfg.icon} size={24} color={cfg.color} />
          <Text style={[s.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          {isLive && <ActivityIndicator size="small" color={cfg.color} style={{ marginLeft: 8 }} />}
        </View>

        {/* Map placeholder */}
        <View style={s.mapArea}>
          <Ionicons name="map-outline" size={36} color={COLORS.textMuted} />
          <Text style={s.mapPlaceholderText}>Live map · tap for navigation</Text>
        </View>

        {/* Driver card */}
        {trip.driver && (
          <View style={s.driverCard}>
            <View style={s.driverAvatar}>
              <Text style={s.driverAvatarText}>
                {trip.driver.driverName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
              </Text>
            </View>
            <View style={s.driverInfo}>
              <Text style={s.driverName}>{trip.driver.driverName}</Text>
              <Text style={s.driverVehicle}>
                {trip.driver.vehicleModel} · {trip.driver.vehicleNumber}
              </Text>
              <View style={s.ratingRow}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={s.ratingText}>{trip.driver.rating.toFixed(1)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.callBtn}
              onPress={() => Linking.openURL(`tel:${trip.driver?.phone}`)}
            >
              <Ionicons name="call" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Pickup PIN */}
        {trip.pickupPin && (trip.status === 'ARRIVED' || trip.status === 'ASSIGNED' || trip.status === 'DRIVER_ARRIVING') && (
          <View style={s.pinCard}>
            <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
            <View>
              <Text style={s.pinLabel}>Pickup PIN — share with driver only</Text>
              <Text style={s.pinCode}>{trip.pickupPin}</Text>
            </View>
          </View>
        )}

        {/* Route */}
        <View style={s.routeCard}>
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: '#10B981' }]} />
            <Text style={s.routeAddr} numberOfLines={2}>{trip.pickup.address}</Text>
          </View>
          <View style={s.routeLine} />
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: '#EF4444' }]} />
            <Text style={s.routeAddr} numberOfLines={2}>{trip.destination.address}</Text>
          </View>
        </View>

        {/* Fare */}
        <View style={s.fareRow}>
          <Text style={s.fareLabel}>Estimated fare</Text>
          <Text style={s.fareAmount}>₹{(trip.finalFare ?? trip.fareQuote.total).toFixed(2)}</Text>
        </View>

        {/* Actions */}
        {isLive && (
          <View style={s.actions}>
            <TouchableOpacity
              style={s.sosBtn}
              onPress={() => Alert.alert('SOS', 'Emergency SOS feature — connects to safety team')}
            >
              <Ionicons name="warning" size={16} color="#fff" />
              <Text style={s.sosBtnText}>SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.cancelBtn, cancelMutation.isPending && s.btnDisabled]}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? <ActivityIndicator size="small" color={COLORS.error} />
                : <Text style={s.cancelBtnText}>Cancel trip</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Rating overlay */}
      {showRating && (
        <View style={s.ratingOverlay}>
          <View style={s.ratingCard}>
            <Text style={s.ratingTitle}>Rate your trip</Text>
            <Text style={s.ratingSubtitle}>How was your experience?</Text>
            <View style={s.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36} color={star <= rating ? '#F59E0B' : COLORS.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[s.submitRating, rating === 0 && s.btnDisabled]}
              onPress={() => rateMutation.mutate(rating)}
              disabled={rating === 0 || rateMutation.isPending}
            >
              {rateMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitRatingText}>Submit Rating</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowRating(false); router.push('/mobility/history' as any); }}>
              <Text style={s.skipRating}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  headerTitle:         { flex: 1, fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },
  liveBadge:           {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4,
  },
  liveDot:             { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText:            { fontSize: 11, fontFamily: FONTS.bold, color: '#059669' },

  content:             { flex: 1, padding: 14, gap: 12 },

  statusBanner:        {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: RADIUS.lg, padding: 14, borderWidth: 1,
  },
  statusLabel:         { flex: 1, fontSize: 15, fontFamily: FONTS.bold },

  mapArea:             {
    height: 160, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  mapPlaceholderText:  { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular },

  driverCard:          {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  driverAvatar:        {
    width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  driverAvatarText:    { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
  driverInfo:          { flex: 1, gap: 2 },
  driverName:          { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
  driverVehicle:       { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular },
  ratingRow:           { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText:          { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.text },
  callBtn:             {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },

  pinCard:             {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md, padding: 12,
  },
  pinLabel:            { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular },
  pinCode:             { fontSize: 24, fontFamily: FONTS.displayBold, color: COLORS.primary, letterSpacing: 4 },

  routeCard:           {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: 4, ...SHADOWS.sm,
  },
  routeRow:            { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot:            { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  routeLine:           { width: 2, height: 14, backgroundColor: COLORS.border, marginLeft: 4 },
  routeAddr:           { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: FONTS.regular, lineHeight: 18 },

  fareRow:             {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fareLabel:           { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular },
  fareAmount:          { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text },

  actions:             { flexDirection: 'row', gap: 10 },
  sosBtn:              {
    backgroundColor: '#EF4444', borderRadius: RADIUS.md, flexDirection: 'row',
    alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, ...SHADOWS.sm,
  },
  sosBtnText:          { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  cancelBtn:           {
    flex: 1, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderWidth: 1, borderColor: COLORS.error,
  },
  cancelBtnText:       { color: COLORS.error, fontFamily: FONTS.semiBold, fontSize: 13 },
  btnDisabled:         { opacity: 0.5 },

  centered:            { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:         { color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 14 },
  errorText:           { color: COLORS.error, fontFamily: FONTS.semiBold, fontSize: 15 },
  retryBtn:            {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryText:           { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },

  ratingOverlay:       {
    ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  ratingCard:          {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 24,
    alignItems: 'center', gap: 12, width: '100%', ...SHADOWS.floating,
  },
  ratingTitle:         { fontSize: 20, fontFamily: FONTS.displayBold, color: COLORS.text },
  ratingSubtitle:      { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular },
  stars:               { flexDirection: 'row', gap: 8 },
  submitRating:        {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingHorizontal: 32, paddingVertical: 13, marginTop: 4,
  },
  submitRatingText:    { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  skipRating:          { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular, paddingTop: 4 },
});
