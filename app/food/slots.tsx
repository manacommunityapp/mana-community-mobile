import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { foodOpsService, DeliverySlot, SlotStatus } from '@/services/foodOpsService';

const statusColor: Record<SlotStatus, { bg: string; text: string }> = {
  OPEN: { bg: '#D1FAE5', text: '#065F46' },
  FULL: { bg: '#FEE2E2', text: '#991B1B' },
  CUTOFF: { bg: '#FEF3C7', text: '#92400E' },
  CANCELLED: { bg: '#F3F4F6', text: '#6B7280' },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function SlotsScreen() {
  const router = useRouter();
  const [date] = useState(todayStr());
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState<number | null>(null);

  const communityId = 1;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setSlots(await foodOpsService.getAvailableSlots(communityId, date));
    } catch {
      Alert.alert('Error', 'Failed to load delivery slots');
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const book = async (slot: DeliverySlot) => {
    if (slot.status !== 'OPEN') return;
    Alert.alert('Confirm Booking', `Book slot ${slot.startTime}–${slot.endTime}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Book', onPress: async () => {
          setBooking(slot.id);
          try {
            await foodOpsService.bookSlot(slot.id);
            Alert.alert('Booked', 'Your slot has been confirmed');
            load();
          } catch {
            Alert.alert('Failed', 'Could not book this slot — it may be full');
          } finally {
            setBooking(null);
          }
        }
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Slots</Text>
        <Text style={styles.dateLabel}>{date}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {slots.length === 0 ? (
          <Text style={styles.empty}>No slots available for today</Text>
        ) : (
          slots.map(slot => {
            const sc = statusColor[slot.status];
            const pct = slot.capacity > 0 ? (slot.bookedCount / slot.capacity) : 0;
            return (
              <View key={slot.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View>
                    <Text style={styles.time}>{slot.startTime} – {slot.endTime}</Text>
                    <Text style={styles.vendor}>Vendor #{slot.vendorId}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{slot.status}</Text>
                  </View>
                </View>

                {/* capacity bar */}
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>{slot.bookedCount}/{slot.capacity} booked</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${Math.min(pct * 100, 100)}%` as `${number}%`, backgroundColor: pct >= 0.9 ? '#EF4444' : pct >= 0.6 ? '#F59E0B' : '#10B981' }]} />
                </View>

                <TouchableOpacity
                  onPress={() => book(slot)}
                  disabled={slot.status !== 'OPEN' || booking === slot.id}
                  style={[styles.bookBtn, slot.status !== 'OPEN' && styles.bookBtnDisabled]}
                >
                  <Text style={[styles.bookBtnText, slot.status !== 'OPEN' && styles.bookBtnTextDisabled]}>
                    {booking === slot.id ? 'Booking…' : 'Book Slot'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  dateLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  scroll: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', marginTop: 60, color: '#9CA3AF', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  time: { fontSize: 16, fontWeight: '600', color: '#111827' },
  vendor: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 12, color: '#6B7280' },
  barBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 12 },
  barFill: { height: 6, borderRadius: 3 },
  bookBtn: { backgroundColor: '#3B82F6', borderRadius: 10, padding: 12, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: '#E5E7EB' },
  bookBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  bookBtnTextDisabled: { color: '#9CA3AF' },
});
