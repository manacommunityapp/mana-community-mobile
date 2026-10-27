import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { jewelleryService, JewelleryAppointment, CreateAppointmentRequest } from '@/services/jewelleryService';

const PURPOSES = [
  { key: 'BROWSE',     label: 'Browse Collection',   icon: 'search-outline' },
  { key: 'CUSTOM',     label: 'Custom Order',        icon: 'create-outline' },
  { key: 'BRIDAL',     label: 'Bridal Consultation', icon: 'heart-outline' },
  { key: 'REPAIR',     label: 'Repair / Polish',     icon: 'build-outline' },
  { key: 'VALUATION',  label: 'Gold Valuation',      icon: 'scale-outline' },
];

const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
];

const STATUS_COLORS: Record<string, string> = {
  PENDING:   '#F59E0B',
  CONFIRMED: '#10B981',
  COMPLETED: '#4F46E5',
  CANCELLED: '#EF4444',
};

export default function JewelleryAppointmentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { vendorId: preselectedVendorId } = useLocalSearchParams<{ vendorId?: string }>();

  const [showBooking, setShowBooking] = useState(!!preselectedVendorId);
  const [selectedVendorId, setSelectedVendorId] = useState(preselectedVendorId ?? '');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('BROWSE');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['jewellery-appointments'],
    queryFn: jewelleryService.getMyAppointments,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['jewellery-vendors'],
    queryFn: jewelleryService.getNearbyVendors,
  });

  const bookMutation = useMutation({
    mutationFn: (req: CreateAppointmentRequest) => jewelleryService.bookAppointment(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-appointments'] });
      setShowBooking(false);
      Alert.alert('Appointment Booked!', 'The jeweller will confirm your slot within 2 hours.');
    },
    onError: (err: any) => Alert.alert('Booking Failed', err?.message || 'Please try again.'),
  });

  const cancelMutation = useMutation({
    mutationFn: jewelleryService.cancelAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-appointments'] });
    },
    onError: () => Alert.alert('Error', 'Failed to cancel appointment.'),
  });

  const handleBook = () => {
    if (!selectedVendorId || !selectedDate || !selectedTime) {
      Alert.alert('Incomplete Details', 'Please select a jeweller, date and time slot.');
      return;
    }
    bookMutation.mutate({
      vendorId: selectedVendorId,
      date: selectedDate,
      time: selectedTime,
      purpose: selectedPurpose,
      notes: notes.trim() || undefined,
    });
  };

  const upcoming = appointments.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status));
  const past     = appointments.filter((a) => ['COMPLETED', 'CANCELLED'].includes(a.status));
  const displayed = activeTab === 'UPCOMING' ? upcoming : past;

  return (
    <View style={styles.root}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(['UPCOMING', 'PAST'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.bookBtn} onPress={() => setShowBooking(true)}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>

      {/* Appointments list */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetch(); }} colors={[COLORS.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : displayed.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={48} color="#C7D2FE" />
            <Text style={styles.emptyTitle}>No {activeTab === 'UPCOMING' ? 'Upcoming' : 'Past'} Appointments</Text>
            {activeTab === 'UPCOMING' && (
              <TouchableOpacity style={styles.bookEmptyBtn} onPress={() => setShowBooking(true)}>
                <Text style={styles.bookEmptyBtnText}>Book an Appointment</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayed.map((appt: JewelleryAppointment) => (
            <View key={appt.id} style={styles.apptCard}>
              <View style={styles.apptTop}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[appt.status] ?? '#94A3B8' }]} />
                <Text style={[styles.statusText, { color: STATUS_COLORS[appt.status] ?? '#94A3B8' }]}>{appt.status}</Text>
                <Text style={styles.apptDate}>{appt.date} • {appt.time}</Text>
              </View>
              <Text style={styles.apptVendor}>{appt.vendorName}</Text>
              <Text style={styles.apptAddress} numberOfLines={1}>{appt.shopAddress}</Text>
              <View style={styles.apptPurposeChip}>
                <Text style={styles.apptPurposeText}>
                  {PURPOSES.find((p) => p.key === appt.purpose)?.label ?? appt.purpose}
                </Text>
              </View>
              {appt.notes && <Text style={styles.apptNotes}>{appt.notes}</Text>}
              {appt.status === 'PENDING' || appt.status === 'CONFIRMED' ? (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() =>
                    Alert.alert('Cancel Appointment?', 'Are you sure?', [
                      { text: 'Keep', style: 'cancel' },
                      { text: 'Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(appt.id) },
                    ])
                  }
                >
                  <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={showBooking} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book Appointment</Text>
            <TouchableOpacity onPress={() => setShowBooking(false)}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Jeweller picker */}
            <Text style={styles.fieldLabel}>Select Jeweller</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {vendors.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSelectedVendorId(v.id)}
                  style={[styles.vendorOption, selectedVendorId === v.id && styles.vendorOptionActive]}
                >
                  <Text style={[styles.vendorOptionText, selectedVendorId === v.id && { color: '#FFFFFF' }]}>{v.shopName}</Text>
                  {v.rating && (
                    <View style={styles.vendorRating}>
                      <Ionicons name="star" size={9} color={selectedVendorId === v.id ? '#FCD34D' : '#F59E0B'} />
                      <Text style={[styles.vendorRatingText, selectedVendorId === v.id && { color: '#FCD34D' }]}>{v.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date */}
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              placeholder="YYYY-MM-DD (e.g. 2026-11-10)"
              value={selectedDate}
              onChangeText={setSelectedDate}
              style={styles.dateInput}
              placeholderTextColor="#94A3B8"
              keyboardType="numbers-and-punctuation"
            />

            {/* Time Slots */}
            <Text style={styles.fieldLabel}>Time Slot</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedTime(slot)}
                  style={[styles.timeSlot, selectedTime === slot && styles.timeSlotActive]}
                >
                  <Text style={[styles.timeSlotText, selectedTime === slot && { color: '#FFFFFF', fontWeight: '700' }]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Purpose */}
            <Text style={styles.fieldLabel}>Purpose of Visit</Text>
            <View style={styles.purposeGrid}>
              {PURPOSES.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setSelectedPurpose(p.key)}
                  style={[styles.purposeChip, selectedPurpose === p.key && styles.purposeChipActive]}
                >
                  <Ionicons name={p.icon as any} size={14} color={selectedPurpose === p.key ? '#FFFFFF' : COLORS.primary} />
                  <Text style={[styles.purposeChipText, selectedPurpose === p.key && { color: '#FFFFFF' }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Additional Notes (Optional)</Text>
            <TextInput
              placeholder="E.g. Looking for a necklace under ₹50,000..."
              value={notes}
              onChangeText={setNotes}
              style={styles.notesInput}
              multiline
              numberOfLines={3}
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleBook}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Confirm Appointment</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF8F0' },
  tabs: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0', gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  bookBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#B45309', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md },
  bookBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  list: { padding: SPACING.md },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  bookEmptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md },
  bookEmptyBtnText: { color: '#FFFFFF', fontWeight: '700' },
  apptCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  apptTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  apptDate: { fontSize: 11, color: '#64748B', marginLeft: 'auto' },
  apptVendor: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  apptAddress: { fontSize: 11, color: '#64748B', marginBottom: 8 },
  apptPurposeChip: { alignSelf: 'flex-start', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  apptPurposeText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  apptNotes: { fontSize: 11, color: '#64748B', marginTop: 6 },
  cancelBtn: { marginTop: 10, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#FECACA', alignItems: 'center' },
  cancelBtnText: { fontSize: 12, color: '#DC2626', fontWeight: '700' },
  // Modal styles
  modalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalContent: { padding: SPACING.md, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6, marginTop: 16 },
  vendorOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', minWidth: 120 },
  vendorOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  vendorOptionText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  vendorRating: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  vendorRatingText: { fontSize: 10, color: '#64748B' },
  dateInput: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 13, color: '#0F172A' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  timeSlotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeSlotText: { fontSize: 12, color: '#334155' },
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  purposeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primaryMid, backgroundColor: COLORS.primaryLight },
  purposeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  purposeChipText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  notesInput: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 13, color: '#0F172A', textAlignVertical: 'top', minHeight: 80 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#B45309', paddingVertical: 14, borderRadius: RADIUS.md, marginTop: 20 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
