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
import { inventoryService, PurchaseRequest, ProcurementStatus, ExpenseCategory } from '@/services/inventoryService';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  REQUESTED:            { label: 'Requested',        color: '#7C3AED', bg: '#EDE9FE' },
  COMMITTEE_APPROVED:   { label: 'Approved',         color: '#0284C7', bg: '#E0F2FE' },
  QUOTATIONS_COLLECTED: { label: 'Quotes In',        color: '#2563EB', bg: '#DBEAFE' },
  VENDOR_SELECTED:      { label: 'Vendor Picked',    color: '#0891B2', bg: '#CFFAFE' },
  PURCHASE_ORDERED:     { label: 'PO Issued',        color: '#D97706', bg: '#FEF3C7' },
  GOODS_RECEIVED:       { label: 'Goods Received',   color: '#059669', bg: '#DCFCE7' },
  INVOICED:             { label: 'Invoiced',         color: '#4F46E5', bg: '#EEF2FF' },
  INVENTORY_CREATED:    { label: 'Asset Provisioned',color: '#059669', bg: '#DCFCE7' },
  REJECTED:             { label: 'Rejected',         color: '#DC2626', bg: '#FEE2E2' },
  CANCELLED:            { label: 'Cancelled',        color: '#64748B', bg: '#F1F5F9' },
};

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'CapEx_Asset',      label: 'Capital Asset (CapEx)' },
  { value: 'OpEx_Maintenance', label: 'Repairs & Maintenance' },
  { value: 'OpEx_Consumable',  label: 'Supplies & Consumables' },
  { value: 'OpEx_Other',       label: 'Other Operations' },
  { value: 'SPORTS',           label: 'Sports Equipment' },
  { value: 'SECURITY',         label: 'Security Upgrades' },
  { value: 'CLEANING',         label: 'Sanitation' },
  { value: 'EVENTS',           label: 'Social Events' },
];

