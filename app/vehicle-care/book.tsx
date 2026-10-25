import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { COLORS, FONTS, SHADOWS } from '@/constants/config';
import {
  vehicleCareService,
  ServiceCatalogItem,
  ServiceAddon,
  VehicleProfile,
  TimeSlot,
  CreateBookingRequest,
} from '@/services/vehicleCareService';

const SCREEN_W = Dimensions.get('window').width;

type Step = 'vehicle' | 'service' | 'addons' | 'slot' | 'review';
const STEPS: Step[] = ['vehicle', 'service', 'addons', 'slot', 'review'];
const STEP_LABELS: Record<Step, string> = {
  vehicle: 'Vehicle', service: 'Service', addons: 'Add-ons', slot: 'Date & Time', review: 'Review',
};

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <View style={ind.row}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <View style={[ind.dot, i <= idx && ind.dotActive]}>
            {i < idx ? (
              <Ionicons name="checkmark" size={12} color="#fff" />
            ) : (
              <Text style={ind.dotNum}>{i + 1}</Text>
            )}
          </View>
          {i < STEPS.length - 1 && <View style={[ind.line, i < idx && ind.lineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const ind = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: COLORS.primary },
  dotNum: { fontFamily: FONTS.bold, fontSize: 11, color: '#fff' },
  line: { flex: 1, height: 2, backgroundColor: '#CBD5E1', marginHorizontal: 2 },
  lineActive: { backgroundColor: COLORS.primary },
});

function nextDate(offset: number): Date {
  return addDays(new Date(), offset + 1);
}

