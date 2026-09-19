import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';
import { commuteService } from '@/services/commuteService';
import { COLORS } from '@/constants/config';

export default function RideDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [pickupNote, setPickupNote] = useState('');
  const [seats, setSeats] = useState('1');

  const { data: ride, isLoading } = useQuery({
    queryKey: ['commute-ride', id],
    queryFn:  () => commuteService.getRide(Number(id)),
    enabled:  !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['commute-ride', id] });
    queryClient.invalidateQueries({ queryKey: ['commute-upcoming'] });
    queryClient.invalidateQueries({ queryKey: ['commute-stats'] });
    queryClient.invalidateQueries({ queryKey: ['commute-my-offers'] });
    queryClient.invalidateQueries({ queryKey: ['commute-my-bookings'] });
  };

  const bookMutation = useMutation({
    mutationFn: () => commuteService.bookRide(Number(id), {
      seatsBooked: parseInt(seats, 10) || 1,
      pickupNote: pickupNote.trim() || undefined,
    }),
    onSuccess: () => { invalidate(); Alert.alert('Booked!', 'Your booking request has been sent.'); },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message || 'Could not book ride.'),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: () => commuteService.cancelBooking(Number(id)),
    onSuccess: () => { invalidate(); Alert.alert('Cancelled', 'Your booking has been cancelled.'); },
    onError: () => Alert.alert('Error', 'Could not cancel booking.'),
  });

  const cancelRideMutation = useMutation({
    mutationFn: () => commuteService.cancelRide(Number(id)),
    onSuccess: () => { invalidate(); router.back(); },
    onError: () => Alert.alert('Error', 'Could not cancel ride.'),
  });

  const confirmMutation = useMutation({
    mutationFn: (bookingId: number) => commuteService.confirmBooking(bookingId),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (bookingId: number) => commuteService.rejectBooking(bookingId),
    onSuccess: invalidate,
  });

  if (isLoading || !ride) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const isOffer = ride.rideType === 'OFFER';
  const canBook = !ride.isMyRide && !ride.hasBooked && ride.status === 'ACTIVE' && ride.availableSeats > 0;
  const canCancelBooking = ride.hasBooked && ride.myBookingStatus !== 'CANCELLED';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ride Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Type & status */}
        <View style={s.row}>
          <View style={[s.typeBadge, { backgroundColor: isOffer ? '#EEF2FF' : '#FEF3C7' }]}>
            <Text style={[s.typeText, { color: isOffer ? COLORS.primary : '#92400E' }]}>
              {isOffer ? '🚗 Ride Offer' : '🙋 Ride Request'}
            </Text>
          </View>
          <Text style={[s.statusTag, {
            color: ride.status === 'ACTIVE' ? COLORS.success : ride.status === 'CANCELLED' ? COLORS.error : COLORS.textMuted
          }]}>
            {ride.status}
          </Text>
        </View>

        {/* Route */}
        <View style={s.card}>
          <View style={s.routeWrap}>
            <View style={s.routeLine}>
              <View style={s.dotGreen} />
              <View style={s.dottedLine} />
              <View style={s.dotRed} />
            </View>
            <View style={s.routeTexts}>
              <View>
                <Text style={s.routeLabel}>FROM</Text>
                <Text style={s.routeValue}>{ride.fromLocation}</Text>
              </View>
              <View>
                <Text style={s.routeLabel}>TO</Text>
                <Text style={s.routeValue}>{ride.toLocation}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Details</Text>
          <View style={s.detailGrid}>
            <DetailItem label="Departure" value={format(new Date(ride.departureTime), 'dd MMM yyyy, h:mm a')} />
            <DetailItem label="Seats" value={`${ride.availableSeats} of ${ride.totalSeats} available`} />
            <DetailItem label="Price" value={ride.free ? 'Free' : `₹${ride.pricePerSeat}/seat`} />
            {ride.vehicleType && <DetailItem label="Vehicle" value={ride.vehicleType} />}
            {ride.vehicleNumber && <DetailItem label="Number" value={ride.vehicleNumber} />}
            {ride.recurring && <DetailItem label="Recurring" value={ride.recurringDays || 'Yes'} />}
            {ride.ladiesOnly && <DetailItem label="Ladies Only" value="Yes" />}
          </View>
          {ride.notes && (
            <View style={s.notesWrap}>
              <Text style={s.notesLabel}>Notes</Text>
              <Text style={s.notesText}>{ride.notes}</Text>
            </View>
          )}
        </View>

        {/* Driver info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{isOffer ? 'Driver' : 'Requester'}</Text>
          <View style={s.driverRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{ride.driverName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={s.driverName}>{ride.driverName}</Text>
              {ride.driverFlat && <Text style={s.driverFlat}>{ride.driverFlat}</Text>}
            </View>
          </View>
        </View>

        {/* Book section */}
        {canBook && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Book this ride</Text>
            <View style={s.bookForm}>
              <View style={s.bookRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.bookLabel}>Seats</Text>
                  <TextInput
                    style={s.bookInput}
                    value={seats}
                    onChangeText={setSeats}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={s.bookLabel}>Pickup note (optional)</Text>
                  <TextInput
                    style={s.bookInput}
                    placeholder="e.g. Gate 2"
                    placeholderTextColor={COLORS.textMuted}
                    value={pickupNote}
                    onChangeText={setPickupNote}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[s.bookBtn, bookMutation.isPending && { opacity: 0.6 }]}
                onPress={() => bookMutation.mutate()}
                disabled={bookMutation.isPending}
              >
                <Text style={s.bookBtnText}>
                  {bookMutation.isPending ? 'Booking...' : 'Book Ride'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Booking status */}
        {ride.hasBooked && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Your Booking</Text>
            <Text style={s.bookingStatus}>Status: {ride.myBookingStatus}</Text>
            {canCancelBooking && (
              <TouchableOpacity
                style={s.cancelBookingBtn}
                onPress={() => Alert.alert(
                  'Cancel Booking?',
                  'Are you sure you want to cancel your booking?',
                  [{ text: 'No' }, { text: 'Yes', style: 'destructive', onPress: () => cancelBookingMutation.mutate() }]
                )}
              >
                <Text style={s.cancelBookingText}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bookings list (for ride owner) */}
        {ride.isMyRide && ride.bookings && ride.bookings.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Passengers ({ride.bookings.length})</Text>
            {ride.bookings.map(b => (
              <View key={b.id} style={s.passengerRow}>
                <View style={s.passengerInfo}>
                  <Text style={s.passengerName}>
                    {b.passengerName}{b.passengerFlat ? ` · ${b.passengerFlat}` : ''}
                  </Text>
                  <Text style={s.passengerMeta}>
                    {b.seatsBooked} seat{b.seatsBooked > 1 ? 's' : ''} · {b.status}
                  </Text>
                  {b.pickupNote && <Text style={s.pickupNote}>📍 {b.pickupNote}</Text>}
                </View>
                {b.status === 'PENDING' && (
                  <View style={s.actionBtns}>
                    <TouchableOpacity
                      style={s.confirmBtn}
                      onPress={() => confirmMutation.mutate(b.id)}
                    >
                      <Text style={s.confirmText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={() => rejectMutation.mutate(b.id)}
                    >
                      <Text style={s.rejectText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Cancel ride (owner) */}
        {ride.isMyRide && ride.status === 'ACTIVE' && (
          <TouchableOpacity
            style={s.cancelRideBtn}
            onPress={() => Alert.alert(
              'Cancel Ride?',
              'This will cancel the ride for all passengers.',
              [{ text: 'No' }, { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelRideMutation.mutate() }]
            )}
          >
            <Text style={s.cancelRideText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailItem}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:          { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  headerTitle:      { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll:           { padding: 16, gap: 14 },
  row:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge:        { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  typeText:         { fontSize: 13, fontWeight: '700' },
  statusTag:        { fontSize: 13, fontWeight: '700' },
  card:             { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  cardTitle:        { fontSize: 15, fontWeight: '700', color: COLORS.text },
  routeWrap:        { flexDirection: 'row', gap: 12 },
  routeLine:        { alignItems: 'center', gap: 2, paddingVertical: 4 },
  dotGreen:         { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  dottedLine:       { width: 2, height: 30, backgroundColor: COLORS.border },
  dotRed:           { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error },
  routeTexts:       { flex: 1, justifyContent: 'space-between', gap: 12 },
  routeLabel:       { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1 },
  routeValue:       { fontSize: 15, fontWeight: '600', color: COLORS.text },
  detailGrid:       { gap: 8 },
  detailItem:       { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel:      { fontSize: 13, color: COLORS.textMuted },
  detailValue:      { fontSize: 13, fontWeight: '600', color: COLORS.text },
  notesWrap:        { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  notesLabel:       { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  notesText:        { fontSize: 13, color: COLORS.text },
  driverRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:           { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText:       { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  driverName:       { fontSize: 14, fontWeight: '600', color: COLORS.text },
  driverFlat:       { fontSize: 12, color: COLORS.textMuted },
  bookForm:         { gap: 10 },
  bookRow:          { flexDirection: 'row', gap: 10 },
  bookLabel:        { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  bookInput:        { backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: COLORS.text },
  bookBtn:          { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  bookBtnText:      { color: '#FFF', fontSize: 15, fontWeight: '700' },
  bookingStatus:    { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  cancelBookingBtn: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelBookingText:{ color: COLORS.error, fontWeight: '600', fontSize: 13 },
  passengerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  passengerInfo:    { flex: 1 },
  passengerName:    { fontSize: 13, fontWeight: '600', color: COLORS.text },
  passengerMeta:    { fontSize: 12, color: COLORS.textMuted },
  pickupNote:       { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  actionBtns:       { flexDirection: 'row', gap: 8 },
  confirmBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  confirmText:      { fontSize: 16, color: COLORS.success, fontWeight: '700' },
  rejectBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  rejectText:       { fontSize: 16, color: COLORS.error, fontWeight: '700' },
  cancelRideBtn:    { backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelRideText:   { color: COLORS.error, fontSize: 14, fontWeight: '700' },
});
