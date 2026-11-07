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
import { useLocalSearchParams } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';
import type { KittyPartyCycle, KittyPartyContribution } from '@/types/kittyPartyTypes';

export default function KittyPartyLedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const circleId = Number(id);

  const [cycle, setCycle] = useState<KittyPartyCycle | null>(null);
  const [contributions, setContributions] = useState<KittyPartyContribution[]>([]);
  const [loading, setLoading] = useState(true);

  // Pay Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('2000');
  const [payUtr, setPayUtr] = useState('');
  const [payPeriod, setPayPeriod] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (circleId) {
      loadData();
    }
  }, [circleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const summary = await kittyPartyService.getCycleSummary(circleId);
      if (summary?.id) {
        setCycle(summary);
        setPayPeriod(String(summary.currentPeriod || 1));
        setPayAmount(String(summary.contributionAmount || 2000));
        const contribs = await kittyPartyService.getContributions(summary.id);
        setContributions(contribs || []);
      }
    } catch (e) {
      console.error('Failed to load mobile kitty ledger', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordContribution = async () => {
    if (!cycle?.id || !payUtr.trim()) {
      Alert.alert('Required', 'Please enter UPI transaction reference (UTR)');
      return;
    }

    try {
      setSubmitting(true);
      await kittyPartyService.recordContribution(cycle.id, {
        periodNumber: parseInt(payPeriod, 10),
        recordedAmount: parseFloat(payAmount),
        externalRef: payUtr.trim(),
      });
      setShowPayModal(false);
      setPayUtr('');
      Alert.alert('Success', 'Contribution payment reference recorded!');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record contribution');
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
      <Text style={styles.screenTitle}>Kitty Savings Ledger</Text>
      <Text style={styles.screenSubtitle}>
        Record-only monthly contributions and payout beneficiary rotation tracking.
      </Text>

      {!cycle ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👛</Text>
          <Text style={styles.emptyTitle}>No Active Kitty Cycle</Text>
          <Text style={styles.emptyText}>
            This circle does not have an active rotating savings cycle yet.
          </Text>
        </View>
      ) : (
        <>
          {/* Summary Banner */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>MONTHLY POOL</Text>
                <Text style={styles.summaryAmount}>
                  ₹{cycle.totalExpectedPerPeriod.toLocaleString()}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{cycle.status}</Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Per Member</Text>
                <Text style={styles.gridValue}>₹{cycle.contributionAmount}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Current Month</Text>
                <Text style={styles.gridValue}>
                  #{cycle.currentPeriod} of {cycle.memberCount}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Current Beneficiary</Text>
                <Text style={styles.gridValueHighlight}>
                  {cycle.currentBeneficiaryName || 'Assigned'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.payButton}
              onPress={() => setShowPayModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.payButtonText}>+ Record My Contribution</Text>
            </TouchableOpacity>
          </View>

          {/* Rotation Sequence */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BENEFICIARY ROTATION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rotScroll}>
              {cycle.rotations.map((r) => (
                <View
                  key={r.periodNumber}
                  style={[
                    styles.rotCard,
                    r.periodNumber === cycle.currentPeriod && styles.rotCardActive,
                  ]}
                >
                  <Text style={styles.rotPeriod}>Month #{r.periodNumber}</Text>
                  <Text style={styles.rotName} numberOfLines={1}>
                    {r.beneficiaryName}
                  </Text>
                  <Text style={styles.rotStatus}>{r.rotationStatus}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Contributions List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT ENTRIES ({contributions.length})</Text>
            <View style={styles.entriesList}>
              {contributions.length === 0 ? (
                <Text style={styles.noEntries}>No payments recorded for this period.</Text>
              ) : (
                contributions.map((c) => (
                  <View key={c.id} style={styles.entryRow}>
                    <View style={styles.entryLeft}>
                      <Text style={styles.entryName}>{c.memberName}</Text>
                      <Text style={styles.entryUtr}>UTR: {c.externalRef || 'Pending'}</Text>
                    </View>
                    <View style={styles.entryRight}>
                      <Text style={styles.entryAmount}>₹{c.recordedAmount}</Text>
                      <Text
                        style={[
                          styles.entryStatus,
                          c.paymentStatus === 'VERIFIED' && styles.entryStatusVerified,
                        ]}
                      >
                        {c.paymentStatus}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </>
      )}

      {/* Record Payment Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Contribution</Text>

            <Text style={styles.modalLabel}>PERIOD / MONTH</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={payPeriod}
              onChangeText={setPayPeriod}
            />

            <Text style={styles.modalLabel}>AMOUNT (₹)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            <Text style={styles.modalLabel}>UPI / IMPS REFERENCE (UTR) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 431092019281"
              value={payUtr}
              onChangeText={setPayUtr}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowPayModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleRecordContribution}
                disabled={submitting}
              >
                <Text style={styles.confirmBtnText}>
                  {submitting ? 'Saving...' : 'Save Entry'}
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
    borderRadius: 16,
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
    textAlign: 'center',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#BE185D',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  detailsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginBottom: 14,
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  gridValueHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#BE185D',
    marginTop: 2,
  },
  payButton: {
    backgroundColor: '#BE185D',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  rotScroll: {
    flexDirection: 'row',
  },
  rotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    width: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  rotCardActive: {
    borderColor: '#BE185D',
    backgroundColor: '#FDF2F8',
  },
  rotPeriod: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  rotName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
    marginVertical: 4,
  },
  rotStatus: {
    fontSize: 8,
    fontWeight: '700',
    color: '#BE185D',
  },
  entriesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  noEntries: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  entryLeft: {
    flex: 1,
  },
  entryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  entryUtr: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#6B7280',
    marginTop: 2,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  entryAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  entryStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 2,
  },
  entryStatusVerified: {
    color: '#16A34A',
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
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
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
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
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
