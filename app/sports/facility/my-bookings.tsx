import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { facilityService, FacilityBookingDto } from '@/services/facilityService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  CONFIRMED:  { bg: '#ECFDF5', color: '#065F46' },
  PENDING:    { bg: '#FFFBEB', color: '#78350F' },
  CANCELLED:  { bg: '#FEF2F2', color: '#991B1B' },
  COMPLETED:  { bg: '#EEF2FF', color: '#3730A3' },
  NO_SHOW:    { bg: '#F3F4F6', color: '#6B7280' },
  WAITLISTED: { bg: '#FFF7ED', color: '#C2410C' },
};

const TABS = ['Upcoming', 'Past'] as const;

export default function MyFacilityBookingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const { data: allBookings = [], isLoading, refetch } = useQuery({
    queryKey: ['facility-my-bookings'],
    queryFn: facilityService.getMyBookings,
    staleTime: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      facilityService.cancelBooking(id, reason),
    onSuccess: () => {
      setCancelling(null);
      qc.invalidateQueries({ queryKey: ['facility-my-bookings'] });
    },
    onError: () => {
      setCancelling(null);
      Alert.alert('Error', 'Could not cancel booking. Please try again.');
    },
  });

  const now = new Date();
  const bookings = allBookings.filter((b: FacilityBookingDto) => {
    const bookingDate = new Date(`${b.date}T${b.endTime || '23:59'}`);
    const isPast = bookingDate < now || ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(b.status);
    return tab === 'Past' ? isPast : !isPast;
  });

  const handleCancel = (booking: FacilityBookingDto) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel ${booking.facilityName} on ${booking.date} at ${booking.startTime}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => {
            setCancelling(booking.id);
            cancelMutation.mutate({ id: booking.id, reason: 'Cancelled by resident' });
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: FacilityBookingDto }) => {
    const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.CONFIRMED;
    const isCancelling = cancelling === item.id;
    const canCancel = item.status === 'CONFIRMED' || item.status === 'PENDING';

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.facilityName}>{item.facilityName}</Text>
          <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[s.statusText, { color: st.color }]}>{item.status}</Text>
          </View>
        </View>

        <View style={s.row}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.meta}>{item.date}</Text>
          <Text style={s.metaDot}>·</Text>
          <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.meta}>{item.startTime} – {item.endTime}</Text>
        </View>

        {item.bookingRef && (
          <Text style={s.ref}>Ref: {item.bookingRef}</Text>
        )}

        {item.totalAmount != null && item.totalAmount > 0 && (
          <View style={s.row}>
            <Ionicons name="cash-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.meta}>₹{item.totalAmount}</Text>
            {item.refundAmount != null && item.refundAmount > 0 && (
              <Text style={[s.meta, { color: COLORS.success }]}> · Refund: ₹{item.refundAmount}</Text>
            )}
          </View>
        )}

        {canCancel && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => handleCancel(item)}
            disabled={isCancelling}
          >
            {isCancelling
              ? <ActivityIndicator size="small" color={COLORS.error} />
              : <Text style={s.cancelBtnText}>Cancel Booking</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Facility Bookings</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : bookings.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="calendar-outline" size={36} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No {tab.toLowerCase()} bookings</Text>
          <Text style={s.emptySub}>
            {tab === 'Upcoming'
              ? 'Book a court or facility from the Sports Hub.'
              : 'Your completed and cancelled bookings will appear here.'}
          </Text>
          {tab === 'Upcoming' && (
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push('/sports' as any)}
            >
              <Text style={s.emptyBtnText}>Browse Facilities</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={b => b.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onRefresh={refetch}
          refreshing={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 12, gap: 10, backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },

  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },

  list: { padding: 14, gap: 12 },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 14, gap: 6, ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  facilityName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 10, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: COLORS.textMuted },
  metaDot: { fontSize: 12, color: COLORS.textMuted },
  ref: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },

  cancelBtn: {
    marginTop: 6, paddingVertical: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.error, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.error },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
