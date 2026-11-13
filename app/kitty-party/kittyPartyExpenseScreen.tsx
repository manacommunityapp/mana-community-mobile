import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { kittyPartyService } from '@/services/kittyPartyService';
import type { KittyPartyExpenseShare } from '@/types/kittyPartyTypes';

export default function KittyPartyExpenseScreen() {
  const [shares, setShares] = useState<KittyPartyExpenseShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShare, setSelectedShare] = useState<KittyPartyExpenseShare | null>(null);
  const [settlementUtr, setSettlementUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      setLoading(true);
      const res = await kittyPartyService.getMyPendingShares();
      setShares(res || []);
    } catch (e) {
      console.error('Failed to load mobile expense shares', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!selectedShare || !settlementUtr.trim()) {
      Alert.alert('Required', 'Please enter UPI transaction reference (UTR)');
      return;
    }

    try {
      setSubmitting(true);
      await kittyPartyService.settleShare(selectedShare.id, settlementUtr.trim());
      setSelectedShare(null);
      setSettlementUtr('');
      Alert.alert('Success', 'Expense share marked as settled!');
      loadShares();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to settle share');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BE185D" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Party Bill Splitting</Text>
      <Text style={styles.screenSubtitle}>
        Settle your shares for food, decor, and cake bills from circle gatherings.
      </Text>

      {shares.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>All Settled Up!</Text>
          <Text style={styles.emptyText}>You have no pending expense shares right now.</Text>
        </View>
      ) : (
        <View style={styles.sharesList}>
          {shares.map((s) => (
            <View key={s.id} style={styles.shareCard}>
              <View style={styles.shareHeader}>
                <Text style={styles.shareDesc}>{s.expenseDescription || 'Party Bill'}</Text>
                <Text style={styles.shareStatus}>{s.settlementStatus}</Text>
              </View>

              <View style={styles.shareMetaRow}>
                <Text style={styles.totalLabel}>Total: ₹{s.totalExpenseAmount}</Text>
                <Text style={styles.myShareAmount}>My Share: ₹{s.shareAmount}</Text>
              </View>

              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => setSelectedShare(s)}
                activeOpacity={0.8}
              >
                <Text style={styles.payBtnText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Settle Modal */}
      <Modal visible={!!selectedShare} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settle Expense Share</Text>
            <Text style={styles.modalSubtitle}>
              Amount: ₹{selectedShare?.shareAmount}
            </Text>

            <Text style={styles.modalLabel}>UPI / IMPS REFERENCE (UTR) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 431092819201"
              value={settlementUtr}
              onChangeText={setSettlementUtr}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedShare(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSettle}
                disabled={submitting}
              >
                <Text style={styles.confirmBtnText}>
                  {submitting ? 'Saving...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sharesList: {
    gap: 12,
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareDesc: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  shareStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  shareMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  myShareAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#BE185D',
  },
  payBtn: {
    backgroundColor: '#BE185D',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BE185D',
    marginVertical: 6,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  confirmBtn: {
    backgroundColor: '#BE185D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
