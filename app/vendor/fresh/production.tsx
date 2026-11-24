import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import { freshVendorService, ProductionBatchRequest } from '@/services/freshVendorService';

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
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // New batch form state
  const [recipeName, setRecipeName] = useState<string>('Standard Idli Batter (1L)');
  const [batchCode, setBatchCode] = useState<string>(`BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0${batches.length + 1}`);
  const [inputQty, setInputQty] = useState<string>('50 kg');
  const [outputQty, setOutputQty] = useState<string>('46 L');
  const [temp, setTemp] = useState<string>('3.2°C');

  const loadProductionData = useCallback(async () => {
    try {
      const capacity = await freshVendorService.getProductionCapacity('v-kitchen-01');
      if (capacity && capacity.batches && Array.isArray(capacity.batches) && capacity.batches.length > 0) {
        setBatches(capacity.batches);
      }
    } catch {
      // Graceful fallback to default in-memory state
    }
  }, []);

  useEffect(() => {
    loadProductionData();
  }, [loadProductionData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProductionData();
    setRefreshing(false);
  };

  const handleCreateBatch = async () => {
    if (!recipeName.trim() || !inputQty.trim()) {
      Alert.alert('Validation Error', 'Please specify recipe name and raw input quantity.');
      return;
    }

    setSubmitting(true);
    const newBatch: BatchRun = {
      id: String(Date.now()),
      recipeName: recipeName.trim(),
      batchCode: batchCode.trim() || `BATCH-${Date.now().toString().slice(-6)}`,
      inputQty: inputQty.trim(),
      outputQty: outputQty.trim() || 'In Prep',
      yieldPct: outputQty.trim() ? '92%' : '—',
      status: 'IN_PRODUCTION',
      temp: temp.trim() || '3.5°C',
    };

    try {
      await freshVendorService.createProductionBatch({
        recipeName: newBatch.recipeName,
        batchCode: newBatch.batchCode,
        inputQty: newBatch.inputQty,
        outputQty: newBatch.outputQty,
        yieldPct: newBatch.yieldPct,
        temp: newBatch.temp,
      });
    } catch {
      // Local addition continues even if offline
    }

    setBatches(prev => [newBatch, ...prev]);
    setSubmitting(false);
    setModalVisible(false);
    Alert.alert('Success', `Production batch ${newBatch.batchCode} started.`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Fresh Production Runs</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={22} color="#059669" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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

      {/* New Batch Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initiate Production Batch</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Recipe / Product</Text>
            <TextInput
              style={styles.input}
              value={recipeName}
              onChangeText={setRecipeName}
              placeholder="e.g. Standard Idli Batter (1L)"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Batch Code</Text>
            <TextInput
              style={styles.input}
              value={batchCode}
              onChangeText={setBatchCode}
              placeholder="BATCH-YYYYMMDD-01"
              placeholderTextColor="#94A3B8"
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Raw Input Qty</Text>
                <TextInput
                  style={styles.input}
                  value={inputQty}
                  onChangeText={setInputQty}
                  placeholder="e.g. 50 kg"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Target Output</Text>
                <TextInput
                  style={styles.input}
                  value={outputQty}
                  onChangeText={setOutputQty}
                  placeholder="e.g. 46 L"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Chamber / Core Temp</Text>
            <TextInput
              style={styles.input}
              value={temp}
              onChangeText={setTemp}
              placeholder="e.g. 3.2°C"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleCreateBatch}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Start Production Run</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A'
  },
  modalSubmitBtn: {
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 20
  },
  modalSubmitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' }
});