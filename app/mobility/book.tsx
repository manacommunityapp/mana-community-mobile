/**
 * Rapido / Uber-style booking screen:
 *   Phase 1 – Location inputs (pickup + destination) with quick-saved places & GPS
 *   Phase 2 – Vehicle types shown with live fare quotes & ETA
 *   Phase 3 – Confirmation sheet with itemized breakdown, promo code & payment
 */
import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, BackHandler, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
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
  color:     string;
  iconBg:    string;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type:     'CARPOOL',
    icon:     'people',
    label:    'Carpool',
    sublabel: 'Share ride with neighbors',
    maxPax:   3,
    enabled:  true,
    color:    '#4F46E5',
    iconBg:   '#EEF2FF',
  },
  {
    type:     'GROUP_RIDE',
    icon:     'bus',
    label:    'Group Ride',
    sublabel: 'Spacious event transport',
    maxPax:   8,
    enabled:  true,
    color:    '#059669',
    iconBg:   '#ECFDF5',
  },
  {
    type:     'BIKE',
    icon:     'bicycle',
    label:    'Bike',
    sublabel: 'Fastest & cheapest solo ride',
    maxPax:   1,
    enabled:  false,
    color:    '#D97706',
    iconBg:   '#FFFBEB',
  },
  {
    type:     'AUTO',
    icon:     'car-sport',
    label:    'Auto',
    sublabel: 'Affordable & quick city ride',
    maxPax:   3,
    enabled:  false,
    color:    '#0891B2',
    iconBg:   '#ECFEFF',
  },
  {
    type:     'CAB',
    icon:     'car',
    label:    'Cab',
    sublabel: 'Comfortable air-conditioned cab',
    maxPax:   4,
    enabled:  false,
    color:    '#7C3AED',
    iconBg:   '#F5F3FF',
  },
];

// ── Saved places ───────────────────────────────────────────────────
const SAVED_PLACES = [
  { icon: 'home' as const,       label: 'Home',           sublabel: 'Flat / Villa address',    addr: '' },
  { icon: 'business' as const,   label: 'Work',           sublabel: 'Office / Tech Park',      addr: '' },
  { icon: 'shield-checkmark' as const, label: 'Main Gate', sublabel: 'Community Security Gate', addr: 'Community Main Entrance Gate' },
];

// ── Community default coords (fallback when GPS unavailable) ───────
const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867;

