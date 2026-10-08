import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { personalFinanceService, PersonalReceiptDto } from '@/services/personalFinanceService';

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export default function ReceiptsScreen() {
  const queryClient = useQueryClient();
  const [selectedReceipt, setSelectedReceipt] = useState<PersonalReceiptDto | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [notes, setNotes] = useState('');

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['personal-finance-receipts'],
    queryFn: personalFinanceService.getReceipts,
  });

  const uploadMutation = useMutation({
    mutationFn: (newR: any) => personalFinanceService.uploadReceipt(newR),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-receipts'] });
      setShowUploadModal(false);
      setMerchant('');
      setAmount('');
      setNotes('');
      Alert.alert('Receipt Uploaded', 'Receipt stored and OCR tags applied.');
    },
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Receipts Vault',
          headerBackTitle: 'My Money',
        }}
      />
      <View style={s.container}>
        {/* Header Summary */}
        <View style={s.headerBanner}>
          <View>
            <Text style={s.headerTitle}>Digital Receipt Vault</Text>
            <Text style={s.headerSub}>{receipts.length} Stored & OCR-Processed Receipts</Text>
          </View>
          <TouchableOpacity style={s.uploadBtn} onPress={() => setShowUploadModal(true)}>
            <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
            <Text style={s.uploadBtnText}>Scan / Upload</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          <ScrollView contentContainerStyle={s.content}>
            <View style={s.receiptGrid}>
              {receipts.map(rcpt => (
                <TouchableOpacity
                  key={rcpt.id}
                  style={s.receiptCard}
                  onPress={() => setSelectedReceipt(rcpt)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: rcpt.imageUrl }} style={s.receiptImage} />
                  <View style={s.cardBody}>
                    <Text style={s.merchantName} numberOfLines={1}>{rcpt.merchantName}</Text>
                    <Text style={s.receiptAmount}>{formatCurrency(rcpt.amount)}</Text>
                    <View style={s.cardFooter}>
                      <Text style={s.receiptDate}>{rcpt.date}</Text>
                      {rcpt.ocrExtracted && (
                        <View style={s.ocrPill}>
                          <Ionicons name="checkmark-done" size={10} color="#059669" />
                          <Text style={s.ocrText}>OCR</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Receipt Detail Modal */}
        <Modal visible={!!selectedReceipt} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{selectedReceipt?.merchantName}</Text>
                <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {selectedReceipt && (
                <ScrollView style={{ maxHeight: 460 }}>
                  <Image source={{ uri: selectedReceipt.imageUrl }} style={s.modalImage} />
                  <View style={s.modalMeta}>
                    <View style={s.metaRow}>
                      <Text style={s.metaLabel}>Amount Paid</Text>
                      <Text style={s.metaValue}>{formatCurrency(selectedReceipt.amount)}</Text>
                    </View>
                    <View style={s.metaRow}>
                      <Text style={s.metaLabel}>Date</Text>
                      <Text style={s.metaValue}>{selectedReceipt.date}</Text>
                    </View>
                    <View style={s.metaRow}>
                      <Text style={s.metaLabel}>Category</Text>
                      <Text style={s.metaValue}>{selectedReceipt.category}</Text>
                    </View>
                    {selectedReceipt.taxAmount !== undefined && (
                      <View style={s.metaRow}>
                        <Text style={s.metaLabel}>Tax Included</Text>
                        <Text style={s.metaValue}>₹{selectedReceipt.taxAmount}</Text>
                      </View>
                    )}
                    {selectedReceipt.notes && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={s.metaLabel}>Notes</Text>
                        <Text style={s.notesText}>{selectedReceipt.notes}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Upload Modal */}
        <Modal visible={showUploadModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Upload Receipt</Text>
                <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Merchant / Store Name *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Fresh Supermart"
                placeholderTextColor="#94A3B8"
                value={merchant}
                onChangeText={setMerchant}
              />

              <Text style={s.label}>Amount (₹) *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 1250"
                placeholderTextColor="#94A3B8"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <Text style={s.label}>Category</Text>
              <TextInput
                style={s.input}
                placeholder="Groceries, Dining, Electronics..."
                placeholderTextColor="#94A3B8"
                value={category}
                onChangeText={setCategory}
              />

              <Text style={s.label}>Notes (Optional)</Text>
              <TextInput
                style={s.input}
                placeholder="Details or item description"
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={[s.submitBtn, (!merchant || !amount) && { opacity: 0.5 }]}
                disabled={!merchant || !amount || uploadMutation.isPending}
                onPress={() => {
                  uploadMutation.mutate({
                    merchantName: merchant.trim(),
                    amount: parseFloat(amount),
                    date: new Date().toISOString().split('T')[0],
                    category: category.trim(),
                    imageUrl: 'https://images.unsplash.com/photo-1554415707-9e4c29729ff7?w=600&auto=format&fit=crop&q=80',
                    ocrExtracted: true,
                    notes: notes.trim() || undefined,
                  });
                }}
              >
                <Text style={s.submitBtnText}>Save to Vault</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBanner: {
    backgroundColor: '#1E293B',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  uploadBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  content: { padding: 16 },
  receiptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  receiptCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  receiptImage: { width: '100%', height: 110, resizeMode: 'cover' },
  cardBody: { padding: 10 },
  merchantName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  receiptAmount: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  receiptDate: { fontSize: 11, color: '#64748B' },
  ocrPill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#ECFDF5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  ocrText: { fontSize: 9, fontWeight: '800', color: '#059669' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  modalImage: { width: '100%', height: 180, borderRadius: RADIUS.md, resizeMode: 'cover', marginBottom: 14 },
  modalMeta: { gap: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  metaLabel: { fontSize: 13, color: '#64748B' },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  notesText: { fontSize: 12, color: '#334155', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1E293B', marginBottom: 12 },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
