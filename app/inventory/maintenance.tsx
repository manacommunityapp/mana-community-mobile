import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, Modal, Alert, RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { inventoryService, InventoryItem } from '@/services/inventoryService';

type MaintenanceType = 'PREVENTIVE' | 'REPAIR' | 'INSPECTION';
type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface MaintenanceRecord {
  id: string | number;
  assetId: number;
  assetName: string;
  category: string;
  maintenanceDate: string;
  type: MaintenanceType;
  description: string;
  cost: number;
  performedBy: string;
  status: MaintenanceStatus;
}

const INITIAL_RECORDS: MaintenanceRecord[] = [
  {
    id: 'MNT-101',
    assetId: 1,
    assetName: 'Schindler Passenger Lift - Tower A',
    category: 'Elevator',
    maintenanceDate: '2026-10-14',
    type: 'PREVENTIVE',
    description: 'Quarterly safety brake test, hoistway sensor alignment & motor greasing.',
    cost: 12500,
    performedBy: 'Schindler AMC Team',
    status: 'SCHEDULED',
  },
  {
    id: 'MNT-102',
    assetId: 2,
    assetName: 'Cummins 250kVA Silent DG Generator',
    category: 'DG Set',
    maintenanceDate: '2026-10-08',
    type: 'INSPECTION',
    description: 'Monthly battery voltage test, fuel water separator cleaning, oil filter check.',
    cost: 4800,
    performedBy: 'PowerGrid Services',
    status: 'IN_PROGRESS',
  },
  {
    id: 'MNT-103',
    assetId: 3,
    assetName: 'WTP Reverse Osmosis Membrane Array',
    category: 'Water Treatment',
    maintenanceDate: '2026-09-28',
    type: 'PREVENTIVE',
    description: 'High-pressure membrane chemical backwash, TDS calibration.',
    cost: 8500,
    performedBy: 'AquaTech Water Solutions',
    status: 'COMPLETED',
  },
  {
    id: 'MNT-104',
    assetId: 4,
    assetName: 'Jockey Fire Pump & Pressure Vessels',
    category: 'Fire Safety',
    maintenanceDate: '2026-09-20',
    type: 'INSPECTION',
    description: 'Hydrostatic pressure test, automatic cut-in switch calibration.',
    cost: 3200,
    performedBy: 'SafeFire India',
    status: 'COMPLETED',
  },
];

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; color: string; bg: string }> = {
  SCHEDULED:   { label: 'Scheduled',   color: '#64748B', bg: '#F1F5F9' },
  IN_PROGRESS: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#DCFCE7' },
  CANCELLED:   { label: 'Cancelled',   color: '#DC2626', bg: '#FEE2E2' },
};

const TYPE_CONFIG: Record<MaintenanceType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PREVENTIVE: { label: 'Preventive', icon: 'shield-checkmark-outline' },
  REPAIR:     { label: 'Repair',     icon: 'construct-outline' },
  INSPECTION: { label: 'Inspection', icon: 'search-outline' },
};

