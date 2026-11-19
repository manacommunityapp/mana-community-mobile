import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { homeServicesService, HsBooking } from '../../services/homeServicesService';

const STATUS_COLORS: Record<string, [string, string]> = {
  PENDING: ['#fefce8', '#ca8a04'],
  ASSIGNED: ['#eff6ff', '#2563eb'],
  WORKER_EN_ROUTE: ['#f0fdf4', '#16a34a'],
  IN_PROGRESS: ['#eff6ff', '#2563eb'],
  WORK_DONE: ['#dcfce7', '#16a34a'],
  COMPLETED: ['#dcfce7', '#16a34a'],
  CANCELLED: ['#f1f5f9', '#94a3b8'],
};

export default function Bookings() {
  const [bookings, setBookings] = useState<HsBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    homeServicesService.myBookings().then(setBookings).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const cancel = (id: number, cat: string) => {
    Alert.alert('Cancel Booking', `Cancel ${cat.replace(/_/g, ' ')} booking?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => homeServicesService.cancelBooking(id).then(load).catch(() => Alert.alert('Error', 'Could not cancel')) },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={b => String(b.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No bookings yet</Text>}
        renderItem={({ item: b }) => {
          const [bg, tc] = STATUS_COLORS[b.status] || ['#f1f5f9', '#64748b'];
          const canCancel = !['WORK_DONE','COMPLETED','CANCELLED'].includes(b.status);
          return (
            <View style={styles.card}>
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cat}>{b.category.replace(/_/g, ' ')}</Text>
                  <Text style={styles.type}>{b.bookingType}{b.flatNumber ? ` · Flat ${b.flatNumber}` : ''}</Text>
                  {b.description ? <Text style={styles.desc}>{b.description}</Text> : null}
                  {b.quotedPrice != null ? <Text style={styles.price}>Quoted: ₹{b.quotedPrice}</Text> : null}
                </View>
                <View style={[styles.badge, { backgroundColor: bg }]}>
                  <Text style={[styles.badgeText, { color: tc }]}>{b.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              {canCancel && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(b.id, b.category)}>
                  <Text style={styles.cancelText}>Cancel Booking</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  cat: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  type: { fontSize: 13, color: '#64748b', marginTop: 2 },
  desc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  price: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginLeft: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cancelBtn: { marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 8, padding: 8, alignItems: 'center' },
  cancelText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
