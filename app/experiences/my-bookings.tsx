import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Platform, StatusBar, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isPast } from 'date-fns';
import { experiencesService, ExperienceBooking, CATEGORY_META, RefundRequest } from '@/services/experiencesService';
import { THEME, FONTS, SHADOWS, COLORS } from '@/constants/config';

// ── QR Pass Modal ─────────────────────────────────────────────────────────────

function QRPassModal({ booking, onClose }: { booking: ExperienceBooking; onClose: () => void }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <LinearGradient
          colors={[booking.backdrop_color, booking.backdrop_color + 'CC']}
          style={{ paddingTop: Platform.OS === 'ios' ? 28 : 16, paddingBottom: 20, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: '#fff' }}>🎟️ Your Pass</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 20 }}>
          {/* Ticket visual */}
          <View style={{
            width: '100%', backgroundColor: '#F9FAFB', borderRadius: 24,
            borderWidth: 2, borderColor: '#E8E9F0', borderStyle: 'dashed',
            overflow: 'hidden',
          }}>
            {/* Top section */}
            <LinearGradient
              colors={[booking.backdrop_color, booking.backdrop_color + 'AA']}
              style={{ padding: 24, alignItems: 'center', gap: 10 }}
            >
              <Text style={{ fontSize: 52 }}>{booking.emoji}</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: '#fff', textAlign: 'center' }}>
                {booking.experience_title}
              </Text>
            </LinearGradient>

            {/* Tear line */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: -2 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', marginLeft: -10 }} />
              <View style={{ flex: 1, height: 1, borderWidth: 1, borderColor: '#DFE4E8', borderStyle: 'dashed' }} />
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', marginRight: -10 }} />
            </View>

            {/* QR section */}
            <View style={{ padding: 24, alignItems: 'center', gap: 16 }}>
              {/* Simulated QR code */}
              <View style={{
                width: 140, height: 140, backgroundColor: '#1A1A2E',
                borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                borderWidth: 4, borderColor: '#fff',
              }}>
                <Text style={{ fontSize: 62 }}>{booking.emoji}</Text>
              </View>

              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary, letterSpacing: 2 }}>
                {booking.booking_id}
              </Text>

              <View style={{ width: '100%', gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Date</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>
                    {format(parseISO(booking.start_date), 'EEE, d MMM yyyy')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Time</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{booking.start_time}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Venue</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text, flex: 1, textAlign: 'right' }} numberOfLines={2}>
                    {booking.venue}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Attendees</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{booking.attendee_count} person{booking.attendee_count !== 1 ? 's' : ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Status</Text>
                  <View style={{
                    backgroundColor: booking.status === 'CONFIRMED' ? '#ECFDF5' : '#FEF2F2',
                    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
                  }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: booking.status === 'CONFIRMED' ? '#059669' : '#DC2626' }}>
                      {booking.status}
                    </Text>
                  </View>
                </View>
                {booking.total_amount > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Amount Paid</Text>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary }}>
                      ₹{booking.total_amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, textAlign: 'center' }}>
            Show this QR at the entrance for check-in.{'\n'}Screenshot it for offline access.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Refund Modal ──────────────────────────────────────────────────────────────

const REFUND_REASONS = [
  'Change of plans',
  'Emergency / illness',
  'Duplicate booking',
  'Event not as expected',
  'Scheduling conflict',
  'Other',
];

