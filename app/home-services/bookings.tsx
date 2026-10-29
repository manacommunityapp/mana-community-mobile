import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Alert, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService, HomeServiceBookingDto } from '@/services/homeServicesService';
import { RateServiceModal } from '@/components/home-services/RateServiceModal';

const STATUS_CONFIG: Record<string, { emoji: string; color: string; bg: string; border: string; label: string }> = {
  CONFIRMED: { emoji: '📅', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', label: 'Confirmed' },
  IN_PROGRESS: { emoji: '🔄', color: '#0284C7', bg: '#E0F2FE', border: '#7DD3FC', label: 'In Progress' },
  COMPLETED: { emoji: '✅', color: '#059669', bg: '#DCFCE7', border: '#A7F3D0', label: 'Completed' },
  CANCELLED: { emoji: '❌', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', label: 'Cancelled' },
};

export default function BookingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [otpModalBooking, setOtpModalBooking] = useState<HomeServiceBookingDto | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [ratingBooking, setRatingBooking] = useState<HomeServiceBookingDto | null>(null);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['my-home-service-bookings'],
    queryFn: () => homeServicesService.getMyBookings(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => homeServicesService.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-home-service-bookings'] });
      Alert.alert('Success', 'Booking has been cancelled.');
    },
  });

  const completeOtpMutation = useMutation({
    mutationFn: ({ id, otp }: { id: string; otp: string }) => homeServicesService.completeBookingWithOtp(id, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-home-service-bookings'] });
      setOtpModalBooking(null);
      setEnteredOtp('');
      Alert.alert('Service Completed', 'The technician visit has been verified and completed.');
    },
    onError: (err: any) => Alert.alert('Verification Failed', err?.message || 'Invalid completion OTP.'),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => homeServicesService.payBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-home-service-bookings'] });
      Alert.alert('Payment Recorded', 'Service payment completed successfully.');
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>📋 Service Bookings</Text>
            <Text style={styles.headerSub}>Track visits, OTP & payments</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/home-services/find-help')}>
            <Text style={styles.addBtnText}>➕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={styles.statVal}>{bookings.filter(b => b.status === 'CONFIRMED').length}</Text>
            <Text style={styles.statLbl}>Upcoming</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🔄</Text>
            <Text style={styles.statVal}>{bookings.filter(b => b.status === 'IN_PROGRESS').length}</Text>
            <Text style={styles.statLbl}>Active</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statVal}>{bookings.filter(b => b.status === 'COMPLETED').length}</Text>
            <Text style={styles.statLbl}>Done</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        style={{ flex: 1 }}
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetch(); }} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const isCompleted = item.status === 'COMPLETED';
          const isCancelled = item.status === 'CANCELLED';
          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.CONFIRMED;

          return (
            <View style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{item.providerName}</Text>
                  <Text style={styles.category}>{item.category} • #{item.id.slice(0, 6)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <Text style={styles.statusEmoji}>{cfg.emoji}</Text>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailEmoji}>📅</Text>
                  <Text style={styles.detailText}>{item.date} ({item.timeSlot})</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailEmoji}>📝</Text>
                  <Text style={styles.detailText}>{item.issue}</Text>
                </View>
              </View>

              {item.completionOtp && !isCompleted && !isCancelled && (
                <View style={styles.otpRow}>
                  <View style={styles.otpBox}>
                    <Text style={styles.otpLabel}>🔑 OTP:</Text>
                    <Text style={styles.otpVal}>{item.completionOtp}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.verifyOtpBtn}
                    onPress={() => { setOtpModalBooking(item); setEnteredOtp(item.completionOtp || ''); }}
                  >
                    <Text style={styles.verifyOtpBtnText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!isCompleted && !isCancelled && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      Alert.alert('Cancel Booking', 'Are you sure you want to cancel this service visit?', [
                        { text: 'No' },
                        { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(item.id) }
                      ]);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>❌ Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isCompleted && item.paymentStatus !== 'PAID' && (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => payMutation.mutate(item.id)}
                >
                  <LinearGradient
                    colors={['#059669', '#10B981']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.payBtnGrad}
                  >
                    <Text style={styles.payBtnText}>💳 Pay Online / Mark Paid</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {isCompleted && (
                <TouchableOpacity
                  style={styles.rateBtn}
                  onPress={() => setRatingBooking(item)}
                >
                  <Text style={styles.rateBtnText}>
                    {item.rating ? `⭐ Rated ${item.rating}/5` : '⭐ Rate Service Experience'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>📋</Text>
            </View>
            <Text style={styles.emptyTitle}>No service bookings yet</Text>
            <Text style={styles.emptySub}>Book electricians, plumbers, or cleaners anytime</Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push('/home-services/find-help')}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyCtaGrad}
              >
                <Text style={styles.emptyCtaText}>🔍 Find Help Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={!!otpModalBooking} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalAccent} />
            <Text style={styles.modalTitle}>🔐 Complete Service Visit</Text>
            <Text style={styles.modalSub}>Enter the 4-digit code provided to the technician:</Text>
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={4}
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              placeholder="0000"
              placeholderTextColor="#94A3B8"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setOtpModalBooking(null)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={() => {
                  if (otpModalBooking) {
                    completeOtpMutation.mutate({ id: otpModalBooking.id, otp: enteredOtp });
                  }
                }}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalSubmitGrad}
                >
                  <Text style={styles.modalSubmitText}>✅ Verify & Finish</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {ratingBooking && (
        <RateServiceModal
          visible={!!ratingBooking}
          bookingId={ratingBooking.id}
          providerName={ratingBooking.providerName}
          category={ratingBooking.category}
          onClose={() => setRatingBooking(null)}
          onSuccess={() => refetch()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.displayEB, color: '#FFFFFF' },
  headerSub: { fontSize: 11, fontFamily: FONTS.regular, color: '#C7D2FE', marginTop: 2 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { fontSize: 16 },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statEmoji: { fontSize: 16, marginBottom: 2 },
  statVal: { fontSize: 18, fontFamily: FONTS.displayEB, color: '#FFFFFF' },
  statLbl: { fontSize: 10, fontFamily: FONTS.medium, color: '#C7D2FE' },
  statDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  providerName: { fontSize: 15, fontFamily: FONTS.displayBold, color: '#0F172A' },
  category: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusEmoji: { fontSize: 12, marginRight: 4 },
  statusText: { fontSize: 11, fontFamily: FONTS.bold },

  detailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailEmoji: { fontSize: 13, marginRight: 6 },
  detailText: { fontSize: 12, fontFamily: FONTS.medium, color: '#334155', flex: 1 },

  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  otpBox: { flexDirection: 'row', alignItems: 'center' },
  otpLabel: { fontSize: 12, fontFamily: FONTS.semiBold, color: '#4F46E5', marginRight: 6 },
  otpVal: { fontSize: 16, fontFamily: FONTS.displayEB, color: '#312E81', letterSpacing: 3 },
  verifyOtpBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  verifyOtpBtnText: { color: '#FFFFFF', fontSize: 12, fontFamily: FONTS.bold },

  cardActions: { flexDirection: 'row', marginTop: 12 },
  cancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelBtnText: { color: '#DC2626', fontSize: 12, fontFamily: FONTS.semiBold },

  payBtn: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  payBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold },

  rateBtn: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  rateBtnText: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#1E293B' },

  emptyBox: { paddingVertical: 60, alignItems: 'center' },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: '#0F172A' },
  emptySub: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 4, textAlign: 'center' },
  emptyCta: { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  emptyCtaGrad: { paddingHorizontal: 24, paddingVertical: 10 },
  emptyCtaText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: 17, fontFamily: FONTS.displayEB, color: '#0F172A', marginTop: 4 },
  modalSub: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  otpInput: {
    width: '80%',
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 12,
    fontSize: 24,
    fontFamily: FONTS.displayEB,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#0F172A',
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
  },
  modalButtons: { flexDirection: 'row', width: '100%' },
  modalCancel: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: { fontFamily: FONTS.semiBold, color: '#64748B', fontSize: 13 },
  modalSubmit: { flex: 1.5, borderRadius: 12, overflow: 'hidden' },
  modalSubmitGrad: { paddingVertical: 11, alignItems: 'center' },
  modalSubmitText: { fontFamily: FONTS.bold, color: '#FFFFFF', fontSize: 13 },
});
