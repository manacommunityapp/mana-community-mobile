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
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';
import type {
  KittyPartyCycle,
  KittyPartyContribution,
  KittyPartyAuditLog,
  KittyPartyDispute,
  MonthlyStatementResponse,
  KittyPartyMember,
} from '@/types/kittyPartyTypes';

export default function KittyPartyLedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const circleId = Number(id);

  const [cycle, setCycle] = useState<KittyPartyCycle | null>(null);
  const [contributions, setContributions] = useState<KittyPartyContribution[]>([]);
  const [members, setMembers] = useState<KittyPartyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Pay Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('2000');
  const [payUtr, setPayUtr] = useState('');
  const [payReceiptUrl, setPayReceiptUrl] = useState('');
  const [payPeriod, setPayPeriod] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  // Modals for the 8 features
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<KittyPartyAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputes, setDisputes] = useState<KittyPartyDispute[]>([]);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [newDisputeTitle, setNewDisputeTitle] = useState('');
  const [newDisputeDesc, setNewDisputeDesc] = useState('');
  const [newDisputeType, setNewDisputeType] = useState('PAYMENT_UNRECOGNIZED');

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapFrom, setSwapFrom] = useState('1');
  const [swapTo, setSwapTo] = useState('2');
  const [swapReason, setSwapReason] = useState('');

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceOldId, setReplaceOldId] = useState('');
  const [replaceNewId, setReplaceNewId] = useState('');
  const [replaceReason, setReplaceReason] = useState('');

  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statement, setStatement] = useState<MonthlyStatementResponse | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  useEffect(() => {
    if (circleId) {
      loadData();
    }
  }, [circleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersData] = await Promise.all([
        kittyPartyService.getCircleMembers(circleId).catch(() => []),
      ]);
      setMembers(membersData || []);

      let summary: KittyPartyCycle | null = null;
      try {
        summary = await kittyPartyService.getCircleActiveCycle(circleId);
      } catch {
        // fallback
      }
      if (!summary?.id) {
        summary = await kittyPartyService.getCycleSummary(circleId);
      }
      if (summary?.id) {
        setCycle(summary);
        setPayPeriod(String(summary.currentPeriod || 1));
        setPayAmount(String(summary.contributionAmount || 2000));
        setSwapFrom(String(summary.currentPeriod || 1));
        setSwapTo(String(Math.min((summary.currentPeriod || 1) + 1, summary.memberCount)));
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
        receiptUrl: payReceiptUrl.trim() || undefined,
      });
      setShowPayModal(false);
      setPayUtr('');
      setPayReceiptUrl('');
      Alert.alert('Success', 'Contribution payment reference recorded!');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayViaUpi = async () => {
    if (!cycle) return;
    const upiDeeplink = cycle.upiDeeplink;
    const beneficiaryName = cycle.currentBeneficiaryName || 'Beneficiary';
    const amount = cycle.contributionAmount;

    if (upiDeeplink) {
      try {
        const supported = await Linking.canOpenURL(upiDeeplink);
        if (supported) {
          await Linking.openURL(upiDeeplink);
          return;
        }
      } catch (err) {
        console.warn('Cannot open UPI deep link directly', err);
      }
    }

    Alert.alert(
      '⚡ Pay via UPI',
      `Beneficiary: ${beneficiaryName}\nAmount: ₹${amount}\nUPI ID: ${cycle.beneficiaryUpiId || 'beneficiary@upi'}`,
      [
        {
          text: 'Open UPI Apps',
          onPress: () => {
            if (upiDeeplink) Linking.openURL(upiDeeplink);
          },
        },
        {
          text: 'Record UTR & Receipt',
          onPress: () => setShowPayModal(true),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Feature 3: Send Reminders
  const handleSendReminders = async () => {
    if (!cycle?.id) return;
    try {
      setSubmitting(true);
      const res = await kittyPartyService.sendReminders(cycle.id, cycle.currentPeriod);
      Alert.alert(
        'Reminders Sent',
        `Dispatched payment notifications to ${res.remindedCount} members:\n${res.remindedMembers.join(', ') || 'None pending'}`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send reminders');
    } finally {
      setSubmitting(false);
    }
  };

  // Feature 8: Open Audit Trail
  const openAuditTrail = async () => {
    if (!cycle?.id) return;
    setShowAuditModal(true);
    try {
      setAuditLoading(true);
      const data = await kittyPartyService.getAuditTrail(cycle.id);
      setAuditLogs(data || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load audit history');
    } finally {
      setAuditLoading(false);
    }
  };

  // Feature 6: Open Disputes
  const openDisputes = async () => {
    setShowDisputeModal(true);
    try {
      setDisputeLoading(true);
      const data = await kittyPartyService.getDisputes(circleId);
      setDisputes(data || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load disputes');
    } finally {
      setDisputeLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!newDisputeTitle.trim() || !newDisputeDesc.trim()) {
      Alert.alert('Required', 'Please fill in title and description');
      return;
    }
    try {
      setSubmitting(true);
      await kittyPartyService.createDispute(circleId, {
        cycleId: cycle?.id,
        disputeType: newDisputeType,
        title: newDisputeTitle.trim(),
        description: newDisputeDesc.trim(),
      });
      setNewDisputeTitle('');
      setNewDisputeDesc('');
      Alert.alert('Submitted', 'Your grievance has been logged for admin review.');
      openDisputes();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to raise dispute');
    } finally {
      setSubmitting(false);
    }
  };

  // Feature 2: Swap Rotation
  const handleSwapRotation = async () => {
    if (!cycle?.id || !swapReason.trim()) {
      Alert.alert('Required', 'Please enter reason for rotation swap');
      return;
    }
    try {
      setSubmitting(true);
      await kittyPartyService.swapRotation(cycle.id, {
        fromPeriod: parseInt(swapFrom, 10),
        toPeriod: parseInt(swapTo, 10),
        reason: swapReason.trim(),
      });
      setShowSwapModal(false);
      setSwapReason('');
      Alert.alert('Success', `Swapped turn between Month ${swapFrom} and Month ${swapTo}`);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to swap turn');
    } finally {
      setSubmitting(false);
    }
  };

  // Feature 5: Replace Member
  const handleReplaceMember = async () => {
    if (!cycle?.id || !replaceOldId || !replaceNewId || !replaceReason.trim()) {
      Alert.alert('Required', 'Please fill in all member replacement fields');
      return;
    }
    try {
      setSubmitting(true);
      await kittyPartyService.replaceMember(cycle.id, {
        oldUserId: parseInt(replaceOldId, 10),
        newUserId: parseInt(replaceNewId, 10),
        reason: replaceReason.trim(),
      });
      setShowReplaceModal(false);
      setReplaceOldId('');
      setReplaceNewId('');
      setReplaceReason('');
      Alert.alert('Success', 'Member replaced in future rotations!');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to replace member');
    } finally {
      setSubmitting(false);
    }
  };

  // Feature 7: Open Statement View
  const openStatement = async () => {
    if (!cycle?.id) return;
    setShowStatementModal(true);
    try {
      setStatementLoading(true);
      const data = await kittyPartyService.getStatement(cycle.id, cycle.currentPeriod);
      setStatement(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load statement');
    } finally {
      setStatementLoading(false);
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
        Record-only monthly contributions, fixed rotation order, and immutable financial audit trail.
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
          {/* Quick Actions Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsBar}>
            <TouchableOpacity style={styles.actionPill} onPress={openStatement}>
              <Text style={styles.actionPillText}>📥 Statement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionPill, styles.actionPillIndigo]} onPress={openAuditTrail}>
              <Text style={[styles.actionPillText, { color: '#4338CA' }]}>🔒 Audit Trail</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionPill, styles.actionPillRose]} onPress={openDisputes}>
              <Text style={[styles.actionPillText, { color: '#BE123C' }]}>⚖️ Disputes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionPill, styles.actionPillAmber]} onPress={handleSendReminders}>
              <Text style={[styles.actionPillText, { color: '#B45309' }]}>🔔 Remind Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={() => setShowSwapModal(true)}>
              <Text style={styles.actionPillText}>⇄ Swap Turn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={() => setShowReplaceModal(true)}>
              <Text style={styles.actionPillText}>👥 Replace</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Indicator 7: Full Cycle Progress Banner */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.indicatorBadge}>INDICATOR 7 • CYCLE PROGRESS</Text>
                <Text style={styles.progressTitle}>
                  Progress: {cycle.cycleProgressPercent || Math.round((cycle.currentPeriod / cycle.memberCount) * 100)}%
                </Text>
              </View>
              <Text style={styles.progressSubtitle}>
                Month #{cycle.currentPeriod} of {cycle.memberCount}
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.max(5, cycle.cycleProgressPercent || (cycle.currentPeriod / cycle.memberCount) * 100))}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Indicators 1-6: KPI Cards Grid */}
          <View style={styles.indicatorsGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>1. TOTAL EXPECTED</Text>
              <Text style={styles.kpiValue}>₹{cycle.totalExpectedPerPeriod?.toLocaleString()}</Text>
              <Text style={styles.kpiSub}>Cycle: ₹{(cycle.totalExpectedFullCycle || (cycle.totalExpectedPerPeriod * cycle.memberCount))?.toLocaleString()}</Text>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardGreen]}>
              <Text style={[styles.kpiLabel, { color: '#15803D' }]}>2. TOTAL COLLECTED</Text>
              <Text style={[styles.kpiValue, { color: '#166534' }]}>₹{(cycle.totalCollectedCurrentPeriod || 0)?.toLocaleString()}</Text>
              <Text style={styles.kpiSub}>Cycle: ₹{(cycle.totalCollectedFullCycle || 0)?.toLocaleString()}</Text>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardAmber]}>
              <Text style={[styles.kpiLabel, { color: '#B45309' }]}>3. PENDING CONTRIB.</Text>
              <Text style={[styles.kpiValue, { color: '#92400E' }]}>
                ₹{(cycle.pendingContributionsAmount != null ? cycle.pendingContributionsAmount : Math.max(0, cycle.totalExpectedPerPeriod - (cycle.totalCollectedCurrentPeriod || 0)))?.toLocaleString()}
              </Text>
              <Text style={styles.kpiSub}>
                {cycle.pendingContributionsCount ?? (cycle.memberCount - (cycle.paidContributionsCount || 0))} pending
              </Text>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardPink]}>
              <Text style={[styles.kpiLabel, { color: '#BE185D' }]}>4. CURRENT BENEFICIARY</Text>
              <Text style={[styles.kpiValue, { color: '#BE185D' }]} numberOfLines={1}>
                {cycle.currentBeneficiaryName || 'Assigned'}
              </Text>
              <Text style={styles.kpiSub}>Month #{cycle.currentPeriod} Payout</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>5. PREVIOUS PAYOUTS</Text>
              <Text style={styles.kpiValue}>
                {cycle.previousPayoutsCount ?? (cycle.currentPeriod > 1 ? cycle.currentPeriod - 1 : 0)} Disbursed
              </Text>
              <Text style={styles.kpiSub}>
                ₹{(cycle.previousPayoutsTotalAmount || ((cycle.currentPeriod > 1 ? cycle.currentPeriod - 1 : 0) * cycle.totalExpectedPerPeriod))?.toLocaleString()}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>6. NEXT BENEFICIARY</Text>
              <Text style={[styles.kpiValue, { color: '#7E22CE' }]} numberOfLines={1}>
                {cycle.nextBeneficiaryName || (cycle.rotations?.find((r) => r.periodNumber === cycle.currentPeriod + 1)?.beneficiaryName) || 'Cycle End'}
              </Text>
              <Text style={styles.kpiSub}>Month #{cycle.currentPeriod + 1} Schedule</Text>
            </View>
          </View>

          {/* Feature 4: Late Payment Alert Banner */}
          {(cycle.overdueContributionsCount ?? 0) > 0 && (
            <View style={styles.overdueBanner}>
              <Text style={styles.overdueText}>
                ⚠️ {cycle.overdueContributionsCount} contribution(s) amounting to ₹{cycle.overdueContributionsAmount?.toLocaleString()} are overdue beyond the grace period.
              </Text>
            </View>
          )}

          {/* Direct UPI Payment & Record Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
            <TouchableOpacity
              style={[styles.payButton, { flex: 1, backgroundColor: '#059669' }]}
              onPress={handlePayViaUpi}
              activeOpacity={0.8}
            >
              <Text style={styles.payButtonText}>⚡ Pay via UPI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payButton, { flex: 1 }]}
              onPress={() => setShowPayModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.payButtonText}>+ Record UTR</Text>
            </TouchableOpacity>
          </View>

          {/* Feature 1 & 2: Beneficiary Rotation Sequence */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>FIXED ROTATION CALENDAR</Text>
              <Text style={styles.fixedBadge}>🔒 Fixed Order</Text>
            </View>
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
                  <Text style={[
                    styles.rotStatus,
                    r.rotationStatus === 'SWAPPED' && { color: '#7E22CE', fontWeight: 'bold' }
                  ]}>
                    {r.rotationStatus}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Feature 4 & 8: Contributions with Receipts & Late Badges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              CONTRIBUTIONS & RECEIPTS ({contributions.length})
            </Text>
            <View style={styles.entriesList}>
              {contributions.length === 0 ? (
                <Text style={styles.noEntries}>No payments recorded for this period.</Text>
              ) : (
                contributions.map((c) => (
                  <View key={c.id} style={styles.entryRow}>
                    <View style={styles.entryLeft}>
                      <Text style={styles.entryName}>{c.memberName}</Text>
                      <Text style={styles.entryUtr}>UTR: {c.externalRef || 'Pending'}</Text>
                      {c.receiptUrl ? (
                        <TouchableOpacity
                          style={styles.receiptBadge}
                          onPress={() => {
                            if (c.receiptUrl) Linking.openURL(c.receiptUrl);
                          }}
                        >
                          <Text style={styles.receiptBadgeText}>📄 View Receipt</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.entryRight}>
                      <Text style={styles.entryAmount}>₹{c.recordedAmount || c.expectedAmount}</Text>
                      <View style={[
                        styles.statusPill,
                        c.paymentStatus === 'VERIFIED' && styles.statusVerified,
                        c.paymentStatus === 'PAID' && styles.statusPaid,
                      ]}>
                        <Text style={styles.statusText}>{c.paymentStatus}</Text>
                      </View>
                      {c.isOverdue && (
                        <View style={styles.overdueBadge}>
                          <Text style={styles.overdueBadgeText}>Overdue ({c.daysOverdue}d)</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </>
      )}

      {/* Record Contribution Modal */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Contribution</Text>
            <Text style={styles.inputLabel}>Period / Month</Text>
            <TextInput
              style={styles.input}
              value={payPeriod}
              onChangeText={setPayPeriod}
              keyboardType="number-pad"
            />
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputLabel}>UPI UTR / Bank Reference</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 402918239012"
              value={payUtr}
              onChangeText={setPayUtr}
            />
            <Text style={styles.inputLabel}>Receipt URL (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://.../receipt.jpg"
              value={payReceiptUrl}
              onChangeText={setPayReceiptUrl}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPayModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRecordContribution}
                disabled={submitting}
              >
                <Text style={styles.submitText}>
                  {submitting ? 'Saving...' : 'Submit Payment'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feature 8: Audit Trail Modal */}
      <Modal visible={showAuditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.modalTitle}>🔒 Immutable Audit Trail</Text>
              <TouchableOpacity onPress={() => setShowAuditModal(false)}>
                <Text style={{ fontSize: 18, color: '#6B7280' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              SHA-256 chained chronological records for Chit Funds Act 1982 non-custodial compliance.
            </Text>

            {auditLoading ? (
              <ActivityIndicator size="small" color="#BE185D" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ marginTop: 10 }}>
                {auditLogs.length === 0 ? (
                  <Text style={styles.noEntries}>No audit logs found.</Text>
                ) : (
                  auditLogs.map((log) => (
                    <View key={log.id} style={styles.auditCard}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.auditEvent}>{log.eventType}</Text>
                        <Text style={styles.auditDate}>
                          {new Date(log.createdAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <Text style={styles.auditDesc}>{log.description}</Text>
                      <Text style={styles.auditHash} numberOfLines={1}>
                        Hash: {log.currHash}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 15, alignSelf: 'center', width: '100%' }]}
              onPress={() => setShowAuditModal(false)}
            >
              <Text style={styles.cancelText}>Close Audit Trail</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feature 6: Disputes Modal */}
      <Modal visible={showDisputeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.modalTitle}>⚖️ Circle Disputes</Text>
              <TouchableOpacity onPress={() => setShowDisputeModal(false)}>
                <Text style={{ fontSize: 18, color: '#6B7280' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Raise New Dispute Section */}
            <View style={styles.disputeFormBox}>
              <Text style={styles.inputLabel}>Dispute Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Payment unacknowledged"
                value={newDisputeTitle}
                onChangeText={setNewDisputeTitle}
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Details of the issue..."
                value={newDisputeDesc}
                onChangeText={setNewDisputeDesc}
              />
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#BE123C', marginTop: 5 }]}
                onPress={handleCreateDispute}
                disabled={submitting}
              >
                <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Raise Grievance'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 10 }}>
              {disputeLoading ? (
                <ActivityIndicator size="small" color="#BE185D" />
              ) : disputes.length === 0 ? (
                <Text style={styles.noEntries}>No complaints logged.</Text>
              ) : (
                disputes.map((d) => (
                  <View key={d.id} style={styles.auditCard}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={[styles.auditEvent, { color: '#BE123C' }]}>{d.status}</Text>
                      <Text style={styles.auditDate}>{d.disputeType}</Text>
                    </View>
                    <Text style={[styles.auditDesc, { fontWeight: 'bold' }]}>{d.title}</Text>
                    <Text style={styles.auditDesc}>{d.description}</Text>
                    {d.resolutionNotes ? (
                      <Text style={[styles.auditDesc, { color: '#15803D', fontStyle: 'italic' }]}>
                        Resolution: {d.resolutionNotes}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Feature 2: Swap Turn Modal */}
      <Modal visible={showSwapModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⇄ Admin Swap Turn</Text>
            <Text style={styles.modalSub}>Exchange rotation turn between two cycle months.</Text>
            <Text style={styles.inputLabel}>From Month</Text>
            <TextInput
              style={styles.input}
              value={swapFrom}
              onChangeText={setSwapFrom}
              keyboardType="number-pad"
            />
            <Text style={styles.inputLabel}>To Month</Text>
            <TextInput
              style={styles.input}
              value={swapTo}
              onChangeText={setSwapTo}
              keyboardType="number-pad"
            />
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mutual consent for emergency..."
              value={swapReason}
              onChangeText={setSwapReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSwapModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSwapRotation} disabled={submitting}>
                <Text style={styles.submitText}>{submitting ? 'Swapping...' : 'Confirm Swap'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feature 5: Replace Member Modal — member picker */}
      <Modal visible={showReplaceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>👥 Replace Member</Text>
            <Text style={styles.modalSub}>Transfer future rotations and contributions to a substitute.</Text>

            <Text style={styles.inputLabel}>Withdrawing Member</Text>
            <ScrollView style={styles.memberPickerList} nestedScrollEnabled>
              {members.filter((m) => m.membershipStatus === 'ACTIVE').map((m) => (
                <TouchableOpacity
                  key={m.memberId}
                  style={[
                    styles.memberPickerRow,
                    replaceOldId === String(m.userId) && styles.memberPickerRowSelected,
                  ]}
                  onPress={() => setReplaceOldId(String(m.userId))}
                >
                  <View style={styles.memberPickerAvatar}>
                    <Text style={styles.memberPickerAvatarText}>{m.fullName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberPickerName}>{m.fullName}</Text>
                    {m.flatUnit && <Text style={styles.memberPickerFlat}>🏢 {m.flatUnit}</Text>}
                  </View>
                  {replaceOldId === String(m.userId) && (
                    <Text style={styles.memberPickerCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Incoming Substitute (pick from circle or enter ID)</Text>
            <ScrollView style={styles.memberPickerList} nestedScrollEnabled>
              {members.filter((m) => m.membershipStatus === 'ACTIVE' && String(m.userId) !== replaceOldId).map((m) => (
                <TouchableOpacity
                  key={m.memberId}
                  style={[
                    styles.memberPickerRow,
                    replaceNewId === String(m.userId) && styles.memberPickerRowSelected,
                  ]}
                  onPress={() => setReplaceNewId(String(m.userId))}
                >
                  <View style={styles.memberPickerAvatar}>
                    <Text style={styles.memberPickerAvatarText}>{m.fullName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberPickerName}>{m.fullName}</Text>
                    {m.flatUnit && <Text style={styles.memberPickerFlat}>🏢 {m.flatUnit}</Text>}
                  </View>
                  {replaceNewId === String(m.userId) && (
                    <Text style={styles.memberPickerCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.inputLabel, { marginTop: 6, color: '#9CA3AF' }]}>Or type a User ID for someone outside this circle</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10045"
              value={replaceNewId}
              onChangeText={setReplaceNewId}
              keyboardType="number-pad"
            />
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={styles.input}
              placeholder="Reason for replacement..."
              value={replaceReason}
              onChangeText={setReplaceReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowReplaceModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#111827' }]} onPress={handleReplaceMember} disabled={submitting}>
                <Text style={styles.submitText}>{submitting ? 'Replacing...' : 'Confirm Replace'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feature 7: Monthly Statement Modal */}
      <Modal visible={showStatementModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.modalTitle}>📥 Monthly Statement</Text>
              <TouchableOpacity onPress={() => setShowStatementModal(false)}>
                <Text style={{ fontSize: 18, color: '#6B7280' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {statementLoading || !statement ? (
              <ActivityIndicator size="small" color="#BE185D" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ marginTop: 10 }}>
                <View style={styles.statementSummaryBox}>
                  <Text style={styles.statementCircle}>{statement.circleName}</Text>
                  <Text style={styles.statementPeriod}>Period #{statement.periodNumber} • Due: {statement.periodDueDate}</Text>
                  <Text style={styles.statementBeneficiary}>Beneficiary: {statement.beneficiaryName}</Text>
                  <Text style={styles.statementExpected}>Expected: ₹{statement.totalExpected} | Collected: ₹{statement.totalCollected}</Text>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>MEMBER ENTRIES ({statement.lineItems?.length || 0})</Text>
                {statement.lineItems?.map((item) => (
                  <View key={item.memberUserId} style={styles.statementItemRow}>
                    <Text style={styles.entryName}>{item.memberName}</Text>
                    <Text style={styles.entryAmount}>₹{item.recordedAmount || item.expectedAmount} ({item.paymentStatus})</Text>
                  </View>
                ))}

                <Text style={styles.disclaimerText}>{statement.legalDisclaimer}</Text>
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 15, alignSelf: 'center', width: '100%' }]}
              onPress={() => setShowStatementModal(false)}
            >
              <Text style={styles.cancelText}>Close Statement</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  actionsBar: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  actionPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  actionPillIndigo: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  actionPillRose: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
  },
  actionPillAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  progressCard: {
    backgroundColor: '#BE185D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  indicatorBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FCE7F3',
    letterSpacing: 0.5,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  progressSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FCE7F3',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  kpiCardGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  kpiCardAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  kpiCardPink: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  overdueBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  overdueText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: '#BE185D',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  fixedBadge: {
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rotScroll: {
    flexDirection: 'row',
  },
  rotCard: {
    width: 100,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    marginRight: 8,
  },
  rotCardActive: {
    borderColor: '#BE185D',
    backgroundColor: '#FDF2F8',
    borderWidth: 2,
  },
  rotPeriod: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  rotName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  rotStatus: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 4,
  },
  entriesList: {
    marginTop: 6,
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
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  entryLeft: {
    flex: 1,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  entryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  entryUtr: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  entryAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  receiptBadge: {
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  receiptBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BE185D',
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusPaid: {
    backgroundColor: '#DBEAFE',
  },
  statusVerified: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#374151',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  overdueBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#BE185D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  submitText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  auditCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  auditEvent: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
  },
  auditDate: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  auditDesc: {
    fontSize: 11,
    color: '#1F2937',
    marginTop: 2,
  },
  auditHash: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#059669',
    marginTop: 4,
  },
  disputeFormBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  statementSummaryBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 10,
  },
  statementCircle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  statementPeriod: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 2,
  },
  statementBeneficiary: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE185D',
    marginTop: 4,
  },
  statementExpected: {
    fontSize: 10,
    color: '#374151',
    marginTop: 2,
  },
  statementItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  disclaimerText: {
    fontSize: 9,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 12,
  },
  memberPickerList: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 4,
  },
  memberPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberPickerRowSelected: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
  },
  memberPickerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberPickerAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#BE185D',
  },
  memberPickerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  memberPickerFlat: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  memberPickerCheck: {
    fontSize: 14,
    fontWeight: '800',
    color: '#BE185D',
    marginLeft: 8,
  },
});
