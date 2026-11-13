import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';

interface DropItem {
  id: string;
  tower: string;
  flat: string;
  resident: string;
  orderNumber: string;
  items: string;
  status: 'PENDING' | 'DELIVERED';
}

const DROPS: DropItem[] = [
  { id: '1', tower: 'Tower 4', flat: '802', resident: 'Ananya Sharma', orderNumber: 'ORD-9821', items: 'Papaya Bowl x 2, Batter 1L', status: 'DELIVERED' },
  { id: '2', tower: 'Tower 4', flat: '1105', resident: 'Vikram Joshi', orderNumber: 'ORD-9825', items: 'Athlete Fuel Bowl x 1', status: 'DELIVERED' },
  { id: '3', tower: 'Tower 7', flat: '304', resident: 'Kavitha Rao', orderNumber: 'ORD-9831', items: 'Orange Juice 500ml', status: 'PENDING' },
  { id: '4', tower: 'Tower 9', flat: '1401', resident: 'Sunil Nair', orderNumber: 'ORD-9834', items: 'Ragi Dosa Batter 1L', status: 'PENDING' }
];

export default function FreshDeliveryRunScreen() {
  const router = useRouter();
  const [drops, setDrops] = useState<DropItem[]>(DROPS);

  const markDelivered = (id: string) => {
    setDrops(drops.map(d => d.id === id ? { ...d, status: 'DELIVERED' } : d));
    Alert.alert('Drop Confirmed', 'Resident notification dispatched with doorstep proof.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Active Delivery Run</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.runnerBanner}>
          <Ionicons name="bicycle" size={24} color="#059669" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.runnerTitle}>Prestige Lakeside Habitat</Text>
            <Text style={styles.runnerSub}>Tower 7 is your next drop location</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Delivery Queue</Text>

        {drops.map((drop, idx) => (
          <View
            key={drop.id}
            style={[styles.dropCard, drop.status === 'DELIVERED' ? styles.dropDone : styles.dropPending]}
          >
            <View style={styles.dropTop}>
              <View style={styles.seqCircle}>
                <Text style={styles.seqText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.flatText}>{drop.tower} - {drop.flat}</Text>
                <Text style={styles.residentName}>{drop.resident}</Text>
              </View>
              {drop.status === 'DELIVERED' ? (
                <View style={styles.deliveredTag}>
                  <Ionicons name="checkmark-done" size={14} color="#059669" />
                  <Text style={styles.deliveredText}>Done</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.deliverBtn}
                  onPress={() => markDelivered(drop.id)}
                >
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                  <Text style={styles.deliverBtnText}>Drop Off</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.orderSummary}>{drop.items}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0'
  },
  backBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  title: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  container: { flex: 1 },
  content: { padding: 16 },
  runnerBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 16
  },
  runnerTitle: { fontSize: 15, fontWeight: '700', color: '#065F46' },
  runnerSub: { fontSize: 12, color: '#059669', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 12 },
  dropCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10
  },
  dropDone: { borderColor: '#E2E8F0', opacity: 0.7 },
  dropPending: { borderColor: '#BAE6FD', ...SHADOWS.sm },
  dropTop: { flexDirection: 'row', alignItems: 'center' },
  seqCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center'
  },
  seqText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  flatText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  residentName: { fontSize: 12, color: '#64748B' },
  deliveredTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6
  },
  deliveredText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  deliverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8
  },
  deliverBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  orderSummary: { fontSize: 12, color: '#64748B', marginTop: 8, paddingLeft: 38 }
});