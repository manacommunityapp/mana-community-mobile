/**
 * Rapido-style booking screen:
 *   Phase 1 – location inputs (pickup + destination) with quick-saved places
 *   Phase 2 – all vehicle types shown simultaneously with live fare quotes
 *   Phase 3 – confirm sheet with payment method + promo code
 */
import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, BackHandler, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { mobilityPassengerService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityServiceType, MobilityFareQuoteDto, CreateRideRequest } from '@/types/mobility';

// ── Types ─────────────────────────────────────────────────────────
type Phase = 'LOCATION' | 'SELECT_RIDE' | 'CONFIRM';
type PaymentMethod = 'CASH' | 'UPI' | 'WALLET';

interface QuotedService {
  type:  MobilityServiceType;
  quote: MobilityFareQuoteDto;
}

// ── Vehicle options ────────────────────────────────────────────────
interface VehicleOption {
  type:      MobilityServiceType;
  icon:      keyof typeof Ionicons.glyphMap;
  label:     string;
  sublabel:  string;
  maxPax:    number;
  enabled:   boolean;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  { type: 'CARPOOL',    icon: 'people',      label: 'Carpool',      sublabel: 'Share with neighbors', maxPax: 3, enabled: true },
  { type: 'GROUP_RIDE', icon: 'bus',         label: 'Group Ride',   sublabel: 'Event transport',      maxPax: 8, enabled: true },
  { type: 'BIKE',       icon: 'bicycle',     label: 'Bike',         sublabel: 'Fastest & cheapest',   maxPax: 1, enabled: false },
  { type: 'AUTO',       icon: 'car-sport',   label: 'Auto',         sublabel: 'Affordable & quick',   maxPax: 3, enabled: false },
  { type: 'CAB',        icon: 'car',         label: 'Cab',          sublabel: 'Comfortable AC ride',  maxPax: 4, enabled: false },
];

// ── Saved places (replace with user profile API) ──────────────────
const SAVED_PLACES = [
  { icon: 'home' as const,   label: 'Home',   sublabel: 'Set home address',   addr: '' },
  { icon: 'business' as const, label: 'Work', sublabel: 'Set work address',   addr: '' },
];

// ── Community default coords (replace with GPS) ───────────────────
const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867;

// ── Payment options ────────────────────────────────────────────────
const PAYMENT_OPTIONS: { method: PaymentMethod; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { method: 'CASH',   icon: 'cash-outline',   label: 'Cash' },
  { method: 'UPI',    icon: 'phone-portrait', label: 'UPI' },
  { method: 'WALLET', icon: 'wallet',         label: 'Mana Wallet' },
];

// ── Cancel reasons ─────────────────────────────────────────────────
const CANCEL_REASONS = [
  'Booked by mistake',
  'Waiting too long for driver',
  'Change of plans',
  'Wrong location entered',
  'Found another ride',
  'Other',
];

