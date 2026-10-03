import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { adminService } from '@/services/adminService';
import type { BulkResidentRecord, BulkUploadJob } from '@/types/adminSecurity';

const SAMPLE_CSV = `FullName,Email,Phone,Tower,FlatNumber,OccupancyStatus,Role
Arunabh Kumar,arunabh.kumar@gmail.com,9845011223,Tower A,101,OWNER,RESIDENT
Deepa Venkataraman,deepa.v@outlook.com,9876543210,Tower A,102,TENANT,RESIDENT
Sandeep Shenoy,sandeep.shenoy@techcorp.in,9123456789,Tower B,304,OWNER,COMMITTEE_MEMBER
Meera Joshi,meera.j@gmail.com,9448088221,Tower B,305,FAMILY,RESIDENT
Karthik R (Invalid Email),karthik.invalid-email,9740033445,Tower C,502,OWNER,RESIDENT
Naveen Hegde,naveen.h@farmfresh.in,9916055442,Tower C,503,OWNER,RESIDENT`;

export default function BulkUploadScreen() {
  const router = useRouter();
  const [csvInput, setCsvInput] = useState('');
  const [parsedRecords, setParsedRecords] = useState<BulkResidentRecord[]>([]);
  const [sendInvites, setSendInvites] = useState(true);
  const [autoAssignGroups, setAutoAssignGroups] = useState(true);
  const [completedJobModal, setCompletedJobModal] = useState<BulkUploadJob | null>(null);

  const handleParse = async (textToParse: string) => {
    const records = await adminService.parseAndValidateCsv(textToParse);
    setParsedRecords(records);
  };

  const loadSample = () => {
    setCsvInput(SAMPLE_CSV);
    handleParse(SAMPLE_CSV);
  };

  const uploadMutation = useMutation({
    mutationFn: (records: BulkResidentRecord[]) => adminService.executeBulkUpload(records),
    onSuccess: (job) => {
      setCompletedJobModal(job);
    },
    onError: () => {
      Alert.alert('Upload Failed', 'Failed to process bulk upload batch. Please check your network connection.');
    },
  });

  const validCount = parsedRecords.filter((r) => r.isValid).length;
  const invalidCount = parsedRecords.filter((r) => !r.isValid).length;

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
          <Text style={styles.headerTitle}>Bulk Resident Onboarding</Text>
          <Text style={styles.headerSub}>Batch import apartment residents & dispatch invites</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Instruction Banner ──────────────────────────────────────── */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerTop}>
            <View style={styles.bannerPill}>
              <Ionicons name="document-text" size={13} color="#D1FAE5" />
              <Text style={styles.bannerPillText}>CSV BATCH INGESTION ENGINE</Text>
            </View>
            <TouchableOpacity style={styles.sampleBtn} onPress={loadSample}>
              <Ionicons name="sparkles" size={12} color="#FDE68A" />
              <Text style={styles.sampleBtnText}>Load Sample CSV</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.bannerTitle}>Fast-Track Society Onboarding</Text>
          <Text style={styles.bannerDesc}>
            Paste comma-separated rows or exported registry spreadsheet. The parser automatically validates phone numbers, email syntax, and tower allotments.
          </Text>

          <View style={styles.formatBox}>
            <Text style={styles.formatHead}>Required Column Header Order:</Text>
            <Text style={styles.formatCode}>FullName, Email, Phone, Tower, FlatNumber, OccupancyStatus, Role</Text>
          </View>
        </View>

        {/* ── CSV Text Input Area ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Paste CSV Content or Table Data</Text>
        <TextInput
          style={styles.csvInputBox}
          placeholder="Paste CSV here (e.g. Rahul Sharma, rahul@gmail.com, 9845012345, Tower A, 402, OWNER, RESIDENT)..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={6}
          value={csvInput}
          onChangeText={(txt) => {
            setCsvInput(txt);
            handleParse(txt);
          }}
        />

        {/* ── Live Validation Summary Bar ─────────────────────────────── */}
        {parsedRecords.length > 0 && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{parsedRecords.length}</Text>
              <Text style={styles.summaryLabel}>Total Rows</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: '#059669' }]}>{validCount}</Text>
              <Text style={styles.summaryLabel}>Ready to Import</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: invalidCount > 0 ? '#DC2626' : COLORS.textMuted }]}>
                {invalidCount}
              </Text>
              <Text style={styles.summaryLabel}>Flagged Errors</Text>
            </View>
          </View>
        )}

        {/* ── Onboarding Toggles ──────────────────────────────────────── */}
        {parsedRecords.length > 0 && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setSendInvites(!sendInvites)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={sendInvites ? 'checkbox' : 'square-outline'}
                size={20}
                color={sendInvites ? COLORS.primary : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Dispatch Welcome Invite Emails with temporary credentials</Text>
                <Text style={styles.toggleSub}>Residents will receive a secure magic login link & OTP setup</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setAutoAssignGroups(!autoAssignGroups)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={autoAssignGroups ? 'checkbox' : 'square-outline'}
                size={20}
                color={autoAssignGroups ? COLORS.primary : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Auto-enroll into Tower & Floor Community Channels</Text>
                <Text style={styles.toggleSub}>Instantly connects resident to their tower discussion group</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Records Table Preview ───────────────────────────────────── */}
        {parsedRecords.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionLabel}>Parsed Records Grid ({parsedRecords.length})</Text>
            <View style={styles.recordsList}>
              {parsedRecords.map((r, idx) => (
                <View
                  key={r.id || idx}
                  style={[
                    styles.recordCard,
                    !r.isValid && styles.recordCardInvalid,
                  ]}
                >
                  <View style={styles.recordTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordName}>{r.fullName || 'Missing Name'}</Text>
                      <Text style={styles.recordSub}>
                        {r.tower} · {r.flatNumber} · {r.occupancyStatus}
                      </Text>
                    </View>
                    <View style={[styles.validBadge, !r.isValid && styles.invalidBadge]}>
                      <Ionicons
                        name={r.isValid ? 'checkmark-circle' : 'alert-circle'}
                        size={12}
                        color={r.isValid ? '#059669' : '#DC2626'}
                      />
                      <Text style={[styles.validBadgeText, !r.isValid && styles.invalidBadgeText]}>
                        {r.isValid ? 'VALID' : 'FIX REQUIRED'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.recordEmail}>✉️ {r.email}</Text>
                  <Text style={styles.recordPhone}>📞 {r.phone}</Text>

                  {/* Validation Error Badges */}
                  {r.validationErrors && (
                    <View style={styles.errorsRow}>
                      {r.validationErrors.map((err, i) => (
                        <View key={i} style={styles.errorPill}>
                          <Text style={styles.errorPillText}>{err}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Execute Batch Button ────────────────────────────────────── */}
        {parsedRecords.length > 0 && (
          <TouchableOpacity
            style={[
              styles.executeBtn,
              validCount === 0 && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (validCount === 0) {
                Alert.alert('No Valid Rows', 'Please fix formatting errors in your CSV before executing.');
                return;
              }
              uploadMutation.mutate(parsedRecords);
            }}
            disabled={uploadMutation.isPending || validCount === 0}
          >
            {uploadMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                <Text style={styles.executeBtnText}>
                  Execute Bulk Import ({validCount} Valid Residents)
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Completed Summary Modal ──────────────────────────────────── */}
      <Modal visible={!!completedJobModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="checkmark-done-circle" size={54} color="#059669" />
            </View>

            <Text style={styles.modalTitle}>Bulk Onboarding Complete!</Text>
            <Text style={styles.modalSub}>
              Successfully enrolled residents into Mana Community database.
            </Text>

            {completedJobModal && (
              <View style={styles.jobStatsBox}>
                <View style={styles.jobStatRow}>
                  <Text style={styles.jobStatLabel}>Total Processed:</Text>
                  <Text style={styles.jobStatVal}>{completedJobModal.totalRows} records</Text>
                </View>
                <View style={styles.jobStatRow}>
                  <Text style={styles.jobStatLabel}>Accounts Activated:</Text>
                  <Text style={[styles.jobStatVal, { color: '#059669' }]}>
                    {completedJobModal.validRows} residents
                  </Text>
                </View>
                <View style={styles.jobStatRow}>
                  <Text style={styles.jobStatLabel}>Welcome Invites Dispatched:</Text>
                  <Text style={styles.jobStatVal}>{completedJobModal.dispatchedInvites} emails</Text>
                </View>
                {completedJobModal.invalidRows > 0 && (
                  <View style={styles.jobStatRow}>
                    <Text style={styles.jobStatLabel}>Skipped Invalid Rows:</Text>
                    <Text style={[styles.jobStatVal, { color: '#DC2626' }]}>
                      {completedJobModal.invalidRows} records
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setCompletedJobModal(null);
                router.replace('/admin/members' as any);
              }}
            >
              <Text style={styles.doneBtnText}>View Member Directory</Text>
            </TouchableOpacity>
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

  // ── Banner ────────────────────────────────────────────────────────
  bannerCard: {
    backgroundColor: '#064E3B',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  bannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  bannerPillText: { fontSize: 9, fontWeight: '800', color: '#D1FAE5' },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  sampleBtnText: { fontSize: 11, fontWeight: '800', color: '#FDE68A' },
  bannerTitle: { fontSize: 17, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  bannerDesc: { fontSize: 12, color: '#D1FAE5', lineHeight: 17, marginBottom: 10 },
  formatBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 10,
    borderRadius: RADIUS.md,
  },
  formatHead: { fontSize: 10, fontWeight: '800', color: '#FDE68A', marginBottom: 2 },
  formatCode: { fontSize: 10, fontFamily: 'monospace', color: '#FFFFFF' },

  // ── Input & Summary ───────────────────────────────────────────────
  sectionLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  csvInputBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  summaryDivider: { width: 1, height: 24, backgroundColor: COLORS.border },

  // ── Toggles ───────────────────────────────────────────────────────
  toggleContainer: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    marginBottom: 16,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  toggleTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  toggleSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  // ── Preview Grid ──────────────────────────────────────────────────
  previewSection: { marginBottom: 16 },
  recordsList: { gap: 8 },
  recordCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordCardInvalid: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  recordName: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  recordSub: { fontSize: 11, color: COLORS.textMuted },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  validBadgeText: { fontSize: 9, fontWeight: '800', color: '#065F46' },
  invalidBadge: { backgroundColor: '#FEE2E2' },
  invalidBadgeText: { color: '#DC2626' },
  recordEmail: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  recordPhone: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  errorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  errorPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  errorPillText: { fontSize: 9, fontWeight: '700', color: '#DC2626' },

  // ── Execute Button ────────────────────────────────────────────────
  executeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    ...SHADOWS.primary,
  },
  executeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  // ── Modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  modalIconBox: { marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  modalSub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  jobStatsBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 8,
    marginBottom: 18,
  },
  jobStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobStatLabel: { fontSize: 12, color: COLORS.textSecondary },
  jobStatVal: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  doneBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
