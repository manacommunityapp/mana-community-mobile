import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { mobilityPassengerService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityServiceType, MobilityFareQuoteDto, CreateRideRequest } from '@/types/mobility';

type Step = 'LOCATION' | 'FARE' | 'CONFIRM';

// Placeholder coords — replace with map picker
const COMMUNITY_LAT  = 17.385;
const COMMUNITY_LNG  = 78.4867;

export default function BookRideScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const serviceType: MobilityServiceType = (type as MobilityServiceType) ?? 'CARPOOL';

  const [step, setStep]             = useState<Step>('LOCATION');
  const [pickupAddr, setPickupAddr] = useState('');
  const [destAddr, setDestAddr]     = useState('');
  const [quote, setQuote]           = useState<MobilityFareQuoteDto | null>(null);

  const goBack = useCallback(() => {
    if (step === 'LOCATION') { router.back(); return true; }
    if (step === 'FARE')     { setStep('LOCATION'); return true; }
    if (step === 'CONFIRM')  { setStep('FARE'); return true; }
    return false;
  }, [step, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => sub.remove();
    }, [goBack]),
  );

  const quoteMutation = useMutation({
    mutationFn: () => mobilityPassengerService.getFareQuote({
      serviceType,
      pickupLat: COMMUNITY_LAT, pickupLng: COMMUNITY_LNG,
      destLat:   COMMUNITY_LAT + 0.05, destLng: COMMUNITY_LNG + 0.05,
    }),
    onSuccess: (data) => { setQuote(data); setStep('FARE'); },
    onError:   () => Alert.alert('Error', 'Could not fetch fare. Please try again.'),
  });

  const bookMutation = useMutation({
    mutationFn: (req: CreateRideRequest) => mobilityPassengerService.requestRide(req),
    onSuccess:  (trip) => {
      router.replace(`/mobility/track/${trip.id}` as any);
    },
    onError: () => Alert.alert('Error', 'Booking failed. Please try again.'),
  });

  function handleGetFare() {
    if (!pickupAddr.trim()) { Alert.alert('Required', 'Enter pickup location'); return; }
    if (!destAddr.trim())   { Alert.alert('Required', 'Enter destination'); return; }
    quoteMutation.mutate();
  }

  function handleConfirm() {
    if (!quote) return;
    bookMutation.mutate({
      serviceType,
      pickupLat:     COMMUNITY_LAT,
      pickupLng:     COMMUNITY_LNG,
      pickupAddress: pickupAddr,
      destLat:       COMMUNITY_LAT + 0.05,
      destLng:       COMMUNITY_LNG + 0.05,
      destAddress:   destAddr,
      quoteId:       quote.quoteId,
      idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  }

  const serviceLabel: Record<MobilityServiceType, string> = {
    CARPOOL:    'Community Carpool',
    GROUP_RIDE: 'Group Ride',
    BIKE:       'Bike',
    AUTO:       'Auto',
    CAB:        'Cab',
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Book a Ride</Text>
          <Text style={s.headerSub}>{serviceLabel[serviceType]}</Text>
        </View>
        {/* Step indicator */}
        <View style={s.steps}>
          {(['LOCATION', 'FARE', 'CONFIRM'] as Step[]).map((st, i) => (
            <View
              key={st}
              style={[s.stepDot, step === st && s.stepDotActive,
                i < (['LOCATION', 'FARE', 'CONFIRM'] as Step[]).indexOf(step) && s.stepDotDone]}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Location ────────────────────────────────────── */}
        {step === 'LOCATION' && (
          <View style={s.section}>
            <Text style={s.label}>Pickup location</Text>
            <View style={s.inputRow}>
              <Ionicons name="location" size={18} color="#10B981" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Enter pickup address"
                placeholderTextColor={COLORS.textMuted}
                value={pickupAddr}
                onChangeText={setPickupAddr}
                returnKeyType="next"
              />
            </View>

            <Text style={[s.label, { marginTop: 4 }]}>Destination</Text>
            <View style={s.inputRow}>
              <Ionicons name="flag" size={18} color="#EF4444" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Enter destination address"
                placeholderTextColor={COLORS.textMuted}
                value={destAddr}
                onChangeText={setDestAddr}
                returnKeyType="done"
              />
            </View>

            <View style={s.mapPlaceholder}>
              <Ionicons name="map-outline" size={32} color={COLORS.textMuted} />
              <Text style={s.mapPlaceholderText}>Map picker — tap to set precise location</Text>
            </View>

            <TouchableOpacity
              style={[s.ctaBtn, (quoteMutation.isPending) && s.ctaBtnDisabled]}
              onPress={handleGetFare}
              activeOpacity={0.85}
              disabled={quoteMutation.isPending}
            >
              {quoteMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Text style={s.ctaBtnText}>Get Fare Estimate</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Fare ────────────────────────────────────────── */}
        {step === 'FARE' && quote && (
          <View style={s.section}>
            <View style={s.fareCard}>
              <Text style={s.fareTitle}>Fare estimate</Text>
              <Text style={s.fareAmount}>₹{quote.total.toFixed(2)}</Text>
              <Text style={s.fareNote}>Quote valid for a few minutes · lock it in by confirming</Text>

              <View style={s.divider} />

              {[
                { label: 'Base fare',     amount: quote.baseFare },
                { label: 'Distance fare', amount: quote.distanceFare },
                { label: 'Time fare',     amount: quote.durationFare },
                { label: 'Taxes & fees',  amount: quote.taxes },
              ].map(({ label, amount }) => (
                <View key={label} style={s.fareRow}>
                  <Text style={s.fareRowLabel}>{label}</Text>
                  <Text style={s.fareRowAmount}>₹{amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={s.infoCard}>
              <Ionicons name="navigate" size={14} color={COLORS.primary} />
              <Text style={s.infoText}>{quote.distanceKm.toFixed(1)} km · ~{quote.etaMinutes} min ETA</Text>
            </View>

            <View style={s.routeCard}>
              <View style={s.routeRow}>
                <View style={[s.routeDot, { backgroundColor: '#10B981' }]} />
                <Text style={s.routeAddr} numberOfLines={2}>{pickupAddr}</Text>
              </View>
              <View style={s.routeLine} />
              <View style={s.routeRow}>
                <View style={[s.routeDot, { backgroundColor: '#EF4444' }]} />
                <Text style={s.routeAddr} numberOfLines={2}>{destAddr}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.ctaBtn} onPress={() => setStep('CONFIRM')} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Confirm ─────────────────────────────────────── */}
        {step === 'CONFIRM' && quote && (
          <View style={s.section}>
            <View style={s.confirmCard}>
              <Text style={s.confirmTitle}>Confirm booking</Text>

              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Service</Text>
                <Text style={s.confirmValue}>{serviceLabel[serviceType]}</Text>
              </View>
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>From</Text>
                <Text style={s.confirmValue} numberOfLines={2}>{pickupAddr}</Text>
              </View>
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>To</Text>
                <Text style={s.confirmValue} numberOfLines={2}>{destAddr}</Text>
              </View>
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Fare</Text>
                <Text style={[s.confirmValue, { color: COLORS.primary }]}>₹{quote.total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={s.disclaimerCard}>
              <Ionicons name="information-circle" size={14} color={COLORS.textMuted} />
              <Text style={s.disclaimerText}>
                Fare is locked at ₹{quote.total.toFixed(2)} after confirmation. Final amount may vary
                for tolls or route changes. Payment is collected at end of trip.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.ctaBtn, bookMutation.isPending && s.ctaBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.85}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Text style={s.ctaBtnText}>Confirm Ride</Text>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },

  header:          {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12, ...SHADOWS.sm,
  },
  backBtn:         {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle:     { fontSize: 17, fontFamily: FONTS.displayBold, color: COLORS.text },
  headerSub:       { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.medium, marginTop: 1 },
  steps:           { marginLeft: 'auto', flexDirection: 'row', gap: 6 },
  stepDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  stepDotActive:   { backgroundColor: COLORS.primary, width: 20 },
  stepDotDone:     { backgroundColor: COLORS.success },

  scroll:          { padding: 16, gap: 16 },
  section:         { gap: 14 },

  label:           { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },
  inputRow:        {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, ...SHADOWS.sm,
  },
  inputIcon:       { marginRight: 8 },
  input:           {
    flex: 1, height: 48, fontSize: 14,
    fontFamily: FONTS.regular, color: COLORS.text,
  },

  mapPlaceholder:  {
    height: 140, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  mapPlaceholderText: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular },

  fareCard:        {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 18,
    gap: 6, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md,
  },
  fareTitle:       { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.textMuted },
  fareAmount:      { fontSize: 32, fontFamily: FONTS.displayBold, color: COLORS.text },
  fareNote:        { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular, marginBottom: 4 },
  divider:         { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  fareRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  fareRowLabel:    { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  fareRowAmount:   { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },

  infoCard:        {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  infoText:        { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.semiBold },

  routeCard:       {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: 4, ...SHADOWS.sm,
  },
  routeRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot:        { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  routeLine:       { width: 2, height: 14, backgroundColor: COLORS.border, marginLeft: 4 },
  routeAddr:       { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: FONTS.regular, lineHeight: 18 },

  confirmCard:     {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    gap: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  confirmTitle:    { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },
  confirmRow:      { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  confirmLabel:    { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular },
  confirmValue:    { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text, flexShrink: 1, textAlign: 'right' },

  disclaimerCard:  {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  disclaimerText:  { flex: 1, fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.regular, lineHeight: 17 },

  ctaBtn:          {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15,
    ...SHADOWS.primary,
  },
  ctaBtnDisabled:  { opacity: 0.6 },
  ctaBtnText:      { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
