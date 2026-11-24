import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bazaarService, BazaarBooking, BookingStatus, PaymentStatus } from '@/services/bazaarService';
import { FONTS, RADIUS, SHADOWS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';

const ACCENT        = '#F97316';
const ACCENT_LIGHT  = '#FFF7ED';
const ACCENT_BORDER = '#FED7AA';

const BOOKING_STATUS: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#92400E', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Confirmed', color: '#15803D', bg: '#F0FDF4' },
  CANCELLED: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
  COMPLETED: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6' },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; icon: string; color: string }> = {
  PENDING:  { label: 'Payment Pending', icon: 'time-outline',     color: '#D97706' },
  PAID:     { label: 'Paid',            icon: 'checkmark-circle', color: '#15803D' },
  REFUNDED: { label: 'Refunded',        icon: 'refresh-circle',   color: '#1D4ED8' },
};

function BookingCard({
  booking,
  onCancel,
  cancelling,
}: {
  booking: BazaarBooking;
  onCancel: (b: BazaarBooking) => void;
  cancelling: boolean;
}) {
  const status  = BOOKING_STATUS[booking.status];
  const payment = PAYMENT_STATUS[booking.paymentStatus];

  const canCancel =
    (booking.status === 'PENDING' || booking.status === 'CONFIRMED') &&
    new Date(booking.bazaarDate) > new Date();

  const displayDate = (() => {
    try {
      return new Date(booking.bazaarDate).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return booking.bazaarDate; }
  })();

  const bookedOn = (() => {
    try {
      return new Date(booking.bookingDate).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return booking.bookingDate; }
  })();

  return (
    <View style={s.card}>
      {/* Card header */}
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={2}>{booking.bazaarTitle}</Text>
          <Text style={s.cardDate}>{displayDate}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Stall info row */}
      <View style={s.stallRow}>
        <View style={s.stallTag}>
          <Ionicons name="storefront-outline" size={14} color={ACCENT} />
          <Text style={s.stallTagText}>Stall {booking.stallNumber}</Text>
        </View>
        <View style={s.stallTag}>
          <Ionicons name="resize-outline" size={14} color={ACCENT} />
          <Text style={s.stallTagText}>{booking.size}</Text>
        </View>
        {booking.stallCategory ? (
          <View style={s.stallTag}>
            <Ionicons name="pricetag-outline" size={14} color={ACCENT} />
            <Text style={s.stallTagText} numberOfLines={1}>{booking.stallCategory}</Text>
          </View>
        ) : null}
      </View>

      {/* Payment row */}
      <View style={s.payRow}>
        <Ionicons name={payment.icon as any} size={14} color={payment.color} />
        <Text style={[s.payLabel, { color: payment.color }]}>{payment.label}</Text>
        <Text style={s.priceText}>₹{booking.price.toLocaleString('en-IN')}</Text>
      </View>

      {/* Footer */}
      <View style={s.cardFooter}>
        <Text style={s.bookedOn}>Booked on {bookedOn}</Text>
        {canCancel && (
          <TouchableOpacity
            style={[s.cancelBtn, cancelling && { opacity: 0.5 }]}
            onPress={() => onCancel(booking)}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={s.cancelBtnText}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

type Section = { title: string; data: BazaarBooking[] };

export default function MyBookingsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: bookings = [], refetch, isLoading } = useQuery({
    queryKey: ['bazaar-my-bookings'],
    queryFn: () => bazaarService.getMyBookings(),
    staleTime: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => bazaarService.cancelBooking(bookingId),
    onMutate: (id) => setCancellingId(id),
    onSettled: () => setCancellingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bazaar-my-bookings'] });
      qc.invalidateQueries({ queryKey: ['bazaar-events'] });
      Alert.alert('Booking Cancelled', 'Your stall booking has been cancelled. A refund will be processed if applicable.');
    },
    onError: (err: any) => {
      Alert.alert('Cancel Failed', err?.message || 'Could not cancel booking. Please try again.');
    },
  });

  const handleCancel = (booking: BazaarBooking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel stall ${booking.stallNumber} at ${booking.bazaarTitle}?`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(booking.id),
        },
      ],
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const sections: Section[] = (() => {
    const now = new Date();
    const upcoming = bookings.filter(
      b => new Date(b.bazaarDate) >= now && b.status !== 'CANCELLED',
    );
    const past = bookings.filter(
      b => new Date(b.bazaarDate) < now || b.status === 'CANCELLED',
    );
    const result: Section[] = [];
    if (upcoming.length) result.push({ title: 'Upcoming', data: upcoming });
    if (past.length)     result.push({ title: 'Past & Cancelled', data: past });
    return result;
  })();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>My Bookings</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={ACCENT} size="large" /></View>
      ) : sections.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🏪</Text>
          <Text style={s.emptyTitle}>No bookings yet</Text>
          <Text style={s.emptyText}>
            Browse upcoming bazaars and book a stall to get started!
          </Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.back()}>
            <Text style={s.browseBtnText}>Browse Bazaars</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={b => b.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <View style={s.sectionCount}>
                <Text style={s.sectionCountText}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onCancel={handleCancel}
              cancelling={cancellingId === item.id}
            />
          )}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: THEME.background },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: THEME.border },
  backBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg, backgroundColor: THEME.surfaceMuted },
  topBarTitle:     { flex: 1, fontFamily: FONTS.displayBold, fontSize: 17, color: THEME.text, textAlign: 'center' },
  listContent:     { padding: SPACING.lg, gap: 6, paddingBottom: 40 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: SPACING.sm, marginTop: SPACING.sm },
  sectionTitle:    { fontFamily: FONTS.displayBold, fontSize: 14, color: THEME.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount:    { backgroundColor: ACCENT_LIGHT, borderRadius: RADIUS.xl, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: ACCENT_BORDER },
  sectionCountText:{ fontFamily: FONTS.displayBold, fontSize: 12, color: ACCENT },
  card:            { backgroundColor: '#fff', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: THEME.border, marginBottom: SPACING.md, overflow: 'hidden', ...SHADOWS.sm },
  cardHeader:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: SPACING.lg, paddingBottom: SPACING.sm, backgroundColor: ACCENT_LIGHT, borderBottomWidth: 1, borderBottomColor: ACCENT_BORDER },
  cardTitle:       { fontFamily: FONTS.displayBold, fontSize: 14, color: THEME.text, lineHeight: 20, marginBottom: 3 },
  cardDate:        { fontFamily: FONTS.displayReg, fontSize: 12, color: THEME.muted },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.xl, alignSelf: 'flex-start', flexShrink: 0 },
  statusText:      { fontFamily: FONTS.displaySemi, fontSize: 11 },
  stallRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: THEME.border },
  stallTag:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT_LIGHT, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.md, borderWidth: 1, borderColor: ACCENT_BORDER, maxWidth: 150 },
  stallTagText:    { fontFamily: FONTS.displaySemi, fontSize: 12, color: ACCENT },
  payRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: THEME.border },
  payLabel:        { fontFamily: FONTS.displaySemi, fontSize: 13, flex: 1 },
  priceText:       { fontFamily: FONTS.displayBold, fontSize: 15, color: THEME.text },
  cardFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  bookedOn:        { fontFamily: FONTS.displayReg, fontSize: 12, color: THEME.muted },
  cancelBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  cancelBtnText:   { fontFamily: FONTS.displaySemi, fontSize: 12, color: '#DC2626' },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  emptyEmoji:      { fontSize: 56, marginBottom: 16 },
  emptyTitle:      { fontFamily: FONTS.displayBold, fontSize: 20, color: THEME.text, marginBottom: 8 },
  emptyText:       { fontFamily: FONTS.displayReg, fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  browseBtn:       { backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.xl },
  browseBtnText:   { fontFamily: FONTS.displayBold, fontSize: 14, color: '#fff' },
});
