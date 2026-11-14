import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';

interface CheckItem {
  id: string;
  name: string;
  spec: string;
  measured: string;
  passed: boolean;
}

export default function FreshQualityCheckScreen() {
  const router = useRouter();
  const [coreTemp, setCoreTemp] = useState('3.2°C');
  const [checks, setChecks] = useState<CheckItem[]>([
    { id: '1', name: 'Core Temperature', spec: '2.0°C – 4.0°C', measured: '3.2°C', passed: true },
    { id: '2', name: 'Aroma & Fermentation', spec: 'Pleasant aroma, no spoilage', measured: 'Clean fermentation', passed: true },
    { id: '3', name: 'Seal Integrity', spec: 'Hermetic MAP seal 100%', measured: 'No leaks detected', passed: true },
    { id: '4', name: 'pH / Acidity', spec: '4.5 – 5.2 pH', measured: '4.8 pH', passed: true }
  ]);

  const toggleCheck = (id: string) => {
    setChecks(checks.map(c => c.id === id ? { ...c, passed: !c.passed } : c));
  };

  const handleRelease = (decision: 'RELEASE' | 'QUARANTINE') => {
    if (decision === 'RELEASE') {
      Alert.alert('Batch Released', 'Quality Gate cleared. Batch moved to Ready for Dispatch.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Batch Quarantined', 'Quality Alert raised. Investigation required before scrap/rework.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Quality Gate Release</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.batchInfo}>
          <Text style={styles.infoTitle}>BATCH-20261104-01</Text>
          <Text style={styles.infoSub}>Standard Idli Batter (1L) • 92 Units Finished</Text>
        </View>

        <View style={styles.tempCard}>
          <Ionicons name="thermometer" size={24} color="#0284C7" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.tempTitle}>Verified Core Temperature</Text>
            <Text style={styles.tempSub}>Target: ≤ 4.0°C</Text>
          </View>
          <Text style={styles.tempValue}>{coreTemp}</Text>
        </View>

        <Text style={styles.sectionTitle}>Mandatory QC Checklist</Text>

        {checks.map(check => (
          <TouchableOpacity
            key={check.id}
            style={[styles.checkRow, check.passed ? styles.checkRowPass : styles.checkRowFail]}
            onPress={() => toggleCheck(check.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.checkName}>{check.name}</Text>
              <Text style={styles.checkSpec}>Spec: {check.spec}</Text>
              <Text style={styles.checkMeasured}>Measured: {check.measured}</Text>
            </View>
            <Ionicons
              name={check.passed ? 'checkmark-circle' : 'close-circle'}
              size={26}
              color={check.passed ? '#059669' : '#EF4444'}
            />
          </TouchableOpacity>
        ))}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.quarantineBtn}
            onPress={() => handleRelease('QUARANTINE')}
          >
            <Text style={styles.quarantineBtnText}>Quarantine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.releaseBtn}
            onPress={() => handleRelease('RELEASE')}
          >
            <Text style={styles.releaseBtnText}>Authorize Release</Text>
          </TouchableOpacity>
        </View>
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
  batchInfo: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  infoSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  tempCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16
  },
  tempTitle: { fontSize: 13, fontWeight: '700', color: '#0369A1' },
  tempSub: { fontSize: 11, color: '#0284C7' },
  tempValue: { fontSize: 18, fontWeight: '800', color: '#0369A1' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 12 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10
  },
  checkRowPass: { borderColor: '#A7F3D0' },
  checkRowFail: { borderColor: '#FECACA' },
  checkName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  checkSpec: { fontSize: 11, color: '#64748B', marginTop: 2 },
  checkMeasured: { fontSize: 12, fontWeight: '600', color: '#059669', marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quarantineBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center'
  },
  quarantineBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
  releaseBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#059669', alignItems: 'center', ...SHADOWS.sm
  },
  releaseBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 }
});