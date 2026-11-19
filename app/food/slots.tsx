import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { foodOpsService, DeliverySlotDto } from '@/services/foodOpsService';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function dateLabel(d: Date): string {
  const today = new Date();
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#059669',
  FULL: '#DC2626',
  CUTOFF_PASSED: '#6B7280',
  CANCELLED: '#6B7280',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Available',
  FULL: 'Full',
  CUTOFF_PASSED: 'Cutoff passed',
  CANCELLED: 'Cancelled',
};

export default function DeliverySlotsScreen() {
  const today = new Date();
  const dates = [today, new Date(today.getTime() + 86400000), new Date(today.getTime() + 172800000)];
  const [selectedDate, setSelectedDate] = useState(today);
  const [slots, setSlots] = useState<DeliverySlotDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    // communityId and vendorId would come from route params in production
    foodOpsService.getDeliverySlots(0, 0, formatDate(selectedDate))
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [formatDate(selectedDate)]);

  const handleBook = (slot: DeliverySlotDto) => {
    if (slot.status !== 'OPEN') return;
    Alert.alert(
      'Book Delivery Slot',
      `Confirm slot: ${slot.slotStart} – ${slot.slotEnd} on ${slot.slotDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBooking(slot.id);
            try {
              await foodOpsService.bookSlot(slot.id);
              Alert.alert('Booked', 'Your delivery slot has been booked.');
              setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, bookedCount: s.bookedCount + 1, status: s.bookedCount + 1 >= s.capacity ? 'FULL' : s.status } : s));
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Failed to book slot.');
            } finally {
              setBooking(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Delivery Slots</Text>

      {/* Date selector */}
      <View style={styles.dateRow}>
        {dates.map(d => (
          <TouchableOpacity
            key={formatDate(d)}
            style={[styles.dateChip, formatDate(d) === formatDate(selectedDate) && styles.dateChipActive]}
            onPress={() => setSelectedDate(d)}
          >
            <Text style={[styles.dateChipText, formatDate(d) === formatDate(selectedDate) && styles.dateChipTextActive]}>
              {dateLabel(d)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563EB" />
      ) : slots.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No slots available for this date</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {slots.map(slot => {
            const fillPct = slot.capacity > 0 ? Math.min(1, slot.bookedCount / slot.capacity) : 0;
            const isBookable = slot.status === 'OPEN';
            return (
              <View key={slot.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.timeText}>{slot.slotStart} – {slot.slotEnd}</Text>
                  <View style={[styles.badge, { backgroundColor: STATUS_COLOR[slot.status] + '22' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLOR[slot.status] }]}>
                      {STATUS_LABEL[slot.status]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cutoff}>Cutoff: {slot.cutoffAt}</Text>
                {/* Availability bar */}
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${fillPct * 100}%`, backgroundColor: fillPct > 0.8 ? '#DC2626' : '#059669' }]} />
                </View>
                <Text style={styles.capText}>{slot.bookedCount}/{slot.capacity} booked</Text>
                <TouchableOpacity
                  style={[styles.bookBtn, !isBookable && styles.bookBtnDisabled]}
                  onPress={() => handleBook(slot)}
                  disabled={!isBookable || booking === slot.id}
                >
                  {booking === slot.id
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.bookBtnText}>Book this slot</Text>
                  }
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingTop: 16 },
  dateRow: { flexDirection: 'row', gap: 8, padding: 16 },
  dateChip: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' },
  dateChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  dateChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dateChipTextActive: { color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  timeText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cutoff: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  barBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: 6, borderRadius: 999 },
  capText: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  bookBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: '#9CA3AF' },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