function RefundModal({
  booking,
  onClose,
}: {
  booking: ExperienceBooking;
  onClose: () => void;
}) {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherText, setOtherText] = useState('');
  const [result, setResult] = useState<RefundRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const reason = selectedReason === 'Other' ? otherText.trim() : selectedReason;
    if (!reason) { Alert.alert('Select a reason'); return; }
    setLoading(true);
    try {
      const r = await experiencesService.requestRefund(booking.booking_id, reason, booking.total_amount);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <LinearGradient
          colors={['#7C1D1D', '#B91C1C']}
          style={{ paddingTop: Platform.OS === 'ios' ? 28 : 16, paddingBottom: 18, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: '#fff' }}>
              {result ? '✅ Refund Requested' : '💸 Request Refund'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {result ? (
            <View style={{ alignItems: 'center', gap: 14, marginTop: 16 }}>
              <Text style={{ fontSize: 52 }}>🔄</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: THEME.text, textAlign: 'center' }}>
                Refund of ₹{result.amount_requested.toLocaleString('en-IN')} requested
              </Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted, textAlign: 'center', lineHeight: 20 }}>
                Expected processing time: {result.estimated_days} business days.{'\n'}Refund ID: {result.refund_id}
              </Text>
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, width: '100%' }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#92400E', marginBottom: 4 }}>What happens next?</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#78350F', lineHeight: 18 }}>
                  • Refund request is under review (1–2 days){'\n'}
                  • Once approved, amount is credited within {result.estimated_days} days{'\n'}
                  • You'll receive a notification when done
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 36, paddingVertical: 14 }}
              >
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10 }}>
                <Text style={{ fontSize: 16 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#991B1B' }}>{booking.experience_title}</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#B91C1C', marginTop: 3 }}>
                    Refund amount: ₹{booking.total_amount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }}>Reason for refund</Text>

              {REFUND_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                    borderRadius: 14, borderWidth: 1.5,
                    borderColor: selectedReason === reason ? '#EF4444' : '#E8E9F0',
                    backgroundColor: selectedReason === reason ? '#FEF2F2' : '#F9FAFB',
                  }}
                >
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                    borderColor: selectedReason === reason ? '#EF4444' : '#CBD5E1',
                    backgroundColor: selectedReason === reason ? '#EF4444' : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedReason === reason && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                  </View>
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 14, color: THEME.text }}>{reason}</Text>
                </TouchableOpacity>
              ))}

              {selectedReason === 'Other' && (
                <TextInput
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder="Please describe your reason..."
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12,
                    padding: 12, fontFamily: FONTS.regular, fontSize: 14, color: THEME.text,
                    minHeight: 80, textAlignVertical: 'top',
                  }}
                />
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={{ backgroundColor: '#DC2626', borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1, marginTop: 4 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Submit Refund Request</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Booking Card ──────────────────────────────────────────────────────────────

function BookingCard({ booking, onViewPass, onCancel, onRefund }: {
  booking: ExperienceBooking;
  onViewPass: () => void;
  onCancel: () => void;
  onRefund: () => void;
}) {
  const meta = CATEGORY_META[booking.category];
  const past = (() => { try { return isPast(parseISO(booking.start_date)); } catch { return false; } })();
  const canRefund = booking.total_amount > 0 && booking.status === 'CONFIRMED' && !booking.refund_status;
  const refundPending = booking.refund_status === 'REQUESTED' || booking.refund_status === 'APPROVED';

  const statusColors: Record<string, string> = {
    CONFIRMED: '#059669', CANCELLED: '#DC2626', WAITLISTED: '#D97706', ATTENDED: '#2563EB',
  };

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden', ...SHADOWS.card }}>
      <LinearGradient
        colors={[booking.backdrop_color, booking.backdrop_color + '99']}
        style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Text style={{ fontSize: 32 }}>{booking.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff', lineHeight: 18 }} numberOfLines={2}>
            {booking.experience_title}
          </Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
            {meta.emoji} {meta.label}
          </Text>
        </View>
        <View style={{
          backgroundColor: statusColors[booking.status] ?? '#6B7280',
          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
        }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#fff' }}>{booking.status}</Text>
        </View>
      </LinearGradient>

      <View style={{ padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>
            {format(parseISO(booking.start_date), 'EEE, d MMM yyyy')} · {booking.start_time}
          </Text>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: booking.total_amount === 0 ? '#059669' : COLORS.primary }}>
              {booking.total_amount === 0 ? 'FREE' : `₹${booking.total_amount.toLocaleString('en-IN')}`}
            </Text>
            {booking.coupon_code && (
              <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: '#059669' }}>🏷️ {booking.coupon_code}</Text>
            )}
          </View>
        </View>

        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }} numberOfLines={1}>
          📍 {booking.venue}
        </Text>

        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>
          Booking ID: <Text style={{ fontFamily: FONTS.semiBold, color: COLORS.primary }}>{booking.booking_id}</Text>
        </Text>

        {refundPending && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8 }}>
            <Ionicons name="time-outline" size={14} color="#D97706" />
            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#92400E' }}>Refund {booking.refund_status?.toLowerCase()}</Text>
          </View>
        )}
        {booking.refund_status === 'PROCESSED' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', borderRadius: 8, padding: 8 }}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#065F46' }}>Refund processed ✓</Text>
          </View>
        )}

        {booking.status === 'CONFIRMED' && !past && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              onPress={onViewPass}
              style={{ flex: 2, backgroundColor: COLORS.primary, borderRadius: 12, padding: 11, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>🎟️ View Pass</Text>
            </TouchableOpacity>
            {canRefund ? (
              <TouchableOpacity
                onPress={onRefund}
                style={{ flex: 1, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, padding: 11, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: '#EF4444' }}>Refund</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onCancel}
                style={{ flex: 1, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, padding: 11, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#EF4444' }}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {past && !booking.refund_status && (
          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: THEME.muted }}>This event has ended ✓</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function MyBookingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<ExperienceBooking | null>(null);
  const [refundBooking, setRefundBooking] = useState<ExperienceBooking | null>(null);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => experiencesService.getMyBookings(),
    staleTime: 2 * 60 * 1000,
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => experiencesService.cancelBooking(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookings'] }),
    onError: () => Alert.alert('Error', 'Could not cancel. Please try again.'),
  });

  const handleCancel = (booking: ExperienceBooking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your booking for "${booking.experience_title}"?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(booking.booking_id),
        },
      ]
    );
  };

  const upcoming = bookings.filter(b => {
    try { return !isPast(parseISO(b.start_date)) && b.status === 'CONFIRMED'; } catch { return false; }
  });
  const past = bookings.filter(b => {
    try { return isPast(parseISO(b.start_date)) || b.status !== 'CONFIRMED'; } catch { return false; }
  });

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#312E81', '#4338CA']}
        style={{ paddingTop: Platform.OS === 'ios' ? 54 : 22, paddingBottom: 18, paddingHorizontal: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff', flex: 1 }}>
            🎟️ My Bookings
          </Text>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 52 }}>🎭</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: THEME.text, marginTop: 16, textAlign: 'center' }}>
            No bookings yet
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Explore Mana Experiences and register for events, workshops and outings near you.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/experiences')}
            style={{ marginTop: 20, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 }}
          >
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>Explore Experiences</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {upcoming.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text, paddingHorizontal: 16, marginBottom: 10 }}>
                Upcoming ({upcoming.length})
              </Text>
              {upcoming.map(b => (
                <BookingCard
                  key={b.booking_id}
                  booking={b}
                  onViewPass={() => setSelectedBooking(b)}
                  onCancel={() => handleCancel(b)}
                  onRefund={() => setRefundBooking(b)}
                />
              ))}
            </View>
          )}

          {past.length > 0 && (
            <View>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text, paddingHorizontal: 16, marginBottom: 10 }}>
                Past Experiences ({past.length})
              </Text>
              {past.map(b => (
                <BookingCard
                  key={b.booking_id}
                  booking={b}
                  onViewPass={() => setSelectedBooking(b)}
                  onCancel={() => handleCancel(b)}
                  onRefund={() => setRefundBooking(b)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {selectedBooking && (
        <QRPassModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
      {refundBooking && (
        <RefundModal booking={refundBooking} onClose={() => setRefundBooking(null)} />
      )}
    </View>
  );
}
