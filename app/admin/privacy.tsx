import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { adminService } from '@/services/adminService';
import type { PrivacyDataRequest, PrivacyRequestStatus } from '@/types/adminSecurity';

export default function PrivacyComplianceScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filterTab, setFilterTab] = useState<PrivacyRequestStatus | 'ALL'>('ALL');
  const [activeActionModal, setActiveActionModal] = useState<{
    request: PrivacyDataRequest;
    actionType: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [adminPin, setAdminPin] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const {
    data: requests = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['privacyRequests', filterTab],
    queryFn: () => adminService.getPrivacyRequests(filterTab),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string }) => adminService.approvePrivacyRequest(id, pin),
    onSuccess: (updatedReq) => {
      qc.invalidateQueries({ queryKey: ['privacyRequests'] });
      setActiveActionModal(null);
      setAdminPin('');
      Alert.alert(
        'Request Executed',
        updatedReq.requestType === 'DATA_ERASURE_FORGET'
          ? 'Resident personal identifiable information (PII) has been securely purged & anonymized.'
          : 'Encrypted portable data archive generated successfully.'
      );
    },
    onError: () => {
      Alert.alert('Execution Failed', 'Invalid admin PIN or insufficient dual-authorization rights.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminService.rejectPrivacyRequest(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['privacyRequests'] });
      setActiveActionModal(null);
      setRejectReason('');
      Alert.alert('Request Rejected', 'The resident has been notified of the lawful basis for request rejection.');
    },
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const completedCount = requests.filter((r) => r.status === 'COMPLETED').length;

  const getRequestTypeInfo = (type: string) => {
    switch (type) {
      case 'DATA_EXPORT_PORTABILITY':
        return { label: '📦 Data Export / Portability', bg: '#EFF6FF', text: '#1D4ED8' };
      case 'DATA_ERASURE_FORGET':
        return { label: '🗑️ Right to Erasure / Deletion', bg: '#FEE2E2', text: '#DC2626' };
      case 'CONSENT_REVOCATION':
        return { label: '🚫 Consent Revocation', bg: '#FEF3C7', text: '#B45309' };
      default:
        return { label: '📝 Data Rectification', bg: '#EDE9FE', text: '#6D28D9' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>DPDP & GDPR Privacy Hub</Text>
          <Text style={styles.headerSub}>Data portability, consent logs & erasure requests</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ── Compliance Hero Banner ──────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Ionicons name="shield-checkmark" size={13} color="#D1FAE5" />
              <Text style={styles.heroPillText}>DPDP ACT 2023 & GDPR COMPLIANT</Text>
            </View>
            <View style={styles.slaBadge}>
              <Text style={styles.slaText}>30-Day SLA Tracked</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Resident Data Rights & Privacy Desk</Text>
          <Text style={styles.heroDesc}>
            Manage statutory data subject access requests (DSAR). Dual-admin authorization is mandatory for irreversible account purging and PII erasure.
          </Text>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricNum, { color: '#FDE68A' }]}>{pendingCount}</Text>
              <Text style={styles.metricLabel}>Pending Action</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNum, { color: '#6EE7B7' }]}>{completedCount}</Text>
              <Text style={styles.metricLabel}>Processed</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNum}>100%</Text>
              <Text style={styles.metricLabel}>SLA Compliance</Text>
            </View>
          </View>
        </View>

        {/* ── Filter Tabs ────────────────────────────────────────────── */}
        <View style={styles.tabRow}>
          {[
            { key: 'ALL', label: 'All Requests' },
            { key: 'PENDING_APPROVAL', label: `Pending (${pendingCount})` },
            { key: 'COMPLETED', label: `Completed (${completedCount})` },
          ].map((tab) => {
            const isSel = filterTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, isSel && styles.tabBtnActive]}
                onPress={() => setFilterTab(tab.key as any)}
              >
                <Text style={[styles.tabBtnText, isSel && styles.tabBtnTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Request Cards List ──────────────────────────────────────── */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <View style={styles.requestsList}>
            {requests.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Privacy Requests</Text>
                <Text style={styles.emptySub}>All resident data portability and erasure requests have been processed.</Text>
              </View>
            ) : (
              requests.map((req) => {
                const typeInfo = getRequestTypeInfo(req.requestType);
                const isPending = req.status === 'PENDING_APPROVAL';
                const isCompleted = req.status === 'COMPLETED';

                return (
                  <View key={req.id} style={styles.reqCard}>
                    {/* Top Row: Type & Framework */}
                    <View style={styles.reqHeader}>
                      <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: typeInfo.text }]}>{typeInfo.label}</Text>
                      </View>
                      <View style={styles.frameworkBadge}>
                        <Text style={styles.frameworkText}>{req.framework.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>

                    {/* Resident Info */}
                    <View style={styles.residentBox}>
                      <Text style={styles.residentName}>{req.userName}</Text>
                      <Text style={styles.residentMeta}>
                        {req.userFlat} · {req.userEmail} · User ID #{req.userId}
                      </Text>
                    </View>

                    {/* Reason / Statement */}
                    {req.reason && (
                      <View style={styles.reasonBox}>
                        <Text style={styles.reasonHead}>Resident Statement:</Text>
                        <Text style={styles.reasonText}>"{req.reason}"</Text>
                      </View>
                    )}

                    {/* Data Summary (What will be exported / erased) */}
                    {req.dataSummary && (
                      <View style={styles.dataSummaryBox}>
                        <Text style={styles.dataSummaryHead}>Associated Data Scope:</Text>
                        <View style={styles.dataSummaryChips}>
                          <Text style={styles.dataChip}>{req.dataSummary.postsCount} Feed Posts</Text>
                          <Text style={styles.dataChip}>{req.dataSummary.paymentsCount} Ledger Records</Text>
                          <Text style={styles.dataChip}>{req.dataSummary.bookingsCount} Amenity Bookings</Text>
                        </View>
                      </View>
                    )}

                    {/* Timestamps & SLA */}
                    <View style={styles.timingRow}>
                      <View style={styles.timingItem}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.timingText}>
                          Requested: {new Date(req.requestedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.timingItem}>
                        <Ionicons name="hourglass-outline" size={12} color="#D97706" />
                        <Text style={[styles.timingText, { color: '#D97706', fontWeight: '700' }]}>
                          Due by: {new Date(req.dueBy).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    {/* Dual Admin Signoffs */}
                    <View style={styles.signoffRow}>
                      <Text style={styles.signoffLabel}>Dual-Admin Signoffs:</Text>
                      <Text style={styles.signoffVal}>
                        {req.dualAdminSignoffs.length > 0
                          ? req.dualAdminSignoffs.join(', ')
                          : 'Awaiting 1st Admin Signoff'}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    {isPending && (
                      <View style={styles.actionBtnRow}>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => setActiveActionModal({ request: req, actionType: 'REJECT' })}
                        >
                          <Ionicons name="close" size={14} color="#DC2626" />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.approveBtn,
                            req.requestType === 'DATA_ERASURE_FORGET' && { backgroundColor: '#DC2626' },
                          ]}
                          onPress={() => setActiveActionModal({ request: req, actionType: 'APPROVE' })}
                        >
                          <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                          <Text style={styles.approveBtnText}>
                            {req.requestType === 'DATA_ERASURE_FORGET' ? 'Authorize Erasure' : 'Approve & Export'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Download Package Button for completed exports */}
                    {isCompleted && req.downloadUrl && (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => {
                          Alert.alert('Encrypted Archive', 'Download link ready: ' + req.downloadUrl);
                        }}
                      >
                        <Ionicons name="download-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.downloadBtnText}>Download Export Archive (.ZIP)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Dual-Admin PIN Authorization Modal ───────────────────────── */}
      <Modal visible={!!activeActionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {activeActionModal?.actionType === 'APPROVE'
                    ? activeActionModal.request.requestType === 'DATA_ERASURE_FORGET'
                      ? 'Confirm Irreversible PII Erasure'
                      : 'Authorize Data Export Archive'
                    : 'Reject Privacy Request'}
                </Text>
                <Text style={styles.modalSub}>
                  Resident: {activeActionModal?.request.userName} ({activeActionModal?.request.userFlat})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveActionModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {activeActionModal?.actionType === 'APPROVE' ? (
              <View>
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text style={styles.warningText}>
                    {activeActionModal.request.requestType === 'DATA_ERASURE_FORGET'
                      ? 'CAUTION: This action will permanently purge user logs, biometric gate passes, and anonymize community ledger records under India DPDP Act 2023. This cannot be undone.'
                      : 'This action will generate a password-protected ZIP archive containing all user profile details, ledger transactions, and media assets.'}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Enter SuperAdmin PIN to Sign Off *</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="••••"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
                  value={adminPin}
                  onChangeText={setAdminPin}
                />

                <TouchableOpacity
                  style={[
                    styles.confirmActionBtn,
                    activeActionModal.request.requestType === 'DATA_ERASURE_FORGET' && { backgroundColor: '#DC2626' },
                    !adminPin && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (!adminPin) {
                      Alert.alert('Required', 'Please enter your Admin PIN.');
                      return;
                    }
                    approveMutation.mutate({
                      id: activeActionModal.request.id,
                      pin: adminPin,
                    });
                  }}
                  disabled={!adminPin || approveMutation.isPending}
                >
                  <Text style={styles.confirmActionBtnText}>
                    Confirm Sign-off & Execute
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.inputLabel}>Lawful Basis / Justification for Rejection *</Text>
                <TextInput
                  style={[styles.pinInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="e.g. Active dispute / pending society maintenance arrears under Section 8..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={rejectReason}
                  onChangeText={setRejectReason}
                />

                <TouchableOpacity
                  style={[styles.confirmActionBtn, { backgroundColor: '#DC2626' }, !rejectReason && { opacity: 0.5 }]}
                  onPress={() => {
                    if (!rejectReason.trim()) {
                      Alert.alert('Required', 'Please state the lawful basis for rejection.');
                      return;
                    }
                    rejectMutation.mutate({
                      id: activeActionModal!.request.id,
                      reason: rejectReason,
                    });
                  }}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                >
                  <Text style={styles.confirmActionBtnText}>Reject Request & Notify Resident</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textMuted },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  // ── Hero Banner ───────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#1E1B4B',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  heroPillText: { fontSize: 9, fontWeight: '800', color: '#D1FAE5' },
  slaBadge: { backgroundColor: '#312E81', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  slaText: { fontSize: 9, fontWeight: '800', color: '#C7D2FE' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  heroDesc: { fontSize: 12, color: '#C7D2FE', lineHeight: 17, marginBottom: 12 },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.22)',
    padding: 10,
    borderRadius: RADIUS.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: { alignItems: 'center' },
  metricNum: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  metricLabel: { fontSize: 9, color: '#C7D2FE', marginTop: 1 },
  metricDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.18)' },

  // ── Tabs ──────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: RADIUS.md },
  tabBtnActive: { backgroundColor: COLORS.primaryLight },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.primary, fontWeight: '800' },

  // ── Requests List ─────────────────────────────────────────────────
  requestsList: { gap: SPACING.md },
  reqCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  frameworkBadge: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.xs },
  frameworkText: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  residentBox: { marginBottom: 8 },
  residentName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  residentMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  reasonBox: { backgroundColor: COLORS.surfaceAlt, padding: 8, borderRadius: RADIUS.md, marginBottom: 8 },
  reasonHead: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  reasonText: { fontSize: 11, color: COLORS.text, fontStyle: 'italic', marginTop: 2 },
  dataSummaryBox: { marginBottom: 8 },
  dataSummaryHead: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, marginBottom: 4 },
  dataSummaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dataChip: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.xs, fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  timingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  timingItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timingText: { fontSize: 10, color: COLORS.textMuted },
  signoffRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  signoffLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  signoffVal: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  actionBtnRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  rejectBtnText: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  approveBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    marginTop: 4,
  },
  downloadBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  // ── Empty State ───────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // ── Modal ─────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  modalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  warningText: { fontSize: 11, color: '#991B1B', lineHeight: 16, flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  pinInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 16,
  },
  confirmActionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