export default function BookingFlowScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { serviceId: preselectedServiceId } = useLocalSearchParams<{ serviceId?: string }>();

  const [step, setStep] = useState<Step>(preselectedServiceId ? 'vehicle' : 'service');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(preselectedServiceId || null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(nextDate(0));
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [location, setLocation] = useState('Community Parking — Mana Verdant');

  const { data: vehicles = [] } = useQuery({ queryKey: ['vc-vehicles'], queryFn: vehicleCareService.getMyVehicles });
  const { data: catalog = [] } = useQuery({ queryKey: ['vc-catalog'], queryFn: vehicleCareService.getServiceCatalog });
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['vc-slots', dateStr, selectedServiceId],
    queryFn: () => vehicleCareService.getAvailableSlots(dateStr, selectedServiceId || ''),
    enabled: step === 'slot' && !!selectedServiceId,
  });

  const selectedService = catalog.find(s => s.id === selectedServiceId);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  const addonTotal = useMemo(() => {
    if (!selectedService) return 0;
    return selectedAddonIds.reduce((sum, id) => {
      const addon = selectedService.addons.find(a => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
  }, [selectedAddonIds, selectedService]);

  const totalPrice = (selectedService?.communityPrice || 0) + addonTotal;

  const bookMutation = useMutation({
    mutationFn: (req: CreateBookingRequest) => vehicleCareService.createBooking(req),
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: ['vc-my-bookings'] });
      Alert.alert(
        '✅ Booking Confirmed!',
        `Booking #${booking.bookingNumber}\n${booking.serviceName} on ${booking.date} at ${booking.startTime}\nYou will receive a confirmation once the technician is assigned.`,
        [{ text: 'View My Bookings', onPress: () => router.replace('/vehicle-care/my-bookings') }],
      );
    },
    onError: () => Alert.alert('Error', 'Could not create booking. Please try again.'),
  });

  function toggleAddon(id: string) {
    setSelectedAddonIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  }

  function goNext() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }
  function goBack() {
    const idx = STEPS.indexOf(step);
    if (idx === 0) router.back();
    else setStep(STEPS[idx - 1]);
  }

  function canAdvance(): boolean {
    if (step === 'vehicle') return !!selectedVehicleId;
    if (step === 'service') return !!selectedServiceId;
    if (step === 'addons') return true;
    if (step === 'slot') return !!selectedSlotId;
    return true;
  }

  function confirmBook() {
    if (!selectedVehicleId || !selectedServiceId || !selectedSlotId) return;
    bookMutation.mutate({
      vehicleId: selectedVehicleId,
      serviceId: selectedServiceId,
      addonIds: selectedAddonIds,
      slotId: selectedSlotId,
      location,
      paymentMethod: 'UPI',
    });
  }

  const dateOptions = Array.from({ length: 7 }, (_, i) => nextDate(i));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Wash</Text>
        <Text style={styles.stepLabel}>{STEP_LABELS[step]}</Text>
      </View>

      <StepIndicator current={step} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Step: Vehicle */}
        {step === 'vehicle' && (
          <>
            <Text style={styles.sectionTitle}>Select Your Vehicle</Text>
            {vehicles.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>🚗</Text>
                <Text style={styles.emptyTitle}>No vehicles saved</Text>
                <TouchableOpacity onPress={() => router.push('/vehicle-care/vehicles')} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Add a Vehicle First</Text>
                </TouchableOpacity>
              </View>
            )}
            {vehicles.map(v => (
              <TouchableOpacity
                key={v.id}
                onPress={() => setSelectedVehicleId(v.id)}
                style={[styles.selectionCard, selectedVehicleId === v.id && styles.selectionCardActive]}
              >
                <Text style={{ fontSize: 30 }}>{v.imageEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectionName}>{v.nickname}</Text>
                  <Text style={styles.selectionSub}>{v.make} {v.model} • {v.plateNumber}</Text>
                </View>
                <View style={[styles.radio, selectedVehicleId === v.id && styles.radioActive]}>
                  {selectedVehicleId === v.id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => router.push('/vehicle-care/vehicles')} style={styles.outlineBtn}>
              <Ionicons name="add" size={16} color={COLORS.primary} />
              <Text style={styles.outlineBtnText}>Add New Vehicle</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step: Service */}
        {step === 'service' && (
          <>
            <Text style={styles.sectionTitle}>Select Service</Text>
            {catalog
              .filter(s => !selectedVehicle || s.vehicleTypes.includes(selectedVehicle.type))
              .map(svc => (
                <TouchableOpacity
                  key={svc.id}
                  onPress={() => { setSelectedServiceId(svc.id); setSelectedAddonIds([]); }}
                  style={[styles.serviceCard, selectedServiceId === svc.id && styles.serviceCardActive]}
                >
                  <View style={styles.serviceCardIcon}>
                    <Text style={{ fontSize: 28 }}>{svc.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.serviceCardTop}>
                      <Text style={styles.serviceCardName}>{svc.name}</Text>
                      {svc.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>⭐ Popular</Text></View>}
                    </View>
                    <Text style={styles.serviceCardDesc} numberOfLines={2}>{svc.description}</Text>
                    <Text style={styles.serviceCardDuration}>⏱ {svc.durationMins} min</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                    <Text style={styles.communityPrice}>₹{svc.communityPrice}</Text>
                    <Text style={styles.basePrice}>₹{svc.basePrice}</Text>
                    <View style={[styles.radio, selectedServiceId === svc.id && styles.radioActive]}>
                      {selectedServiceId === svc.id && <View style={styles.radioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
          </>
        )}

        {/* Step: Add-ons */}
        {step === 'addons' && selectedService && (
          <>
            <Text style={styles.sectionTitle}>Optional Add-ons</Text>
            <Text style={styles.sectionSub}>Enhance your service with these add-ons</Text>
            {selectedService.addons.length === 0 && (
              <Text style={styles.emptyText}>No add-ons available for this service.</Text>
            )}
            {selectedService.addons.map(addon => (
              <TouchableOpacity
                key={addon.id}
                onPress={() => toggleAddon(addon.id)}
                style={[styles.addonCard, selectedAddonIds.includes(addon.id) && styles.addonCardActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.addonName}>{addon.name}</Text>
                  <Text style={styles.addonDesc}>{addon.description}</Text>
                  <Text style={styles.addonDuration}>⏱ +{addon.durationMins} min</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Text style={styles.addonPrice}>+₹{addon.price}</Text>
                  <View style={[styles.checkbox, selectedAddonIds.includes(addon.id) && styles.checkboxActive]}>
                    {selectedAddonIds.includes(addon.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Step: Slot */}
        {step === 'slot' && (
          <>
            <Text style={styles.sectionTitle}>Choose Date & Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
              {dateOptions.map((d, i) => {
                const ds = format(d, 'yyyy-MM-dd');
                const isSelected = format(selectedDate, 'yyyy-MM-dd') === ds;
                return (
                  <TouchableOpacity
                    key={ds}
                    onPress={() => { setSelectedDate(d); setSelectedSlotId(null); }}
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  >
                    <Text style={[styles.dateDay, isSelected && styles.dateChipActiveText]}>{format(d, 'EEE')}</Text>
                    <Text style={[styles.dateNum, isSelected && styles.dateChipActiveText]}>{format(d, 'd')}</Text>
                    <Text style={[styles.dateMon, isSelected && styles.dateChipActiveText]}>{format(d, 'MMM')}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {slotsLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
            {!slotsLoading && (
              <View style={styles.slotsGrid}>
                {slots.map(slot => (
                  <TouchableOpacity
                    key={slot.id}
                    onPress={() => slot.available && setSelectedSlotId(slot.id)}
                    style={[
                      styles.slotChip,
                      selectedSlotId === slot.id && styles.slotChipActive,
                      !slot.available && styles.slotChipDisabled,
                    ]}
                  >
                    <Text style={[styles.slotTime, selectedSlotId === slot.id && styles.slotTimeActive, !slot.available && styles.slotTimeDisabled]}>
                      {slot.startTime}
                    </Text>
                    <Text style={[styles.slotRemaining, !slot.available && styles.slotTimeDisabled]}>
                      {slot.available ? `${slot.remaining} left` : 'Full'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Service Location</Text>
            <View style={styles.locationCard}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          </>
        )}

        {/* Step: Review */}
        {step === 'review' && selectedVehicle && selectedService && selectedSlot && (
          <>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            <View style={styles.summaryCard}>
              <SummaryRow label="Vehicle" value={`${selectedVehicle.nickname} (${selectedVehicle.plateNumber})`} />
              <SummaryRow label="Service" value={`${selectedService.emoji} ${selectedService.name}`} />
              {selectedAddonIds.length > 0 && (
                <SummaryRow
                  label="Add-ons"
                  value={selectedAddonIds.map(id => selectedService.addons.find(a => a.id === id)?.name || '').filter(Boolean).join(', ')}
                />
              )}
              <SummaryRow label="Date" value={format(selectedDate, 'd MMMM yyyy')} />
              <SummaryRow label="Time" value={`${selectedSlot.startTime} – ${selectedSlot.endTime}`} />
              <SummaryRow label="Location" value={location} />
              <View style={styles.divider} />
              <SummaryRow label="Service Price" value={`₹${selectedService.communityPrice}`} />
              {addonTotal > 0 && <SummaryRow label="Add-ons" value={`₹${addonTotal}`} />}
              <View style={styles.divider} />
              <SummaryRow label="Total" value={`₹${totalPrice}`} highlight />
            </View>

            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>Cancellation Policy</Text>
              <Text style={styles.policyText}>Free cancellation up to 2 hours before the appointment. After that, a 20% fee applies.</Text>
            </View>

            <TouchableOpacity
              onPress={confirmBook}
              disabled={bookMutation.isPending}
              style={styles.bookBtn}
            >
              {bookMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.bookBtnText}>Confirm & Pay ₹{totalPrice}</Text>
                  </>
                )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom CTA (all steps except review) */}
      {step !== 'review' && (
        <View style={styles.bottomBar}>
          {totalPrice > 0 && (
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₹{totalPrice}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={goNext}
            disabled={!canAdvance()}
            style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
          >
            <Text style={styles.nextBtnText}>
              {step === 'slot' ? 'Review Booking' : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  stepLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary },
  scroll: { paddingVertical: 8, paddingBottom: 100 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  sectionSub: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B', marginHorizontal: 16, marginTop: -8, marginBottom: 12 },
  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: '#64748B', marginHorizontal: 16 },

  selectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, gap: 12, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.card },
  selectionCardActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  selectionName: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  selectionSub: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 8, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 12, gap: 6 },
  outlineBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primary },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  primaryBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },

  serviceCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, gap: 10, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.card },
  serviceCardActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  serviceCardIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  serviceCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceCardName: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  serviceCardDesc: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  serviceCardDuration: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', marginTop: 2 },
  popularBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  popularText: { fontFamily: FONTS.semiBold, fontSize: 10, color: '#92400E' },
  communityPrice: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },
  basePrice: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', textDecorationLine: 'line-through' },

  addonCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, gap: 10, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.card },
  addonCardActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  addonName: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  addonDesc: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  addonDuration: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', marginTop: 2 },
  addonPrice: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.primary },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  dateChip: { minWidth: 60, borderRadius: 14, padding: 10, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', ...SHADOWS.card },
  dateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateChipActiveText: { color: '#fff' },
  dateDay: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#64748B' },
  dateNum: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
  dateMon: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8' },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginTop: 12 },
  slotChip: { width: (SCREEN_W - 52) / 4, borderRadius: 12, padding: 10, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', ...SHADOWS.card },
  slotChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  slotChipDisabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  slotTime: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  slotTimeActive: { color: '#fff' },
  slotTimeDisabled: { color: '#94A3B8' },
  slotRemaining: { fontFamily: FONTS.regular, fontSize: 10, color: '#64748B', marginTop: 2 },

  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', marginHorizontal: 16, borderRadius: 12, padding: 12, gap: 8, marginTop: 4 },
  locationText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, flex: 1 },

  summaryCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 8, ...SHADOWS.card },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B', flex: 1 },
  summaryValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, flex: 1.5, textAlign: 'right' },
  summaryHighlight: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },

  policyCard: { backgroundColor: '#FEF3C7', marginHorizontal: 16, borderRadius: 12, padding: 14, marginTop: 12 },
  policyTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#92400E', marginBottom: 4 },
  policyText: { fontFamily: FONTS.regular, fontSize: 12, color: '#78350F', lineHeight: 18 },

  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 16, borderRadius: 16, paddingVertical: 16, gap: 10, ...SHADOWS.floating },
  bookBtnText: { fontFamily: FONTS.bold, fontSize: 17, color: '#fff' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingBottom: 24 },
  totalLabel: { fontFamily: FONTS.regular, fontSize: 11, color: '#64748B' },
  totalAmount: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13 },
  nextBtnDisabled: { backgroundColor: '#CBD5E1' },
  nextBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
});
