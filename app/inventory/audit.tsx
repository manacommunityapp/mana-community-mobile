import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, Modal, Alert, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS } from '@/constants/config';
import { inventoryService, InventoryItem, AssetAuditLog } from '@/services/inventoryService';

export default function AssetAuditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<InventoryItem | null>(null);
  const [actualCount, setActualCount] = useState('1');
  const [actualStatus, setActualStatus] = useState('AVAILABLE');
  const [auditorName, setAuditorName] = useState('Society Auditor');
  const [notes, setNotes] = useState('');

  const { data: assets = [] } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', 'items'],
    queryFn: () => inventoryService.getItems(),
  });

  const { data: auditLogs = [], isLoading, refetch } = useQuery<AssetAuditLog[]>({
    queryKey: ['inventory', 'audit-screen'],
    queryFn: () => inventoryService.getAuditLogs(),
  });

  const auditMutation = useMutation({
    mutationFn: ({ id, expected, actual, status, note, by }: {
      id: number; expected: number; actual: number; status: string; note: string; by: string;
    }) => inventoryService.createAuditLog(id, {
      auditedBy: by,
      expectedQuantity: expected,
      actualQuantity: actual,
      actualStatus: status,
      notes: note,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'audit-screen'] });
      setModalVisible(false);
      setSelectedAsset(null);
      setNotes('');
      Alert.alert('Audit Recorded', 'Physical asset verification has been logged.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not record audit.'),
  });

  const filteredLogs = auditLogs.filter(log => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (log.asset?.name || '').toLowerCase().includes(q) || log.auditedBy.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Asset Audit & Scanner</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="shield-checkmark" size={22} color="#059669" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.bannerTitle}>Physical Asset Verification</Text>
          <Text style={styles.bannerSub}>Scan QR code or select equipment to verify physical inventory counts.</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search audited items or auditors..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const hasVariance = item.variance !== 0;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.assetHeader}>
                  <Text style={styles.assetName}>{item.asset?.name || `Asset #${item.id}`}</Text>
                  <Text style={styles.auditor}>Audited by {item.auditedBy}</Text>
                </View>
                <View style={[styles.statusBadge, hasVariance ? styles.varianceBadge : styles.matchedBadge]}>
                  <Text style={[styles.statusText, hasVariance ? styles.varianceText : styles.matchedText]}>
                    {hasVariance ? 'Variance' : 'Matched'}
                  </Text>
                </View>
              </View>

              <View style={styles.countsRow}>
                <View style={styles.countBox}>
                  <Text style={styles.countLabel}>Expected</Text>
                  <Text style={styles.countVal}>{item.expectedQuantity}</Text>
                </View>
                <View style={styles.countBox}>
                  <Text style={styles.countLabel}>Actual Count</Text>
                  <Text style={styles.countVal}>{item.actualQuantity}</Text>
                </View>
                <View style={styles.countBox}>
                  <Text style={styles.countLabel}>Variance</Text>
                  <Text style={[styles.countVal, { color: hasVariance ? '#DC2626' : '#059669' }]}>
                    {item.variance > 0 ? '+' : ''}{item.variance}
                  </Text>
                </View>
              </View>

              {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
              <Text style={styles.timeText}>{new Date(item.auditedAt).toLocaleString()}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No audit logs found</Text>
            <Text style={styles.emptySub}>Tap the QR icon to perform an asset audit</Text>
          </View>
        }
      />

      {/* Perform Audit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Perform Asset Audit</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Select Asset / Tool</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={assets.slice(0, 10)}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ gap: 6, marginBottom: 12 }}
              renderItem={({ item }) => {
                const selected = selectedAsset?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.assetChip, selected && styles.assetChipActive]}
                    onPress={() => setSelectedAsset(item)}
                  >
                    <Text style={[styles.assetChipText, selected && styles.assetChipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <Text style={styles.label}>Auditor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor="#94A3B8"
              value={auditorName}
              onChangeText={setAuditorName}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Expected Qty</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F1F5F9' }]}
                  editable={false}
                  value="1"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Actual Counted *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={actualCount}
                  onChangeText={setActualCount}
                />
              </View>
            </View>

            <Text style={styles.label}>Physical Condition</Text>
            <View style={styles.condRow}>
              {['AVAILABLE', 'MAINTENANCE', 'LOST'].map(st => (
                <TouchableOpacity
                  key={st}
                  style={[styles.condBtn, actualStatus === st && styles.condBtnActive]}
                  onPress={() => setActualStatus(st)}
                >
                  <Text style={[styles.condBtnText, actualStatus === st && styles.condBtnTextActive]}>
                    {st === 'AVAILABLE' ? 'Good' : st === 'MAINTENANCE' ? 'Needs Repair' : 'Missing'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Observation / Audit Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Serial tag verified, minor scratch on chassis..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                const targetId = selectedAsset?.id || (assets[0]?.id ?? 1);
                const actual = parseInt(actualCount) || 0;
                auditMutation.mutate({
                  id: targetId,
                  expected: 1,
                  actual,
                  status: actualStatus,
                  note: notes.trim(),
                  by: auditorName.trim() || 'Auditor',
                });
              }}
              disabled={auditMutation.isPending}
            >
              {auditMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Confirm Audit Scan</Text>
              )}
            </TouchableOpacity>
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
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  scanBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 10 },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  bannerSub: { fontSize: 11, color: '#047857', marginTop: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, paddingHorizontal: 12, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 12, color: '#0F172A', marginLeft: 6 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  assetHeader: { flex: 1 },
  assetName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  auditor: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  matchedBadge: { backgroundColor: '#DCFCE7' },
  matchedText: { color: '#059669', fontSize: 10, fontWeight: '700' },
  varianceBadge: { backgroundColor: '#FEE2E2' },
  varianceText: { color: '#DC2626', fontSize: 10, fontWeight: '700' },
  countsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginVertical: 10, justifyContent: 'space-around' },
  countBox: { alignItems: 'center' },
  countLabel: { fontSize: 10, color: '#64748B' },
  countVal: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  notesText: { fontSize: 12, color: '#475569', lineHeight: 16, marginBottom: 6 },
  timeText: { fontSize: 10, color: '#94A3B8' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  label: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  assetChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  assetChipActive: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4F46E5' },
  assetChipText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  assetChipTextActive: { color: '#4F46E5', fontWeight: '700' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, color: '#0F172A', marginBottom: 10 },
  condRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  condBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  condBtnActive: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4F46E5' },
  condBtnText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  condBtnTextActive: { color: '#4F46E5', fontWeight: '700' },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8, fontSize: 12, color: '#0F172A', height: 60, textAlignVertical: 'top', marginBottom: 14 },
  submitBtn: { backgroundColor: '#059669', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
