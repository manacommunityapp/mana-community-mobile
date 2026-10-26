import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { COLORS, FONTS, SHADOWS } from '@/constants/config';
import { vehicleCareService, VehicleCareBooking, BookingStatus } from '@/services/vehicleCareService';

type FilterTab = 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

const UPCOMING_STATUSES: BookingStatus[] = ['CONFIRMED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'PENDING_PAYMENT'];
const COMPLETED_STATUSES: BookingStatus[] = ['COMPLETED', 'REFUNDED'];
const CANCELLED_STATUSES: BookingStatus[] = ['CANCELLED', 'PAYMENT_FAILED', 'NO_SHOW', 'REFUND_PENDING', 'DISPUTED'];

const STATUS_CONFIG: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  DRAFT:           { emoji: '📝', color: '#64748B', bg: '#F1F5F9', label: 'Draft' },
  PENDING_PAYMENT: { emoji: '💳', color: '#D97706', bg: '#FEF3C7', label: 'Pending Payment' },
  CONFIRMED:       { emoji: '📅', color: '#2563EB', bg: '#DBEAFE', label: 'Confirmed' },
  ASSIGNED:        { emoji: '👷', color: '#7C3AED', bg: '#EDE9FE', label: 'Assigned' },
  EN_ROUTE:        { emoji: '🚗', color: '#0284C7', bg: '#E0F2FE', label: 'En Route' },
  ARRIVED:         { emoji: '📍', color: '#0891B2', bg: '#CFFAFE', label: 'Arrived' },
  IN_PROGRESS:     { emoji: '🔄', color: '#4F46E5', bg: '#EEF2FF', label: 'In Progress' },
  COMPLETED:       { emoji: '✅', color: '#059669', bg: '#DCFCE7', label: 'Completed' },
  CANCELLED:       { emoji: '❌', color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled' },
  PAYMENT_FAILED:  { emoji: '🚫', color: '#DC2626', bg: '#FEE2E2', label: 'Payment Failed' },
  NO_SHOW:         { emoji: '👻', color: '#6B7280', bg: '#F3F4F6', label: 'No Show' },
  DISPUTED:        { emoji: '⚠️', color: '#D97706', bg: '#FEF3C7', label: 'Disputed' },
  REFUND_PENDING:  { emoji: '⏳', color: '#D97706', bg: '#FEF3C7', label: 'Refund Pending' },
  REFUNDED:        { emoji: '💸', color: '#059669', bg: '#DCFCE7', label: 'Refunded' },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { emoji: '❓', color: '#64748B', bg: '#F1F5F9', label: status };
  return (
    <View style={[sb.badge, { backgroundColor: cfg.bg }]}>
      <Text style={{ fontSize: 12 }}>{cfg.emoji}</Text>
      <Text style={[sb.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  label: { fontFamily: FONTS.semiBold, fontSize: 11 },
});

export default function MyBookingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('UPCOMING');
  const [ratingModal, setRatingModal] = useState<VehicleCareBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['vc-my-bookings'],
    queryFn: vehicleCareService.getMyBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => vehicleCareService.cancelBooking(id, 'User cancelled'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vc-my-bookings'] });
      Alert.alert('Cancelled', 'Your booking has been cancelled.');
    },
    onError: () => Alert.alert('Error', 'Could not cancel booking. Please try again.'),
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, r, rv }: { id: string; r: number; rv: string }) =>
      vehicleCareService.rateBooking(id, r, rv),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vc-my-bookings'] });
      setRatingModal(null);
      Alert.alert('Thank you!', 'Your feedback helps us improve our service.');
    },
  });

  function filtered(): VehicleCareBooking[] {
    if (tab === 'ALL') return bookings;
    if (tab === 'UPCOMING') return bookings.filter(b => UPCOMING_STATUSES.includes(b.status));
    if (tab === 'COMPLETED') return bookings.filter(b => COMPLETED_STATUSES.includes(b.status));
    if (tab === 'CANCELLED') return bookings.filter(b => CANCELLED_STATUSES.includes(b.status));
    return bookings;
  }

  function confirmCancel(b: VehicleCareBooking) {
    Alert.alert('Cancel Booking', `Cancel ${b.serviceName} on ${b.date}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: () => cancelMutation.mutate(b.id) },
    ]);
  }

  function openRating(b: VehicleCareBooking) {
    setRatingModal(b);
    setRating(5);
    setReviewText('');
  }

  const list = filtered();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity onPress={() => router.push('/vehicle-care/book')} style={styles.newBtn}>
          <Ionicons name="add" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {(['UPCOMING', 'COMPLETED', 'CANCELLED', 'ALL'] as FilterTab[]).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'ALL' ? 'All' : t === 'UPCOMING' ? 'Upcoming' : t === 'COMPLETED' ? 'Completed' : 'Cancelled'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
      >
        {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />}
        {!isLoading && list.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🗂️</Text>
            <Text style={styles.emptyTitle}>No {tab.toLowerCase()} bookings</Text>
            <TouchableOpacity onPress={() => router.push('/vehicle-care/book')} style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Book a Wash</Text>
            </TouchableOpacity>
          </View>
        )}
        {list.map(booking => {
          const cfg = STATUS_CONFIG[booking.status] ?? { emoji: '❓', color: '#64748B', bg: '#F1F5F9', label: booking.status };
          return (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingTop}>
                <Text style={styles.bookingEmoji}>{booking.serviceEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingService}>{booking.serviceName}</Text>
                  <Text style={styles.bookingNumber}>#{booking.bookingNumber}</Text>
                </View>
                <StatusBadge status={booking.status} />
              </View>

              <View style={styles.bookingMeta}>
                <MetaRow icon="car-outline" text={booking.vehicleDisplay} />
                <MetaRow icon="calendar-outline" text={`${booking.date} at ${booking.startTime}`} />
                <MetaRow icon="location-outline" text={booking.location} />
                {booking.addonNames.length > 0 && (
                  <MetaRow icon="add-circle-outline" text={`Add-ons: ${booking.addonNames.join(', ')}`} />
                )}
                {booking.technicianName && (
                  <MetaRow icon="person-outline" text={`Technician: ${booking.technicianName}`} />
                )}
                <MetaRow icon="cash-outline" text={`₹${booking.paidAmount}`} />
              </View>

              {/* Active status bar */}
              {UPCOMING_STATUSES.includes(booking.status) && booking.status !== 'PENDING_PAYMENT' && (
                <LinearGradient colors={[cfg.bg, '#fff']} style={styles.statusBar}>
                  <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                  <Text style={[styles.statusBarText, { color: cfg.color }]}>{cfg.label}</Text>
                  {booking.eta && <Text style={styles.etaText}>ETA: {booking.eta}</Text>}
                </LinearGradient>
              )}

              {/* Actions */}
              <View style={styles.bookingActions}>
                {booking.canCancel && (
                  <TouchableOpacity onPress={() => confirmCancel(booking)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                {booking.canRate && !booking.rating && (
                  <TouchableOpacity onPress={() => openRating(booking)} style={styles.rateBtn}>
                    <Ionicons name="star-outline" size={14} color="#D97706" />
                    <Text style={styles.rateBtnText}>Rate Service</Text>
                  </TouchableOpacity>
                )}
                {booking.rating && (
                  <View style={styles.ratingDisplay}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name={i < booking.rating! ? 'star' : 'star-outline'} size={14} color="#F59E0B" />
                    ))}
                    {booking.reviewText && <Text style={styles.reviewText}> "{booking.reviewText}"</Text>}
                  </View>
                )}
                <TouchableOpacity onPress={() => router.push('/vehicle-care/book')} style={styles.rebookBtn}>
                  <Ionicons name="refresh-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.rebookBtnText}>Rebook</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={!!ratingModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRatingModal(null)}>
        {ratingModal && (
          <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setRatingModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Rate Service</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.ratingServiceName}>{ratingModal.serviceName}</Text>
              <Text style={styles.ratingDate}>{ratingModal.date} • {ratingModal.vehicleDisplay.split('•')[0].trim()}</Text>
              <View style={styles.starsRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => setRating(i + 1)}>
                    <Ionicons name={i < rating ? 'star' : 'star-outline'} size={40} color="#F59E0B" />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Share your experience (optional)…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                onPress={() => rateMutation.mutate({ id: ratingModal.id, r: rating, rv: reviewText })}
                disabled={rateMutation.isPending}
                style={styles.submitRatingBtn}
              >
                {rateMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitRatingText}>Submit Rating</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color="#94A3B8" />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  newBtn: { padding: 6 },
  tabsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: '#fff' },
  tab: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#64748B' },
  tabTextActive: { color: '#fff' },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  bookBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  bookBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },

  bookingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, ...SHADOWS.card },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  bookingEmoji: { fontSize: 28 },
  bookingService: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  bookingNumber: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', marginTop: 2 },
  bookingMeta: { gap: 6, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: FONTS.regular, fontSize: 12, color: '#475569', flex: 1 },

  statusBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, gap: 8, marginBottom: 10 },
  statusBarText: { fontFamily: FONTS.semiBold, fontSize: 13, flex: 1 },
  etaText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#64748B' },

  bookingActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cancelBtn: { borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#DC2626' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  rateBtnText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#92400E' },
  ratingDisplay: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, flexWrap: 'wrap' },
  reviewText: { fontFamily: FONTS.regular, fontSize: 11, color: '#64748B', fontStyle: 'italic' },
  rebookBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 'auto' },
  rebookBtnText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary },

  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  modalContent: { padding: 24, gap: 16 },
  ratingServiceName: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  ratingDate: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B', marginTop: -8 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  reviewInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text, minHeight: 80, textAlignVertical: 'top' },
  submitRatingBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitRatingText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
});
