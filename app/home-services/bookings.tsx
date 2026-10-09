import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Alert, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS } from '@/constants/config';
import { homeServicesService, HomeServiceBookingDto } from '@/services/homeServicesService';

export default function BookingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [otpModalBooking, setOtpModalBooking] = useState<HomeServiceBookingDto | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Service Bookings</Text>
        <TouchableOpacity style={styles.newBookingBtn} onPress={() => router.push('/home-services/find-help')}>
          <Ionicons name="add" size={18} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const isCompleted = item.status === 'COMPLETED';
          const isCancelled = item.status === 'CANCELLED';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{item.providerName}</Text>
                  <Text style={styles.category}>{item.category} • #{item.id}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  isCompleted ? styles.completedBadge : isCancelled ? styles.cancelledBadge : styles.pendingBadge
                ]}>
                  <Text style={[
                    styles.statusText,
                    isCompleted ? styles.completedText : isCancelled ? styles.cancelledText : styles.pendingText
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={styles.detailText}>{item.date} ({item.timeSlot})</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={14} color="#64748B" />
                  <Text style={styles.detailText}>{item.issue}</Text>
                </View>
              </View>

              {item.completionOtp && !isCompleted && !isCancelled && (
                <View style={styles.otpRow}>
                  <View style={styles.otpBox}>
                    <Text style={styles.otpLabel}>Technician Share OTP:</Text>
                    <Text style={styles.otpVal}>{item.completionOtp}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.verifyOtpBtn}
                    onPress={() => { setOtpModalBooking(item); setEnteredOtp(item.completionOtp || ''); }}
                  >
                    <Text style={styles.verifyOtpBtnText}>Verify OTP</Text>
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
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isCompleted && item.paymentStatus !== 'PAID' && (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => payMutation.mutate(item.id)}
                >
                  <Ionicons name="card" size={14} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Pay Online / Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No service bookings yet</Text>
            <Text style={styles.emptySub}>Book electricians, plumbers, or cleaners anytime</Text>
          </View>
        }
      />

      <Modal visible={!!otpModalBooking} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Service Visit</Text>
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
                <Text style={styles.modalSubmitText}>Verify & Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  newBookingBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  providerName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  category: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  pendingText: { color: '#D97706', fontSize: 11, fontWeight: '700' },
  completedBadge: { backgroundColor: '#DCFCE7' },
  completedText: { color: '#059669', fontSize: 11, fontWeight: '700' },
  cancelledBadge: { backgroundColor: '#FEE2E2' },
  cancelledText: { color: '#DC2626', fontSize: 11, fontWeight: '700' },
  detailsBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginTop: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailText: { fontSize: 12, color: '#334155', marginLeft: 6, flex: 1 },
  otpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, backgroundColor: '#EEF2FF', padding: 8, borderRadius: 8 },
  otpBox: { flexDirection: 'row', alignItems: 'center' },
  otpLabel: { fontSize: 11, color: '#4F46E5', marginRight: 6 },
  otpVal: { fontSize: 14, fontWeight: '800', color: '#312E81', letterSpacing: 2 },
  verifyOtpBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  verifyOtpBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', marginTop: 12 },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FEE2E2' },
  cancelBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', marginTop: 10, paddingVertical: 9, borderRadius: 10 },
  payBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 320, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  otpInput: { width: '80%', borderWidth: 2, borderColor: '#4F46E5', borderRadius: 12, paddingVertical: 10, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: 8, color: '#0F172A', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', width: '100%' },
  modalCancel: { flex: 1, paddingVertical: 10, alignItems: 'center', marginRight: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  modalCancelText: { color: '#64748B', fontWeight: '600' },
  modalSubmit: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#4F46E5' },
  modalSubmitText: { color: '#FFFFFF', fontWeight: '700' },
});
