import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';

interface ManifestStop {
  id: string;
  tower: string;
  flat: string;
  resident: string;
  items: string[];
  packed: boolean;
}

const STOPS: ManifestStop[] = [
  { id: '1', tower: 'Tower 4', flat: '802', resident: 'Ananya Sharma', items: ['Papaya Bowl x 2', 'Idli Batter 1L'], packed: true },
  { id: '2', tower: 'Tower 4', flat: '1105', resident: 'Vikram Joshi', items: ['Athlete Fuel Bowl x 1'], packed: true },
  { id: '3', tower: 'Tower 7', flat: '304', resident: 'Kavitha Rao', items: ['Orange Juice 500ml'], packed: false },
  { id: '4', tower: 'Tower 9', flat: '1401', resident: 'Sunil Nair', items: ['Ragi Dosa Batter 1L'], packed: false }
];

export default function FreshPackingManifestScreen() {
  const router = useRouter();
  const [stops, setStops] = useState<ManifestStop[]>(STOPS);

  const togglePacked = (id: string) => {
    setStops(stops.map(s => s.id === id ? { ...s, packed: !s.packed } : s));
  };

  const packedCount = stops.filter(s => s.packed).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Packing Manifest</Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => Alert.alert('Loaded', 'All bags scanned and loaded into chilled crate.')}
        >
          <Text style={styles.doneBtnText}>Seal Crate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.communityTitle}>Prestige Lakeside Habitat</Text>
          <Text style={styles.routeCode}>RUN-20261104-PL01 • Chilled Morning Run</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(packedCount / stops.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{packedCount} of {stops.length} bags packed</Text>
        </View>

        <Text style={styles.sectionTitle}>Doorstep Drops (Sorted by Tower)</Text>

        {stops.map(stop => (
          <TouchableOpacity
            key={stop.id}
            style={[styles.stopCard, stop.packed ? styles.stopCardDone : styles.stopCardPending]}
            onPress={() => togglePacked(stop.id)}
          >
            <View style={styles.stopHeader}>
              <View style={styles.flatBadge}>
                <Text style={styles.flatText}>{stop.tower} - {stop.flat}</Text>
              </View>
              <Ionicons
                name={stop.packed ? 'checkbox' : 'square-outline'}
                size={22}
                color={stop.packed ? '#059669' : '#94A3B8'}
              />
            </View>

            <Text style={styles.residentName}>{stop.resident}</Text>
            <View style={styles.itemsList}>
              {stop.items.map((it, idx) => (
                <Text key={idx} style={styles.itemText}>• {it}</Text>
              ))}
            </View>
          </TouchableOpacity>
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
  doneBtn: { backgroundColor: '#0284C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  doneBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  container: { flex: 1 },
  content: { padding: 16 },
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, ...SHADOWS.sm
  },
  communityTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  routeCode: { fontSize: 12, color: '#0284C7', marginTop: 2, fontWeight: '600' },
  progressBar: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#059669' },
  progressText: { fontSize: 11, color: '#64748B', marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 12 },
  stopCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10
  },
  stopCardDone: { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' },
  stopCardPending: { borderColor: '#E2E8F0' },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flatBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  flatText: { fontSize: 12, fontWeight: '700', color: '#0369A1' },
  residentName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 8 },
  itemsList: { marginTop: 4 },
  itemText: { fontSize: 12, color: '#475569', marginTop: 1 }
});