// ── Payment options ────────────────────────────────────────────────
const PAYMENT_OPTIONS: { method: PaymentMethod; icon: keyof typeof Ionicons.glyphMap; label: string; sub: string }[] = [
  { method: 'CASH',   icon: 'cash-outline',           label: 'Cash',        sub: 'Pay driver directly' },
  { method: 'UPI',    icon: 'phone-portrait-outline', label: 'UPI / QR',    sub: 'Instant GooglePay/PhonePe' },
  { method: 'WALLET', icon: 'wallet-outline',         label: 'Mana Wallet', sub: 'Instant 1-tap checkout' },
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

  // ── GPS state ──────────────────────────────────────────────────
  const [pickupLat, setPickupLat] = useState(DEFAULT_LAT);
  const [pickupLng, setPickupLng] = useState(DEFAULT_LNG);
  const [gpsLoading, setGpsLoading] = useState(false);

  async function handleGps() {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to auto-detect your position.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPickupLat(pos.coords.latitude);
      setPickupLng(pos.coords.longitude);
      const [geo] = await Location.reverseGeocodeAsync(pos.coords);
      if (geo) {
        const label = [geo.name, geo.street, geo.district, geo.city].filter(Boolean).join(', ');
        setPickupAddr(label);
      }
    } catch {
      Alert.alert('GPS error', 'Could not get current location. Please enter it manually.');
    } finally {
      setGpsLoading(false);
    }
  }

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
      Alert.alert('Required', 'Please enter both pickup and destination locations.');
      return;
    }
    setLoadingQuotes(true);
    try {
      const enabled = VEHICLE_OPTIONS.filter(v => v.enabled);
      const results = await Promise.allSettled(
        enabled.map(v =>
          mobilityPassengerService.getFareQuote({
            serviceType: v.type,
            pickupLat: pickupLat, pickupLng: pickupLng,
            destLat:   pickupLat + 0.05, destLng: pickupLng + 0.05,
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
      pickupLat:       pickupLat,
      pickupLng:       pickupLng,
      pickupAddress:   pickupAddr,
      destLat:         pickupLat + 0.05,
      destLng:         pickupLng + 0.05,
      destAddress:     destAddr,
      quoteId:         chosen.quote.quoteId,
      idempotencyKey:  `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  }

  const selectedQuote = quotes.find(q => q.type === selectedType);
  const vehicleMeta   = VEHICLE_OPTIONS.find(v => v.type === selectedType);

  const phaseTitle = phase === 'LOCATION' ? 'Where to?' :
                     phase === 'SELECT_RIDE' ? 'Choose Ride' : 'Confirm Ride';

  const phaseStep = phase === 'LOCATION' ? 1 : phase === 'SELECT_RIDE' ? 2 : 3;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Modern Navigation Header ──────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={s.backBtn} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{phaseTitle}</Text>
          <Text style={s.headerSubtitle}>Step {phaseStep} of 3</Text>
        </View>

        {/* 3-Step Indicator Bar */}
        <View style={s.stepPills}>
          {(['LOCATION', 'SELECT_RIDE', 'CONFIRM'] as Phase[]).map((p, idx) => {
            const currentIdx = (['LOCATION', 'SELECT_RIDE', 'CONFIRM'] as Phase[]).indexOf(phase);
            const isDone    = idx < currentIdx;
            const isActive  = phase === p;
            return (
              <View
                key={p}
                style={[
                  s.stepPill,
                  isActive && s.stepPillActive,
                  isDone && s.stepPillDone,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* ── Vector Map Preview ───────────────────────────────── */}
      <View style={s.mapWrapper}>
        <LinearGradient
          colors={['#E0E7FF', '#EFF6FF', '#F8FAFC']}
          style={s.mapCanvas}
        >
          {/* Decorative transit road grid */}
          <View style={s.mapRoadH1} />
          <View style={s.mapRoadH2} />
          <View style={s.mapRoadV1} />
          <View style={s.mapRoadV2} />

          {/* Interactive route path simulation */}
          <View style={s.mapRoutePath}>
            {/* Origin Pin */}
            <View style={s.mapPinWrap}>
              <View style={s.mapPinOriginOuter}>
                <View style={s.mapPinOriginInner} />
              </View>
              <View style={s.mapPinLabel}>
                <Text style={s.mapPinLabelText}>Pickup</Text>
              </View>
            </View>

            {/* Dashed connector */}
            <View style={s.mapConnectorLine} />

            {/* Destination Pin */}
            <View style={s.mapPinWrap}>
              <View style={s.mapPinDestOuter}>
                <Ionicons name="location" size={14} color="#EF4444" />
              </View>
              <View style={s.mapPinLabel}>
                <Text style={s.mapPinLabelText}>Destination</Text>
              </View>
            </View>
          </View>

          {/* GPS Quick Button on Map */}
          <TouchableOpacity
            style={s.floatingGpsBtn}
            onPress={handleGps}
            disabled={gpsLoading}
            activeOpacity={0.85}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="locate" size={16} color={COLORS.primary} />
                <Text style={s.floatingGpsText}>Locate</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* ── Phase 1: Location Inputs ──────────────────────────── */}
      {phase === 'LOCATION' && (
        <View style={s.bottomSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.bottomSheetScroll}>
            {/* Route Input Card */}
            <View style={s.locationCard}>
              {/* Pickup row */}
              <View style={s.inputRow}>
                <View style={s.originDotWrap}>
                  <View style={s.originDot} />
                </View>
                <View style={[s.inputBox, activeInput === 'pickup' && s.inputBoxFocused]}>
                  <TextInput
                    style={s.inputText}
                    placeholder="Enter pickup location"
                    placeholderTextColor={COLORS.textMuted}
                    value={pickupAddr}
                    onChangeText={setPickupAddr}
                    onFocus={() => setActiveInput('pickup')}
                  />
                  {pickupAddr.length > 0 && (
                    <TouchableOpacity onPress={() => setPickupAddr('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Connecting dashed track */}
              <View style={s.trackConnector}>
                <View style={s.trackDot} />
                <View style={s.trackDot} />
                <View style={s.trackDot} />
              </View>

              {/* Destination row */}
              <View style={s.inputRow}>
                <View style={s.destDotWrap}>
                  <Ionicons name="location" size={16} color="#EF4444" />
                </View>
                <View style={[s.inputBox, activeInput === 'dest' && s.inputBoxFocused]}>
                  <TextInput
                    style={s.inputText}
                    placeholder="Where are you going?"
                    placeholderTextColor={COLORS.textMuted}
                    value={destAddr}
                    onChangeText={setDestAddr}
                    onFocus={() => setActiveInput('dest')}
                    returnKeyType="done"
                  />
                  {destAddr.length > 0 && (
                    <TouchableOpacity onPress={() => setDestAddr('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Quick Saved Shortcuts */}
            <View style={s.savedPlacesSection}>
              <Text style={s.savedSectionTitle}>Saved Places</Text>
              <View style={s.savedGrid}>
                {SAVED_PLACES.map((sp) => (
                  <TouchableOpacity
                    key={sp.label}
                    style={s.savedCard}
                    onPress={() => {
                      if (sp.addr) {
                        if (activeInput === 'pickup') setPickupAddr(sp.addr);
                        else setDestAddr(sp.addr);
                      } else {
                        Alert.alert(`Set ${sp.label}`, `Please enter your ${sp.label.toLowerCase()} address above to set it for quick booking.`);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={s.savedIconCircle}>
                      <Ionicons name={sp.icon} size={16} color={COLORS.primary} />
                    </View>
                    <View style={s.savedCardText}>
                      <Text style={s.savedCardLabel}>{sp.label}</Text>
                      <Text style={s.savedCardSub} numberOfLines={1}>{sp.sublabel}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[s.primaryCtaBtn, loadingQuotes && s.primaryCtaDisabled]}
              onPress={fetchAllQuotes}
              activeOpacity={0.88}
              disabled={loadingQuotes}
            >
              {loadingQuotes ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.primaryCtaText}>Finding available rides…</Text>
                </>
              ) : (
                <>
                  <Text style={s.primaryCtaText}>See Available Rides</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ── Phase 2: Select Ride ──────────────────────────────── */}
      {phase === 'SELECT_RIDE' && (
        <View style={s.bottomSheet}>
          {/* Route Summary Pill */}
          <View style={s.routePillCard}>
            <View style={s.routePillLeft}>
              <View style={s.routeDotRow}>
                <View style={s.routeDotMiniGreen} />
                <Text style={s.routePillText} numberOfLines={1}>{pickupAddr}</Text>
              </View>
              <View style={s.routeDotRow}>
                <View style={s.routeDotMiniRed} />
                <Text style={s.routePillText} numberOfLines={1}>{destAddr}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setPhase('LOCATION')} style={s.routeEditBtn}>
              <Text style={s.routeEditText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle List */}
          <ScrollView style={s.vehicleList} showsVerticalScrollIndicator={false}>
            {VEHICLE_OPTIONS.map((v) => {
              const q = quotes.find(quote => quote.type === v.type);
              const isSelected = selectedType === v.type;
              const isDisabled = !v.enabled;

              return (
                <TouchableOpacity
                  key={v.type}
                  style={[
                    s.vehicleCard,
                    isSelected && s.vehicleCardSelected,
                    isDisabled && s.vehicleCardDisabled,
                  ]}
                  onPress={() => v.enabled && setSelectedType(v.type)}
                  activeOpacity={v.enabled ? 0.85 : 1}
                >
                  <View style={[s.vehicleIconWrap, { backgroundColor: v.iconBg }]}>
                    <Ionicons name={v.icon} size={22} color={v.color} />
                  </View>

                  <View style={s.vehicleDetails}>
                    <View style={s.vehicleTitleRow}>
                      <Text style={[s.vehicleTitle, isSelected && s.vehicleTitleSelected]}>
                        {v.label}
                      </Text>
                      <View style={s.paxBadge}>
                        <Ionicons name="person" size={10} color={COLORS.textMuted} />
                        <Text style={s.paxBadgeText}>{v.maxPax}</Text>
                      </View>
                      {!v.enabled && (
                        <View style={s.vehicleSoonPill}>
                          <Text style={s.vehicleSoonText}>Soon</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.vehicleSub}>{v.sublabel}</Text>
                  </View>

                  <View style={s.vehicleFareBox}>
                    {q ? (
                      <>
                        <Text style={[s.vehicleFareNumber, isSelected && s.vehicleFareSelected]}>
                          ₹{q.quote.total.toFixed(0)}
                        </Text>
                        <View style={s.etaPill}>
                          <Ionicons name="time-outline" size={10} color="#059669" />
                          <Text style={s.etaPillText}>{q.quote.etaMinutes} min</Text>
                        </View>
                      </>
                    ) : isDisabled ? (
                      <Text style={s.vehicleFareN}>—</Text>
                    ) : (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    )}
                  </View>

                  {isSelected && (
                    <View style={s.vehicleCheckBadge}>
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedQuote && (
            <TouchableOpacity
              style={s.primaryCtaBtn}
              onPress={() => setPhase('CONFIRM')}
              activeOpacity={0.88}
            >
              <Text style={s.primaryCtaText}>
                Book {vehicleMeta?.label} · ₹{selectedQuote.quote.total.toFixed(0)}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Phase 3: Confirm Ride ─────────────────────────────── */}
      {phase === 'CONFIRM' && selectedQuote && (
        <View style={s.bottomSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.confirmScroll}>
            {/* Fare Summary Card */}
            <View style={s.confirmFareCard}>
              <View style={s.confirmFareHeader}>
                <View>
                  <Text style={s.confirmRideLabel}>{vehicleMeta?.label} Booking</Text>
                  <Text style={s.confirmTotalAmount}>₹{selectedQuote.quote.total.toFixed(2)}</Text>
                </View>
                <View style={s.confirmEtaBadge}>
                  <Ionicons name="flash" size={13} color="#2563EB" />
                  <Text style={s.confirmEtaBadgeText}>{selectedQuote.quote.etaMinutes} min pickup</Text>
                </View>
              </View>

              <View style={s.confirmDivider} />

              {[
                { label: 'Base Fare',      amt: selectedQuote.quote.baseFare },
                { label: 'Distance Fare',  amt: selectedQuote.quote.distanceFare },
                { label: 'Duration Fare',  amt: selectedQuote.quote.durationFare },
                { label: 'Taxes & Levies', amt: selectedQuote.quote.taxes },
              ].map(({ label, amt }) => (
                <View key={label} style={s.fareBreakdownRow}>
                  <Text style={s.fareBreakdownLabel}>{label}</Text>
                  <Text style={s.fareBreakdownAmt}>₹{amt.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            {/* Payment Method Selector */}
            <View style={s.paymentSection}>
              <Text style={s.paymentTitle}>Payment Method</Text>
              <View style={s.paymentList}>
                {PAYMENT_OPTIONS.map(({ method, icon, label, sub }) => {
                  const isSelected = payment === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[s.paymentItem, isSelected && s.paymentItemSelected]}
                      onPress={() => setPayment(method)}
                      activeOpacity={0.85}
                    >
                      <View style={[s.paymentIconWrap, isSelected && s.paymentIconWrapSelected]}>
                        <Ionicons name={icon} size={18} color={isSelected ? COLORS.primary : COLORS.textMuted} />
                      </View>
                      <View style={s.paymentDetails}>
                        <Text style={[s.paymentLabel, isSelected && s.paymentLabelSelected]}>{label}</Text>
                        <Text style={s.paymentSub}>{sub}</Text>
                      </View>
                      <View style={[s.radioCircle, isSelected && s.radioCircleSelected]}>
                        {isSelected && <View style={s.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Guaranteed Fare Notice */}
            <View style={s.fareLockCard}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
              <Text style={s.fareLockText}>
                Guaranteed upfront fare: ₹{selectedQuote.quote.total.toFixed(2)}. No hidden surge pricing within community bounds.
              </Text>
            </View>

            {/* Confirm & Book CTA */}
            <TouchableOpacity
              style={[s.primaryCtaBtn, bookMutation.isPending && s.primaryCtaDisabled]}
              onPress={handleConfirmBook}
              activeOpacity={0.88}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.primaryCtaText}>Confirming ride…</Text>
                </>
              ) : (
                <>
                  <Text style={s.primaryCtaText}>
                    Confirm {vehicleMeta?.label} · ₹{selectedQuote.quote.total.toFixed(0)}
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
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
  stepPills: {
    flexDirection: 'row',
    gap: 4,
  },
  stepPill: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  stepPillActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  stepPillDone: {
    backgroundColor: '#10B981',
  },

  // ── Vector Map Preview ─────────────────────────────────────
  mapWrapper: {
    height: 180,
    overflow: 'hidden',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapRoadH1: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mapRoadH2: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  mapRoadV1: {
    position: 'absolute',
    left: 80,
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  mapRoadV2: {
    position: 'absolute',
    right: 90,
    top: 0,
    bottom: 0,
    width: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mapRoutePath: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.xl,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.15)',
  },
  mapPinWrap: {
    alignItems: 'center',
    gap: 2,
  },
  mapPinOriginOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinOriginInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  mapPinDestOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinLabel: {
    paddingHorizontal: 4,
  },
  mapPinLabelText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  mapConnectorLine: {
    width: 32,
    height: 2,
    backgroundColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  floatingGpsBtn: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  floatingGpsText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // ── Bottom Sheet Container ─────────────────────────────────
  bottomSheet: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    marginTop: -16,
    ...SHADOWS.lg,
  },
  bottomSheetScroll: {
    gap: 16,
    paddingBottom: 24,
  },

  // ── Location Inputs Card ───────────────────────────────────
  locationCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  originDotWrap: {
    width: 24,
    alignItems: 'center',
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  destDotWrap: {
    width: 24,
    alignItems: 'center',
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
  },
  inputBoxFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  trackConnector: {
    marginLeft: 11,
    paddingVertical: 2,
    gap: 3,
  },
  trackDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textMuted,
  },

  // ── Saved Places ───────────────────────────────────────────
  savedPlacesSection: {
    gap: 8,
  },
  savedSectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  savedGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  savedCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  savedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCardText: {
    flex: 1,
  },
  savedCardLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  savedCardSub: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ── Primary Action CTA ─────────────────────────────────────
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 15,
    ...SHADOWS.primary,
  },
  primaryCtaDisabled: {
    opacity: 0.65,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 15,
  },

  // ── Phase 2: Route Pill & Vehicle List ─────────────────────
  routePillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    gap: 10,
  },
  routePillLeft: {
    flex: 1,
    gap: 4,
  },
  routeDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDotMiniGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  routeDotMiniRed: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  routePillText: {
    fontSize: 12.5,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    flex: 1,
  },
  routeEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.sm,
  },
  routeEditText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  vehicleList: {
    flex: 1,
    marginBottom: 12,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  vehicleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5F7FF',
  },
  vehicleCardDisabled: {
    opacity: 0.55,
  },
  vehicleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleTitle: {
    fontSize: 14.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  vehicleTitleSelected: {
    color: COLORS.primary,
  },
  paxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  paxBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  vehicleSoonPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  vehicleSoonText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#D97706',
  },
  vehicleSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  vehicleFareBox: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  vehicleFareNumber: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  vehicleFareSelected: {
    color: COLORS.primary,
  },
  vehicleFareN: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  etaPillText: {
    fontSize: 10.5,
    fontFamily: FONTS.semiBold,
    color: '#059669',
  },
  vehicleCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // ── Phase 3: Confirm Screen ────────────────────────────────
  confirmScroll: {
    gap: 14,
    paddingBottom: 24,
  },
  confirmFareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  confirmFareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  confirmRideLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  confirmTotalAmount: {
    fontSize: 28,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    marginTop: 2,
  },
  confirmEtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  confirmEtaBadgeText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: '#2563EB',
  },
  confirmDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  fareBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fareBreakdownLabel: {
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  fareBreakdownAmt: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },

  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  promoInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  promoActionBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promoActionBtnApplied: {
    backgroundColor: '#ECFDF5',
  },
  promoActionBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  promoActionBtnTextApplied: {
    color: '#059669',
  },

  paymentSection: {
    gap: 8,
  },
  paymentTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  paymentList: {
    gap: 8,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  paymentItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5F7FF',
  },
  paymentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconWrapSelected: {
    backgroundColor: '#EEF2FF',
  },
  paymentDetails: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  paymentLabelSelected: {
    color: COLORS.primary,
  },
  paymentSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  fareLockCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  fareLockText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: '#065F46',
    lineHeight: 16,
  },
});
