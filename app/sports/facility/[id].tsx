import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { facilityService, SlotDto } from '@/services/facilityService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';

// ── Helpers ────────────────────────────────────────────────────────────────

const FACILITY_EMOJI: Record<string, string> = {
  BADMINTON: '🏸', TENNIS: '🎾', SWIMMING_POOL: '🏊', GYM: '💪',
  CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', PARTY_HALL: '🎉',
  SQUASH: '🎾', TABLE_TENNIS: '🏓', CLUBHOUSE: '🏠', PICKLEBALL: '🏓',
};

function buildDateStrip(): Array<{ label: string; sub: string; iso: string }> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return {
      label: i === 0 ? 'Today' : days[d.getDay()],
      sub: `${d.getDate()}`,
      iso,
    };
  });
}

function formatPrice(rate: number, slots: number, duration: number): string {
  if (rate === 0) return 'Free';
  const hrs = (slots * duration) / 60;
  return `₹${(rate * hrs).toFixed(0)}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FacilityBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();

  const dateStrip = useMemo(buildDateStrip, []);
  const [selectedDate, setSelectedDate] = useState(dateStrip[0].iso);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  // Facility details
  const { data: facility, isLoading: loadingFacility } = useQuery({
    queryKey: ['facility', id],
    queryFn: () => facilityService.getFacility(id!),
    enabled: Boolean(id),
    staleTime: 300_000,
  });

  // Live slots
  const { data: slots = [], isLoading: loadingSlots, refetch: refetchSlots } = useQuery({
    queryKey: ['facility-slots', id, selectedDate],
    queryFn: () => facilityService.getSlots(id!, selectedDate),
    enabled: Boolean(id),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Book mutation
  const bookMutation = useMutation({
    mutationFn: () => {
      if (!facility || selectedSlots.length === 0) throw new Error('No slot selected');
      const sorted = [...selectedSlots].sort();
      const startTime = sorted[0].split(' - ')[0];
      const endTime = sorted[sorted.length - 1].split(' - ')[1];
      return facilityService.bookSlot({
        facilityId: id!,
        date: selectedDate,
        startTime,
        endTime,
        guestCount: 1,
        purpose: `${facility.name} booking`,
      });
    },
    onSuccess: (data) => {
      setBooking(data);
      setSelectedSlots([]);
      setShowConfirm(false);
      qc.invalidateQueries({ queryKey: ['facility-slots', id, selectedDate] });
      qc.invalidateQueries({ queryKey: ['facility-my-bookings'] });
    },
    onError: (err: any) => {
      setShowConfirm(false);
      Alert.alert('Booking Failed', err?.response?.data?.message || 'Could not complete booking. Please try again.');
    },
  });

  // Waitlist mutation
  const waitlistMutation = useMutation({
    mutationFn: (slot: SlotDto) =>
      facilityService.joinWaitlist(id!, selectedDate, slot.startTime, slot.endTime),
    onSuccess: () => Alert.alert('Added to Waitlist', "You'll be notified if the slot opens up."),
    onError: () => Alert.alert('Error', 'Could not join waitlist.'),
  });

  const toggleSlot = useCallback((slotKey: string, available: boolean) => {
    if (!available) return;
    setSelectedSlots(prev =>
      prev.includes(slotKey) ? prev.filter(s => s !== slotKey) : [...prev, slotKey],
    );
  }, []);

  const totalPrice = useMemo(() => {
    if (!facility) return '';
    return formatPrice(facility.hourlyRate, selectedSlots.length, facility.slotDurationMinutes);
  }, [facility, selectedSlots]);

  const emoji = FACILITY_EMOJI[facility?.type ?? ''] ?? '🏟️';

  if (loadingFacility) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{facility?.name ?? 'Facility'}</Text>
        <TouchableOpacity onPress={() => router.push(`/sports/facility/my-bookings` as any)}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Facility Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}><Text style={{ fontSize: 36 }}>{emoji}</Text></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.heroName}>{facility?.name ?? '—'}</Text>
            <View style={s.heroMetaRow}>
              <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
              <Text style={s.heroMeta}>{facility?.openTime} – {facility?.closeTime}</Text>
              <Text style={s.heroMetaDot}>·</Text>
              <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
              <Text style={s.heroMeta}>{facility?.capacity} max</Text>
            </View>
            <View style={s.heroMetaRow}>
              <Ionicons name="cash-outline" size={12} color={COLORS.textMuted} />
              <Text style={s.heroMeta}>
                {facility?.hourlyRate ? `₹${facility.hourlyRate}/hr` : 'Free for residents'}
              </Text>
              <Text style={s.heroMetaDot}>·</Text>
              <Text style={s.heroMeta}>{facility?.slotDurationMinutes} min slots</Text>
            </View>
          </View>
        </View>

        {facility?.rules ? (
          <View style={s.rulesBox}>
            <Ionicons name="information-circle-outline" size={14} color="#92400E" />
            <Text style={s.rulesText}>{facility.rules}</Text>
          </View>
        ) : null}

        {/* Date strip */}
        <Text style={s.sectionLabel}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dateStrip}>
          {dateStrip.map(d => {
            const active = d.iso === selectedDate;
            return (
              <TouchableOpacity
                key={d.iso}
                style={[s.dateChip, active && s.dateChipActive]}
                onPress={() => { setSelectedDate(d.iso); setSelectedSlots([]); }}
              >
                <Text style={[s.dateChipLabel, active && s.dateChipLabelActive]}>{d.label}</Text>
                <Text style={[s.dateChipSub, active && s.dateChipSubActive]}>{d.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Legend */}
        <View style={s.legend}>
          {[
            { color: '#D1FAE5', border: '#6EE7B7', label: 'Available' },
            { color: '#F3F4F6', border: '#E5E7EB', label: 'Booked' },
            { color: '#DBEAFE', border: '#93C5FD', label: 'Selected' },
          ].map(l => (
            <View key={l.label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: l.color, borderColor: l.border }]} />
              <Text style={s.legendLabel}>{l.label}</Text>
            </View>
          ))}
        </View>

        {/* Slot grid */}
        <Text style={s.sectionLabel}>Available Slots</Text>
        {loadingSlots ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : slots.length === 0 ? (
          <View style={s.emptySlots}>
            <Ionicons name="calendar-outline" size={28} color={COLORS.textMuted} />
            <Text style={s.emptySlotsText}>No slots configured for this facility</Text>
          </View>
        ) : (
          <View style={s.slotGrid}>
            {slots.map((slot) => {
              const key = `${slot.startTime} - ${slot.endTime}`;
              const selected = selectedSlots.includes(key);
              const mine = booking && !slot.available && slot.bookedByName === (user?.name || user?.fullName);
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.slotChip,
                    slot.available && s.slotAvailable,
                    !slot.available && s.slotBooked,
                    selected && s.slotSelected,
                    mine && s.slotMine,
                  ]}
                  onPress={() => {
                    if (!slot.available && !mine) {
                      Alert.alert(
                        'Slot Booked',
                        slot.bookedByName ? `Booked by ${slot.bookedByName}` : 'This slot is taken.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Join Waitlist', onPress: () => waitlistMutation.mutate(slot) },
                        ],
                      );
                    } else {
                      toggleSlot(key, slot.available || mine === true);
                    }
                  }}
                  disabled={bookMutation.isPending}
                >
                  <Text style={[
                    s.slotTime,
                    !slot.available && !mine && s.slotTimeBooked,
                    selected && s.slotTimeSelected,
                  ]}>
                    {slot.startTime}
                  </Text>
                  <Text style={[s.slotTimeSub, !slot.available && !mine && { color: COLORS.textMuted }]}>
                    {slot.endTime}
                  </Text>
                  {!slot.available && !mine && (
                    <Text style={s.slotBookedBadge}>Taken</Text>
                  )}
                  {selected && (
                    <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginTop: 2 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {booking && (
          <View style={s.successCard}>
            <Text style={s.successTitle}>✅ Booking Confirmed!</Text>
            <Text style={s.successRef}>Ref: {booking.bookingRef}</Text>
            <Text style={s.successDetail}>{booking.date} · {booking.startTime} – {booking.endTime}</Text>
            {booking.totalAmount > 0 && (
              <Text style={s.successAmount}>Total: ₹{booking.totalAmount}</Text>
            )}
            <TouchableOpacity onPress={() => setBooking(null)}>
              <Text style={s.successDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom booking bar */}
      {selectedSlots.length > 0 && (
        <View style={s.bookBar}>
          <View>
            <Text style={s.bookBarLabel}>{selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} selected</Text>
            <Text style={s.bookBarPrice}>{totalPrice}</Text>
          </View>
          <TouchableOpacity
            style={s.bookBtn}
            onPress={() => setShowConfirm(true)}
            disabled={bookMutation.isPending}
          >
            {bookMutation.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.bookBtnText}>Book Now</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm modal */}
      <Modal visible={showConfirm} transparent animationType="slide" onRequestClose={() => setShowConfirm(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Confirm Booking</Text>
            <View style={s.modalRow}>
              <Text style={s.modalLabel}>Facility</Text>
              <Text style={s.modalValue}>{facility?.name}</Text>
            </View>
            <View style={s.modalRow}>
              <Text style={s.modalLabel}>Date</Text>
              <Text style={s.modalValue}>{selectedDate}</Text>
            </View>
            <View style={s.modalRow}>
              <Text style={s.modalLabel}>Slots</Text>
              <Text style={s.modalValue}>{selectedSlots.length} × {facility?.slotDurationMinutes} min</Text>
            </View>
            <View style={[s.modalRow, { marginBottom: 0 }]}>
              <Text style={s.modalLabel}>Total</Text>
              <Text style={[s.modalValue, { fontWeight: '700', color: COLORS.primary }]}>{totalPrice}</Text>
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowConfirm(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalConfirm}
                onPress={() => bookMutation.mutate()}
                disabled={bookMutation.isPending}
              >
                {bookMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmText}>Confirm & Book</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 14, paddingTop: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 12, gap: 10, backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },

  hero: {
    flexDirection: 'row', gap: 14, backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, ...SHADOWS.sm,
  },
  heroIcon: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMeta: { fontSize: 11, color: COLORS.textMuted },
  heroMetaDot: { fontSize: 11, color: COLORS.textMuted },

  rulesBox: {
    flexDirection: 'row', gap: 7, backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.md, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  rulesText: { flex: 1, fontSize: 11, color: '#78350F', lineHeight: 16 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 4 },

  dateStrip: { marginBottom: 14 },
  dateChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.md, backgroundColor: COLORS.card, marginRight: 8,
    borderWidth: 1, borderColor: COLORS.border, minWidth: 56,
  },
  dateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateChipLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  dateChipLabelActive: { color: '#fff' },
  dateChipSub: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  dateChipSubActive: { color: '#fff' },

  legend: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  legendLabel: { fontSize: 11, color: COLORS.textMuted },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  slotChip: {
    width: '22%', minWidth: 76, alignItems: 'center', paddingVertical: 10,
    borderRadius: RADIUS.md, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  slotAvailable: { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  slotBooked:    { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  slotSelected:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  slotMine:      { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  slotTime:        { fontSize: 12, fontWeight: '700', color: '#065F46' },
  slotTimeBooked:  { color: COLORS.textMuted },
  slotTimeSelected:{ color: '#fff' },
  slotTimeSub:     { fontSize: 10, color: '#059669', marginTop: 1 },
  slotBookedBadge: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },

  emptySlots: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptySlotsText: { fontSize: 13, color: COLORS.textMuted },

  successCard: {
    backgroundColor: '#ECFDF5', borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: '#6EE7B7', gap: 4, marginVertical: 10,
  },
  successTitle:  { fontSize: 15, fontWeight: '700', color: '#065F46' },
  successRef:    { fontSize: 12, color: '#059669' },
  successDetail: { fontSize: 12, color: COLORS.text },
  successAmount: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  successDismiss:{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  bookBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOWS.md,
  },
  bookBarLabel: { fontSize: 12, color: COLORS.textMuted },
  bookBarPrice: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  bookBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: RADIUS.full, ...SHADOWS.sm, minWidth: 110, alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  modalLabel: { fontSize: 13, color: COLORS.textMuted },
  modalValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  modalConfirm: {
    flex: 2, paddingVertical: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