export default function BookRideScreen() {
  const router = useRouter();

  // ── Phase state ────────────────────────────────────────────────
  const [phase, setPhase]               = useState<Phase>('LOCATION');
  const [pickupAddr, setPickupAddr]     = useState('');
  const [destAddr, setDestAddr]         = useState('');
  const [activeInput, setActiveInput]   = useState<'pickup' | 'dest'>('pickup');

  // ── Ride selection ─────────────────────────────────────────────
  const [quotes, setQuotes]             = useState<QuotedService[]>([]);
  const [selectedType, setSelectedType] = useState<MobilityServiceType>('CARPOOL');
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // ── Confirm ────────────────────────────────────────────────────
  const [payment, setPayment]           = useState<PaymentMethod>('CASH');
  const [promoCode, setPromoCode]       = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // ── Cancel modal ────────────────────────────────────────────────
  const [showCancelModal, setShowCancelModal] = useState(false);

  const goBack = useCallback(() => {
    if (phase === 'LOCATION')    { router.back(); return true; }
    if (phase === 'SELECT_RIDE') { setPhase('LOCATION'); return true; }
    if (phase === 'CONFIRM')     { setPhase('SELECT_RIDE'); return true; }
    return false;
  }, [phase, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => sub.remove();
    }, [goBack]),
  );

  // Fetch all enabled vehicle quotes in parallel
  async function fetchAllQuotes() {
    if (!pickupAddr.trim() || !destAddr.trim()) {
      Alert.alert('Required', 'Enter both pickup and destination before continuing');
      return;
    }
    setLoadingQuotes(true);
    try {
      const enabled = VEHICLE_OPTIONS.filter(v => v.enabled);
      const results = await Promise.allSettled(
        enabled.map(v =>
          mobilityPassengerService.getFareQuote({
            serviceType: v.type,
            pickupLat: DEFAULT_LAT, pickupLng: DEFAULT_LNG,
            destLat:   DEFAULT_LAT + 0.05, destLng: DEFAULT_LNG + 0.05,
          }).then(q => ({ type: v.type, quote: q } as QuotedService)),
        ),
      );
      const fetched = results
        .filter((r): r is PromiseFulfilledResult<QuotedService> => r.status === 'fulfilled')
        .map(r => r.value);
      setQuotes(fetched);
      setSelectedType(fetched[0]?.type ?? 'CARPOOL');
      setPhase('SELECT_RIDE');
    } catch {
      Alert.alert('Error', 'Could not fetch fares. Please try again.');
    } finally {
      setLoadingQuotes(false);
    }
  }

  const bookMutation = useMutation({
    mutationFn: (req: CreateRideRequest) => mobilityPassengerService.requestRide(req),
    onSuccess:  (trip) => router.replace(`/mobility/track/${trip.id}` as any),
    onError:    () => Alert.alert('Error', 'Booking failed. Please try again.'),
  });

  function handleConfirmBook() {
    const chosen = quotes.find(q => q.type === selectedType);
    if (!chosen) return;
    bookMutation.mutate({
      serviceType:     selectedType,
      pickupLat:       DEFAULT_LAT,
      pickupLng:       DEFAULT_LNG,
      pickupAddress:   pickupAddr,
      destLat:         DEFAULT_LAT + 0.05,
      destLng:         DEFAULT_LNG + 0.05,
      destAddress:     destAddr,
      quoteId:         chosen.quote.quoteId,
      idempotencyKey:  `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  }

  const selectedQuote = quotes.find(q => q.type === selectedType);
  const vehicleMeta   = VEHICLE_OPTIONS.find(v => v.type === selectedType);

  const phaseLabel = phase === 'LOCATION' ? 'Where to?' :
                     phase === 'SELECT_RIDE' ? 'Choose ride' : 'Confirm booking';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{phaseLabel}</Text>
        {/* Step dots */}
        <View style={s.stepRow}>
          {(['LOCATION', 'SELECT_RIDE', 'CONFIRM'] as Phase[]).map((p, i) => (
            <View
              key={p}
              style={[s.stepDot,
                phase === p && s.stepDotActive,
                i < (['LOCATION','SELECT_RIDE','CONFIRM'] as Phase[]).indexOf(phase) && s.stepDotDone,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Map placeholder (always visible) ──────────────────── */}
      <View style={s.mapArea}>
        <Ionicons name="map-outline" size={28} color={COLORS.textMuted} />
        <Text style={s.mapText}>Map · connect expo-location + Maps SDK for live pins</Text>
      </View>

      {/* ── Phase 1: Location ─────────────────────────────────── */}
      {phase === 'LOCATION' && (
        <View style={s.bottomSheet}>
          {/* Location inputs */}
          <View style={s.locationCard}>
            <View style={s.locationRow}>
              <View style={s.locationDotGreen} />
              <TouchableOpacity
                style={[s.locationInput, activeInput === 'pickup' && s.locationInputFocused]}
                onPress={() => setActiveInput('pickup')}
                activeOpacity={1}
              >
                <TextInput
                  style={s.locationInputText}
                  placeholder="Pickup location"
                  placeholderTextColor={COLORS.textMuted}
                  value={pickupAddr}
                  onChangeText={setPickupAddr}
                  onFocus={() => setActiveInput('pickup')}
                />
                {pickupAddr.length > 0 && (
                  <TouchableOpacity onPress={() => setPickupAddr('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={15} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.gpsBtn}
                onPress={() => Alert.alert('GPS', 'Enable expo-location to auto-detect current position')}
              >
                <Ionicons name="locate" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={s.locationDivider} />

            <View style={s.locationRow}>
              <View style={s.locationDotRed} />
              <TouchableOpacity
                style={[s.locationInput, activeInput === 'dest' && s.locationInputFocused]}
                onPress={() => setActiveInput('dest')}
                activeOpacity={1}
              >
                <TextInput
                  style={s.locationInputText}
                  placeholder="Where to?"
                  placeholderTextColor={COLORS.textMuted}
                  value={destAddr}
                  onChangeText={setDestAddr}
                  onFocus={() => setActiveInput('dest')}
                  returnKeyType="done"
                />
                {destAddr.length > 0 && (
                  <TouchableOpacity onPress={() => setDestAddr('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={15} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Saved places */}
          <View style={s.savedRow}>
            {SAVED_PLACES.map((sp) => (
              <TouchableOpacity
                key={sp.label}
                style={s.savedChip}
                onPress={() => {
                  if (sp.addr) {
                    if (activeInput === 'pickup') setPickupAddr(sp.addr);
                    else setDestAddr(sp.addr);
                  } else {
                    Alert.alert(`Save ${sp.label}`, `Add your ${sp.label.toLowerCase()} address in profile settings`);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={sp.icon} size={14} color={COLORS.primary} />
                <View>
                  <Text style={s.savedChipLabel}>{sp.label}</Text>
                  <Text style={s.savedChipSub} numberOfLines={1}>{sp.sublabel}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[s.ctaBtn, loadingQuotes && s.ctaBtnDisabled]}
            onPress={fetchAllQuotes}
            activeOpacity={0.85}
            disabled={loadingQuotes}
          >
            {loadingQuotes
              ? <><ActivityIndicator color="#fff" /><Text style={s.ctaBtnText}>Getting fares…</Text></>
              : <><Text style={s.ctaBtnText}>See Available Rides</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* ── Phase 2: Select Ride ───────────────────────────────── */}
      {phase === 'SELECT_RIDE' && (
        <View style={s.bottomSheet}>
          {/* Route summary */}
          <View style={s.routeSummary}>
            <View style={s.routeRow}>
              <View style={s.locationDotGreen} />
              <Text style={s.routeAddrText} numberOfLines={1}>{pickupAddr}</Text>
            </View>
            <View style={s.routeConnector} />
            <View style={s.routeRow}>
              <View style={s.locationDotRed} />
              <Text style={s.routeAddrText} numberOfLines={1}>{destAddr}</Text>
            </View>
          </View>

          {/* Vehicle type grid with fares */}
          <ScrollView style={s.vehicleScroll} showsVerticalScrollIndicator={false}>
            {VEHICLE_OPTIONS.map((v) => {
              const q = quotes.find(q => q.type === v.type);
              const isSelected = selectedType === v.type;
              const isDisabled = !v.enabled;

              return (
                <TouchableOpacity
                  key={v.type}
                  style={[s.vehicleRow, isSelected && s.vehicleRowSelected, isDisabled && s.vehicleRowDisabled]}
                  onPress={() => v.enabled && setSelectedType(v.type)}
                  activeOpacity={v.enabled ? 0.85 : 1}
                >
                  <View style={[s.vehicleIcon, isSelected && s.vehicleIconSelected]}>
                    <Ionicons name={v.icon} size={22} color={isSelected ? '#fff' : COLORS.textMuted} />
                  </View>
                  <View style={s.vehicleInfo}>
                    <View style={s.vehicleNameRow}>
                      <Text style={[s.vehicleName, isSelected && s.vehicleNameSelected]}>{v.label}</Text>
                      {!v.enabled && (
                        <View style={s.soonPill}>
                          <Text style={s.soonText}>Soon</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.vehicleSub}>{v.sublabel} · up to {v.maxPax} passengers</Text>
                  </View>
                  <View style={s.vehicleFare}>
                    {q ? (
                      <>
                        <Text style={[s.vehicleFareAmt, isSelected && s.vehicleFareAmtSelected]}>
                          ₹{q.quote.total.toFixed(0)}
                        </Text>
                        <Text style={s.vehicleFareEta}>{q.quote.etaMinutes} min</Text>
                      </>
                    ) : isDisabled ? (
                      <Text style={s.vehicleFareN}>—</Text>
                    ) : (
                      <ActivityIndicator size="small" color={COLORS.textMuted} />
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={s.vehicleCheck} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedQuote && (
            <TouchableOpacity style={s.ctaBtn} onPress={() => setPhase('CONFIRM')} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>
                Book {vehicleMeta?.label} · ₹{selectedQuote.quote.total.toFixed(0)}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Phase 3: Confirm ──────────────────────────────────── */}
      {phase === 'CONFIRM' && selectedQuote && (
        <View style={s.bottomSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {/* Fare breakdown */}
            <View style={s.confirmFareCard}>
              <View style={s.confirmFareTop}>
                <View>
                  <Text style={s.confirmFareLabel}>{vehicleMeta?.label}</Text>
                  <Text style={s.confirmFareTotal}>₹{selectedQuote.quote.total.toFixed(2)}</Text>
                </View>
                <View style={s.confirmEtaBadge}>
                  <Ionicons name="time-outline" size={13} color={COLORS.primary} />
                  <Text style={s.confirmEtaText}>{selectedQuote.quote.etaMinutes} min ETA</Text>
                </View>
              </View>
              <View style={s.divider} />
              {[
                { label: 'Base fare',     amt: selectedQuote.quote.baseFare },
                { label: 'Distance fare', amt: selectedQuote.quote.distanceFare },
                { label: 'Time fare',     amt: selectedQuote.quote.durationFare },
                { label: 'Taxes',         amt: selectedQuote.quote.taxes },
              ].map(({ label, amt }) => (
                <View key={label} style={s.fareDetailRow}>
                  <Text style={s.fareDetailLabel}>{label}</Text>
                  <Text style={s.fareDetailAmt}>₹{amt.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            {/* Promo code */}
            <View style={s.promoRow}>
              <Ionicons name="pricetag-outline" size={16} color={promoApplied ? '#059669' : COLORS.textMuted} />
              <TextInput
                style={s.promoInput}
                placeholder="Promo code"
                placeholderTextColor={COLORS.textMuted}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
                editable={!promoApplied}
              />
              <TouchableOpacity
                style={[s.promoBtn, promoApplied && s.promoBtnApplied]}
                onPress={() => {
                  if (promoApplied) { setPromoApplied(false); setPromoCode(''); return; }
                  if (!promoCode.trim()) return;
                  // TODO: validate via API; simulate for now
                  Alert.alert('Promo', `Code "${promoCode}" — promo validation API not yet connected`);
                  setPromoApplied(true);
                }}
              >
                <Text style={[s.promoBtnText, promoApplied && s.promoBtnTextApplied]}>
                  {promoApplied ? 'Remove' : 'Apply'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Payment method */}
            <View style={s.paymentSection}>
              <Text style={s.sectionLabel}>Payment method</Text>
              <View style={s.paymentRow}>
                {PAYMENT_OPTIONS.map(({ method, icon, label }) => (
                  <TouchableOpacity
                    key={method}
                    style={[s.paymentChip, payment === method && s.paymentChipSelected]}
                    onPress={() => setPayment(method)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={icon} size={16} color={payment === method ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[s.paymentChipLabel, payment === method && s.paymentChipLabelSelected]}>{label}</Text>
                    {payment === method && <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fare lock notice */}
            <View style={s.lockNotice}>
              <Ionicons name="lock-closed-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.lockNoticeText}>
                Fare locked at ₹{selectedQuote.quote.total.toFixed(2)} · Tolls and route changes may apply
              </Text>
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[s.ctaBtn, bookMutation.isPending && s.ctaBtnDisabled]}
              onPress={handleConfirmBook}
              activeOpacity={0.85}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending
                ? <><ActivityIndicator color="#fff" /><Text style={s.ctaBtnText}>Booking…</Text></>
                : <><Text style={s.ctaBtnText}>Confirm Ride · ₹{selectedQuote.quote.total.toFixed(0)}</Text><Ionicons name="checkmark-circle" size={16} color="#fff" /></>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
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
  headerTitle:         { flex: 1, fontSize: 17, fontFamily: FONTS.displayBold, color: COLORS.text },
  stepRow:             { flexDirection: 'row', gap: 6 },
  stepDot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  stepDotActive:       { backgroundColor: COLORS.primary, width: 20 },
  stepDotDone:         { backgroundColor: COLORS.success },

  mapArea:             {
    height: 180, backgroundColor: '#E8F0FE', alignItems: 'center',
    justifyContent: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mapText:             { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular, paddingHorizontal: 24, textAlign: 'center' },

  bottomSheet:         {
    flex: 1, backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, gap: 12, ...SHADOWS.lg, marginTop: -12,
  },

  // ── Location inputs ──────────────────────────────────────────
  locationCard:        {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  locationRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationDotGreen:    { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' },
  locationDotRed:      { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' },
  locationInput:       {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 10, height: 40,
  },
  locationInputFocused: { borderColor: COLORS.primary },
  locationInputText:   { flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text },
  locationDivider:     { height: 8, width: 1.5, backgroundColor: COLORS.border, marginLeft: 5.25, marginVertical: 4 },
  gpsBtn:              {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  savedRow:            { flexDirection: 'row', gap: 10 },
  savedChip:           {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  savedChipLabel:      { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text },
  savedChipSub:        { fontSize: 10.5, color: COLORS.textMuted, fontFamily: FONTS.regular },

  // ── Vehicle list ─────────────────────────────────────────────
  routeSummary:        {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 12, gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  routeRow:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeConnector:      { width: 1.5, height: 8, backgroundColor: COLORS.border, marginLeft: 5.25 },
  routeAddrText:       { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: FONTS.regular },

  vehicleScroll:       { maxHeight: 280 },
  vehicleRow:          {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginBottom: 8,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  vehicleRowSelected:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  vehicleRowDisabled:  { opacity: 0.5 },
  vehicleIcon:         {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleIconSelected: { backgroundColor: COLORS.primary },
  vehicleInfo:         { flex: 1 },
  vehicleNameRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vehicleName:         { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
  vehicleNameSelected: { color: COLORS.primary },
  vehicleSub:          { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 2 },
  soonPill:            { backgroundColor: '#FFFBEB', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  soonText:            { fontSize: 9, color: '#D97706', fontFamily: FONTS.bold },
  vehicleFare:         { alignItems: 'flex-end' },
  vehicleFareAmt:      { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },
  vehicleFareAmtSelected: { color: COLORS.primary },
  vehicleFareEta:      { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 2 },
  vehicleFareN:        { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.regular },
  vehicleCheck:        { marginLeft: 4 },

  // ── Confirm ──────────────────────────────────────────────────
  confirmFareCard:     {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, gap: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  confirmFareTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  confirmFareLabel:    { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular },
  confirmFareTotal:    { fontSize: 28, fontFamily: FONTS.displayBold, color: COLORS.text },
  confirmEtaBadge:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4,
  },
  confirmEtaText:      { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.primary },
  divider:             { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  fareDetailRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  fareDetailLabel:     { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  fareDetailAmt:       { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },

  promoRow:            {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 46,
  },
  promoInput:          { flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text },
  promoBtn:            {
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  promoBtnApplied:     { backgroundColor: '#ECFDF5' },
  promoBtnText:        { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary },
  promoBtnTextApplied: { color: '#059669' },

  paymentSection:      { gap: 8 },
  sectionLabel:        { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },
  paymentRow:          { flexDirection: 'row', gap: 8 },
  paymentChip:         {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center',
  },
  paymentChipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  paymentChipLabel:    { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.textMuted },
  paymentChipLabelSelected: { color: COLORS.primary },

  lockNotice:          {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, padding: 10,
  },
  lockNoticeText:      { flex: 1, fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.regular, lineHeight: 17 },

  ctaBtn:              {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15,
    ...SHADOWS.primary,
  },
  ctaBtnDisabled:      { opacity: 0.6 },
  ctaBtnText:          { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
});
