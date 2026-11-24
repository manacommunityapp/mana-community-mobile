import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';

interface BatchRun {
  id: string;
  recipeName: string;
  batchCode: string;
  inputQty: string;
  outputQty: string;
  yieldPct: string;
  status: 'IN_PRODUCTION' | 'QC_PENDING' | 'RELEASED';
  temp: string;
}

const BATCHES: BatchRun[] = [
  {
    id: '1',
    recipeName: 'Standard Idli Batter (1L)',
    batchCode: 'BATCH-20261104-01',
    inputQty: '100 kg',
    outputQty: '92 L',
    yieldPct: '92.0%',
    status: 'QC_PENDING',
    temp: '3.4°C'
  },
  {
    id: '2',
    recipeName: 'Fresh Cut Tropical Fruit Mix (250g)',
    batchCode: 'BATCH-20261104-02',
    inputQty: '40 kg',
    outputQty: '34 kg',
    yieldPct: '85.0%',
    status: 'RELEASED',
    temp: '2.8°C'
  },
  {
    id: '3',
    recipeName: 'High Protein Sprouts Bowl',
    batchCode: 'BATCH-20261104-03',
    inputQty: '25 kg',
    outputQty: 'In Prep',
    yieldPct: '—',
    status: 'IN_PRODUCTION',
    temp: '4.0°C'
  }
];

export default function FreshProductionScreen() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchRun[]>(BATCHES);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Fresh Production Runs</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('New Batch', 'Initiating BOM production run...')}
        >
          <Ionicons name="add" size={22} color="#059669" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Ionicons name="snow" size={24} color="#0284C7" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>Cold-Chain Active</Text>
            <Text style={styles.bannerSub}>All preparation zones holding steady at 2°C – 4°C</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today's Processing Batches</Text>

        {batches.map(batch => (
          <View key={batch.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.recipeName}>{batch.recipeName}</Text>
                <Text style={styles.batchCode}>{batch.batchCode}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                batch.status === 'RELEASED' ? styles.statusReleased :
                batch.status === 'QC_PENDING' ? styles.statusQc : styles.statusProd
              ]}>
                <Text style={[
                  styles.statusText,
                  batch.status === 'RELEASED' ? styles.textReleased :
                  batch.status === 'QC_PENDING' ? styles.textQc : styles.textProd
                ]}>{batch.status.replace('_', ' ')}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Raw In</Text>
                <Text style={styles.statVal}>{batch.inputQty}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Output</Text>
                <Text style={styles.statVal}>{batch.outputQty}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Yield</Text>
                <Text style={styles.statVal}>{batch.yieldPct}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Temp</Text>
                <Text style={[styles.statVal, { color: '#0284C7' }]}>{batch.temp}</Text>
              </View>
            </View>

            {batch.status === 'QC_PENDING' && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/vendor/fresh/quality-check' as any)}
              >
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Perform Quality Gate Check</Text>
              </TouchableOpacity>
            )}
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
  addBtn: { padding: 6, borderRadius: 8, backgroundColor: '#ECFDF5' },
  container: { flex: 1 },
  content: { padding: 16 },
  banner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#0369A1' },
  bannerSub: { fontSize: 12, color: '#0284C7', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recipeName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  batchCode: { fontSize: 12, fontFamily: 'monospace', color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusReleased: { backgroundColor: '#ECFDF5' },
  statusQc: { backgroundColor: '#FEF3C7' },
  statusProd: { backgroundColor: '#EFF6FF' },
  statusText: { fontSize: 11, fontWeight: '700' },
  textReleased: { color: '#059669' },
  textQc: { color: '#D97706' },
  textProd: { color: '#2563EB' },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginTop: 12
  },
  statCol: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#94A3B8' },
  statVal: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, marginTop: 12
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }
});