export default function MaintenanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<MaintenanceRecord[]>(INITIAL_RECORDS);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mType, setMType] = useState<MaintenanceType>('PREVENTIVE');
  const [mDesc, setMDesc] = useState('');
  const [mCost, setMCost] = useState('');
  const [mPerformedBy, setMPerformedBy] = useState('');

  const { data: assets = [] } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', 'items'],
    queryFn: () => inventoryService.getItems(),
  });

  const filtered = records.filter(r => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return r.assetName.toLowerCase().includes(q) || r.performedBy.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCreate = () => {
    const asset = assets.find(a => String(a.id) === selectedAssetId) || { name: 'Elevator / Utility Asset', category: 'General' };
    if (!mDesc.trim()) {
      Alert.alert('Incomplete', 'Please provide a maintenance description.');
      return;
    }
    const newRecord: MaintenanceRecord = {
      id: `MNT-${Math.floor(100 + Math.random() * 900)}`,
      assetId: parseInt(selectedAssetId) || 1,
      assetName: asset.name,
      category: asset.category || 'Utility',
      maintenanceDate: mDate,
      type: mType,
      description: mDesc.trim(),
      cost: parseFloat(mCost) || 0,
      performedBy: mPerformedBy.trim() || 'Assigned Technician',
      status: 'SCHEDULED',
    };
    setRecords([newRecord, ...records]);
    setModalVisible(false);
    setMDesc('');
    setMCost('');
    setMPerformedBy('');
    Alert.alert('Scheduled', 'Maintenance work order scheduled successfully.');
  };

  const handleStatusUpdate = (id: string | number, nextStatus: MaintenanceStatus) => {
    const updated = records.map(r => r.id === id ? { ...r, status: nextStatus } : r);
    setRecords(updated);
    Alert.alert('Status Updated', `Work order marked as ${nextStatus}.`);
  };

  // Stats
  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
  const activeCount = records.filter(r => r.status === 'IN_PROGRESS').length;
  const upcomingCount = records.filter(r => r.status === 'SCHEDULED').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Preventive Maintenance & AMCs</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* KPI Stats Strip */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiVal}>{upcomingCount}</Text>
          <Text style={styles.kpiLabel}>Upcoming</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: '#D97706' }]}>{activeCount}</Text>
          <Text style={styles.kpiLabel}>In Progress</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: '#059669' }]}>₹{(totalCost / 1000).toFixed(1)}k</Text>
          <Text style={styles.kpiLabel}>TCO Cost</Text>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search equipment, AMC vendor, work order..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filter Chips */}
      <View style={styles.filterChipRow}>
        {['ALL', 'PREVENTIVE', 'REPAIR', 'INSPECTION'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, filterType === t && styles.filterChipActive]}
            onPress={() => setFilterType(t)}
          >
            <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
              {t === 'ALL' ? 'All Types' : t.charAt(0) + t.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const scfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.SCHEDULED;
          const tcfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.PREVENTIVE;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.typeBadge}>
                  <Ionicons name={tcfg.icon} size={11} color="#4F46E5" />
                  <Text style={styles.typeBadgeText}>{tcfg.label}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: scfg.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: scfg.color }]}>{scfg.label}</Text>
                </View>
              </View>

              <Text style={styles.assetName}>{item.assetName}</Text>
              <Text style={styles.desc}>{item.description}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#64748B" />
                  <Text style={styles.metaText}>{item.maintenanceDate}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="person-outline" size={12} color="#64748B" />
                  <Text style={styles.metaText}>{item.performedBy}</Text>
                </View>
                {item.cost > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={12} color="#059669" />
                    <Text style={[styles.metaText, { color: '#059669', fontWeight: '700' }]}>
                      ₹{item.cost.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                {item.status === 'SCHEDULED' && (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => handleStatusUpdate(item.id, 'IN_PROGRESS')}
                  >
                    <Ionicons name="play" size={12} color="#FFFFFF" />
                    <Text style={styles.startBtnText}>Start Work</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'IN_PROGRESS' && (
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => handleStatusUpdate(item.id, 'COMPLETED')}
                  >
                    <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                    <Text style={styles.completeBtnText}>Complete Work Order</Text>
                  </TouchableOpacity>
                )}
                {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleStatusUpdate(item.id, 'CANCELLED')}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No maintenance records</Text>
            <Text style={styles.emptySub}>Schedule regular AMCs to prevent system breakdowns</Text>
          </View>
        }
      />

      {/* Schedule Maintenance Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Maintenance</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Select Equipment / Asset</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Passenger Lift A / DG Set 1"
              placeholderTextColor="#94A3B8"
              value={selectedAssetId}
              onChangeText={setSelectedAssetId}
            />

            <Text style={styles.label}>Maintenance Type</Text>
            <View style={styles.typeSelector}>
              {(['PREVENTIVE', 'REPAIR', 'INSPECTION'] as MaintenanceType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeSelectBtn, mType === t && styles.typeSelectBtnActive]}
                  onPress={() => setMType(t)}
                >
                  <Text style={[styles.typeSelectText, mType === t && styles.typeSelectTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Target Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-10-15"
              placeholderTextColor="#94A3B8"
              value={mDate}
              onChangeText={setMDate}
            />

            <Text style={styles.label}>Technician / AMC Vendor</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Otis Elevator AMC Team"
              placeholderTextColor="#94A3B8"
              value={mPerformedBy}
              onChangeText={setMPerformedBy}
            />

            <Text style={styles.label}>Estimated Cost (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={mCost}
              onChangeText={setMCost}
            />

            <Text style={styles.label}>Maintenance Checklist & Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Details of preventive checks, part replacements..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={mDesc}
              onChangeText={setMDesc}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Create Work Order</Text>
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  kpiRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', ...SHADOWS.sm },
  kpiVal: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  kpiLabel: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, paddingHorizontal: 12, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 12, color: '#0F172A', marginLeft: 6 },
  filterChipRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 6 },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#4F46E5', marginLeft: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  assetName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  desc: { fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 17 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11, color: '#64748B', marginLeft: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D97706', paddingVertical: 8, borderRadius: 8 },
  startBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', paddingVertical: 8, borderRadius: 8 },
  completeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  label: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, color: '#0F172A', marginBottom: 10 },
  typeSelector: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typeSelectBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  typeSelectBtnActive: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4F46E5' },
  typeSelectText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  typeSelectTextActive: { color: '#4F46E5' },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8, fontSize: 12, color: '#0F172A', height: 60, textAlignVertical: 'top', marginBottom: 14 },
  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