export default function ProcurementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [actionReq, setActionReq] = useState<PurchaseRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [poNumber, setPoNumber] = useState('');

  // New Request Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('OpEx_Maintenance');
  const [amount, setAmount] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [desc, setDesc] = useState('');

  const { data: requests = [], isLoading, refetch } = useQuery<PurchaseRequest[]>({
    queryKey: ['inventory', 'procurement-screen'],
    queryFn: () => inventoryService.getPurchaseRequests(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof inventoryService.createPurchaseRequest>[0]) =>
      inventoryService.createPurchaseRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'procurement-screen'] });
      setModalVisible(false);
      setTitle('');
      setAmount('');
      setDesc('');
      Alert.alert('Requisition Submitted', 'Purchase request created for committee review.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not submit request.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes, po }: { id: number; status: ProcurementStatus; notes?: string; po?: string }) =>
      inventoryService.updatePurchaseRequestStatus(id, status, notes, po),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'procurement-screen'] });
      setActionReq(null);
      setActionNotes('');
      setPoNumber('');
      Alert.alert('Updated', 'Procurement workflow status updated.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not update status.'),
  });

  const filtered = requests.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Society Procurement & PO</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Scroll */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={['ALL', 'REQUESTED', 'COMMITTEE_APPROVED', 'PURCHASE_ORDERED', 'GOODS_RECEIVED']}
        keyExtractor={item => item}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = filterStatus === item;
          return (
            <TouchableOpacity
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilterStatus(item)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {item === 'ALL' ? 'All Requests' : STATUS_CONFIG[item]?.label || item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id || Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const scfg = STATUS_CONFIG[item.status || 'REQUESTED'] || STATUS_CONFIG.REQUESTED;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.statusBadge, { backgroundColor: scfg.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: scfg.color }]}>{scfg.label}</Text>
                </View>
                <Text style={styles.amountText}>₹{(item.estimatedAmount || 0).toLocaleString('en-IN')}</Text>
              </View>

              <Text style={styles.reqTitle}>{item.title}</Text>
              <Text style={styles.categoryText}>{item.category} • Requested by {item.requestedBy || 'Committee'}</Text>
              {item.description && <Text style={styles.descText}>{item.description}</Text>}

              <View style={styles.metaRow}>
                {item.neededBy && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color="#64748B" />
                    <Text style={styles.metaText}>Needed by: {item.neededBy}</Text>
                  </View>
                )}
                {item.purchaseOrderNumber && (
                  <View style={styles.metaItem}>
                    <Ionicons name="document-text-outline" size={12} color="#4F46E5" />
                    <Text style={[styles.metaText, { color: '#4F46E5', fontWeight: '700' }]}>
                      PO: {item.purchaseOrderNumber}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {item.status === 'REQUESTED' && (
                  <>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => {
                        if (item.id) {
                          updateStatusMutation.mutate({ id: item.id, status: 'COMMITTEE_APPROVED' });
                        }
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => {
                        if (item.id) {
                          updateStatusMutation.mutate({ id: item.id, status: 'REJECTED' });
                        }
                      }}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}

                {item.status === 'COMMITTEE_APPROVED' && (
                  <TouchableOpacity
                    style={styles.poBtn}
                    onPress={() => setActionReq(item)}
                  >
                    <Ionicons name="receipt-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.poBtnText}>Issue Purchase Order (PO)</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'PURCHASE_ORDERED' && (
                  <TouchableOpacity
                    style={styles.receiveBtn}
                    onPress={() => {
                      if (item.id) {
                        updateStatusMutation.mutate({ id: item.id, status: 'GOODS_RECEIVED' });
                      }
                    }}
                  >
                    <Ionicons name="cube-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.receiveBtnText}>Mark Goods Inward</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No purchase requisitions</Text>
            <Text style={styles.emptySub}>Tap + to submit a purchase order requirement</Text>
          </View>
        }
      />

      {/* New Requisition Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Purchase Requisition</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Purchase 4x LED Floodlights for Court"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.catChip, category === c.value && styles.catChipActive]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={[styles.catChipText, category === c.value && styles.catChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Estimated Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 18000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>Needed By Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={neededBy}
              onChangeText={setNeededBy}
            />

            <Text style={styles.label}>Specification / Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Quotation justification, vendor references..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={desc}
              onChangeText={setDesc}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                const est = parseFloat(amount);
                if (!title.trim() || isNaN(est) || est <= 0) {
                  Alert.alert('Required', 'Please fill in title and amount.');
                  return;
                }
                createMutation.mutate({
                  title: title.trim(),
                  category,
                  estimatedAmount: est,
                  neededBy: neededBy.trim() || undefined,
                  description: desc.trim() || undefined,
                });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Requisition</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PO Generation Modal */}
      <Modal visible={!!actionReq} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 320, alignSelf: 'center', width: '90%', borderRadius: 20 }]}>
            <Text style={styles.modalTitle}>Issue Purchase Order</Text>
            <Text style={styles.poSub}>Enter official PO reference number for {actionReq?.title}:</Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. PO-2026-OCT-094"
              placeholderTextColor="#94A3B8"
              value={poNumber}
              onChangeText={setPoNumber}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setActionReq(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  if (actionReq?.id) {
                    const generatedPO = poNumber.trim() || `PO-${Date.now().toString().slice(-6)}`;
                    updateStatusMutation.mutate({
                      id: actionReq.id,
                      status: 'PURCHASE_ORDERED',
                      po: generatedPO,
                    });
                  }
                }}
              >
                <Text style={styles.modalConfirmText}>Issue PO</Text>
              </TouchableOpacity>
            </View>
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
  filterList: { paddingHorizontal: 16, paddingBottom: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 6 },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  amountText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  reqTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  categoryText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  descText: { fontSize: 12, color: '#475569', marginTop: 6, lineHeight: 17 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11, color: '#64748B', marginLeft: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', paddingVertical: 8, borderRadius: 8 },
  approveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', paddingVertical: 8, borderRadius: 8 },
  rejectBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  poBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED', paddingVertical: 8, borderRadius: 8 },
  poBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  receiveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0284C7', paddingVertical: 8, borderRadius: 8 },
  receiveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  label: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, color: '#0F172A', marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  catChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  catChipActive: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4F46E5' },
  catChipText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  catChipTextActive: { color: '#4F46E5', fontWeight: '700' },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8, fontSize: 12, color: '#0F172A', height: 60, textAlignVertical: 'top', marginBottom: 14 },
  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  poSub: { fontSize: 12, color: '#64748B', marginVertical: 8 },
  modalCancel: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modalCancelText: { color: '#64748B', fontWeight: '600' },
  modalConfirm: { flex: 1, backgroundColor: '#7C3AED', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700' },
});
