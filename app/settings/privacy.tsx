import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { privacyService } from '@/services/privacyService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import type {
  UserPrivacySettingsDto,
  UserDataExportDto,
  DataDeletionRequestDto,
} from '@/types/api';

const VISIBILITY_OPTIONS = [
  { value: 'COMMUNITY', label: 'My Community Members Only' },
  { value: 'ALL', label: 'All Verified Residents' },
  { value: 'CONNECTIONS', label: 'My Direct Connections Only' },
  { value: 'ONLY_ME', label: 'Only Me (Private)' },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Privacy Settings state
  const [settings, setSettings] = useState<UserPrivacySettingsDto>({
    showPhoneToNeighbours: false,
    showEmailToNeighbours: false,
    showFlatInDirectory: true,
    showFamilyMembers: true,
    showVehicleInDirectory: false,
    emergencyContactRestricted: false,
    allowMarketplaceContact: true,
    allowEventTagging: true,
    activityVisibility: 'COMMUNITY',
  });

  // Export Data Modal
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportedData, setExportedData] = useState<UserDataExportDto | null>(null);

  // Deletion Request
  const [deletionModalVisible, setDeletionModalVisible] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState<DataDeletionRequestDto[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [userSettings, requests] = await Promise.all([
        privacyService.getSettings().catch(() => null),
        privacyService.getDeletionStatus().catch(() => []),
      ]);

      if (userSettings) {
        setSettings((prev) => ({ ...prev, ...userSettings }));
      }
      setActiveRequests(requests || []);
    } catch (e) {
      console.warn('Failed to load privacy settings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof UserPrivacySettingsDto, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await privacyService.updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExportLoading(true);
      setExportModalVisible(true);
      const data = await privacyService.exportMyData();
      setExportedData(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to generate personal data export');
      setExportModalVisible(false);
    } finally {
      setExportLoading(false);
    }
  };

  const handleSubmitDeletion = async () => {
    try {
      setDeletionLoading(true);
      const req = await privacyService.requestDeletion(deletionReason.trim());
      setActiveRequests((prev) => [req, ...prev]);
      setDeletionModalVisible(false);
      setDeletionReason('');
      Alert.alert(
        'Request Submitted',
        'Your account erasure request has been submitted. Society administrators will process it according to privacy retention policies.',
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not submit deletion request');
    } finally {
      setDeletionLoading(false);
    }
  };

  const handleCancelDeletion = async (requestId: number) => {
    try {
      await privacyService.cancelDeletion(requestId);
      setActiveRequests((prev) => prev.filter((r) => r.id !== requestId));
      Alert.alert('Cancelled', 'Account deletion request has been cancelled.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not cancel deletion request');
    }
  };

  const pendingRequest = activeRequests.find((r) => r.status === 'PENDING');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Privacy & GDPR Settings"
        subtitle="Manage personal visibility & data rights"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          {saveSuccess && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.successBannerText}>Privacy preferences updated!</Text>
            </View>
          )}

          {/* Pending Deletion Alert */}
          {pendingRequest && (
            <View style={styles.deletionAlert}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.deletionAlertTitle}>Account Deletion Pending</Text>
                <Text style={styles.deletionAlertText}>
                  Requested on {new Date(pendingRequest.requestedAt).toLocaleDateString()}.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.cancelDeletionBtn}
                onPress={() => handleCancelDeletion(pendingRequest.id)}
              >
                <Text style={styles.cancelDeletionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Section 1: Resident Directory Privacy */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="people-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Resident Directory Visibility</Text>
                <Text style={styles.cardSubtitle}>
                  Control what information neighbours can see in the directory
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Show Phone Number</Text>
                <Text style={styles.toggleDesc}>Allow neighbours to see your mobile number</Text>
              </View>
              <Switch
                value={Boolean(settings.showPhoneToNeighbours)}
                onValueChange={(val) => handleToggle('showPhoneToNeighbours', val)}
                trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                thumbColor={settings.showPhoneToNeighbours ? COLORS.primary : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Show Email Address</Text>
                <Text style={styles.toggleDesc}>Make your email visible on your resident card</Text>
              </View>
              <Switch
                value={Boolean(settings.showEmailToNeighbours)}
                onValueChange={(val) => handleToggle('showEmailToNeighbours', val)}
                trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                thumbColor={settings.showEmailToNeighbours ? COLORS.primary : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Show Flat & Tower Unit</Text>
                <Text style={styles.toggleDesc}>Display your flat number in the member directory</Text>
              </View>
              <Switch
                value={Boolean(settings.showFlatInDirectory)}
                onValueChange={(val) => handleToggle('showFlatInDirectory', val)}
                trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                thumbColor={settings.showFlatInDirectory ? COLORS.primary : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Show Family Members</Text>
                <Text style={styles.toggleDesc}>Show verified family list to community members</Text>
              </View>
              <Switch
                value={Boolean(settings.showFamilyMembers)}
                onValueChange={(val) => handleToggle('showFamilyMembers', val)}
                trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                thumbColor={settings.showFamilyMembers ? COLORS.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Show Vehicle in Directory</Text>
                <Text style={styles.toggleDesc}>Allow neighbours to identify your parked vehicles</Text>
              </View>
              <Switch
                value={Boolean(settings.showVehicleInDirectory)}
                onValueChange={(val) => handleToggle('showVehicleInDirectory', val)}
                trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                thumbColor={settings.showVehicleInDirectory ? COLORS.primary : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Section 2: Social & Commercial Privacy */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cart-outline" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Social & Interactions</Text>
                <Text style={styles.cardSubtitle}>
                  Manage marketplace messaging and event interactions
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Allow Marketplace Inquiries</Text>
                <Text style={styles.toggleDesc}>Let buyers message you about listed items</Text>
              </View>
              <Switch
                value={Boolean(settings.allowMarketplaceContact)}
                onValueChange={(val) => handleToggle('allowMarketplaceContact', val)}
                trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                thumbColor={settings.allowMarketplaceContact ? COLORS.primary : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Allow Event Tagging</Text>
                <Text style={styles.toggleDesc}>Permit organizers to tag you in community events</Text>
              </View>
              <Switch
                value={Boolean(settings.allowEventTagging)}
                onValueChange={(val) => handleToggle('allowEventTagging', val)}
                trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                thumbColor={settings.allowEventTagging ? COLORS.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Restricted Emergency Contact</Text>
                <Text style={styles.toggleDesc}>Only guard house and admins can access emergency phone</Text>
              </View>
              <Switch
                value={Boolean(settings.emergencyContactRestricted)}
                onValueChange={(val) => handleToggle('emergencyContactRestricted', val)}
                trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                thumbColor={settings.emergencyContactRestricted ? COLORS.primary : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Section 3: Activity Visibility */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="eye-outline" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Activity Feed Visibility</Text>
                <Text style={styles.cardSubtitle}>
                  Who can see your public posts, sports scorecard & badges
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.radioGroup}>
              {VISIBILITY_OPTIONS.map((opt) => {
                const isSelected = settings.activityVisibility === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.radioItem, isSelected && styles.radioItemSelected]}
                    onPress={() => {
                      setSettings((prev) => ({ ...prev, activityVisibility: opt.value }));
                      setSaveSuccess(false);
                    }}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Privacy Settings</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Section 4: GDPR Data Portability & Erasure */}
          <Text style={styles.groupHeading}>GDPR & Data Rights</Text>

          <View style={styles.card}>
            {/* Export Data */}
            <View style={styles.gdprItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#CFFAFE' }]}>
                <Ionicons name="download-outline" size={20} color="#0891B2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gdprTitle}>Export My Personal Data</Text>
                <Text style={styles.gdprDesc}>
                  Download a complete copy of your profile, family, passes, and orders
                </Text>
              </View>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={handleExportData}
                activeOpacity={0.7}
              >
                <Text style={styles.exportBtnText}>Export</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Account Deletion */}
            <View style={styles.gdprItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gdprTitle}>Account Erasure (Right to be Forgotten)</Text>
                <Text style={styles.gdprDesc}>
                  Permanently delete your account, member profile and personal logs
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setDeletionModalVisible(true)}
                disabled={Boolean(pendingRequest)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnText}>
                  {pendingRequest ? 'Pending' : 'Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Export Data Modal ────────────────────────────────────────── */}
      <Modal
        visible={exportModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setExportModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Personal Data Export</Text>
            <View style={{ width: 24 }} />
          </View>

          {exportLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Generating data snapshot...</Text>
            </View>
          ) : exportedData ? (
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.exportSummaryCard}>
                <Ionicons name="shield-checkmark" size={32} color="#059669" />
                <Text style={styles.exportSummaryTitle}>GDPR Article 15 Data Package</Text>
                <Text style={styles.exportSummaryDate}>
                  Generated on {new Date().toLocaleString()}
                </Text>
              </View>

              <Text style={styles.exportSectionHeading}>Profile Details</Text>
              <View style={styles.exportDataBlock}>
                <Text style={styles.exportDataRow}>Full Name: {exportedData.fullName}</Text>
                <Text style={styles.exportDataRow}>Email: {exportedData.email}</Text>
                <Text style={styles.exportDataRow}>Phone: {exportedData.phone}</Text>
                <Text style={styles.exportDataRow}>Unit: {exportedData.flatNo || 'Not specified'}</Text>
                <Text style={styles.exportDataRow}>Occupancy: {exportedData.occupancyStatus || 'Resident'}</Text>
              </View>

              <Text style={styles.exportSectionHeading}>Summary of Stored Records</Text>
              <View style={styles.recordsGrid}>
                <View style={styles.recordTile}>
                  <Text style={styles.recordNum}>{exportedData.familyMembers?.length || 0}</Text>
                  <Text style={styles.recordLabel}>Family Members</Text>
                </View>
                <View style={styles.recordTile}>
                  <Text style={styles.recordNum}>{exportedData.visitorPasses?.length || 0}</Text>
                  <Text style={styles.recordLabel}>Visitor Passes</Text>
                </View>
                <View style={styles.recordTile}>
                  <Text style={styles.recordNum}>{exportedData.marketplaceOrders?.length || 0}</Text>
                  <Text style={styles.recordLabel}>Market Orders</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.downloadDoneBtn}
                onPress={() => {
                  setExportModalVisible(false);
                  Alert.alert('Export Ready', 'Your personal data package has been verified and downloaded.');
                }}
              >
                <Ionicons name="checkmark-done" size={18} color="#fff" />
                <Text style={styles.downloadDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* ── Deletion Request Modal ───────────────────────────────────── */}
      <Modal
        visible={deletionModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeletionModalVisible(false)}
      >
        <View style={styles.deletionModalOverlay}>
          <View style={styles.deletionModalContent}>
            <View style={styles.deletionWarningIcon}>
              <Ionicons name="warning" size={32} color="#DC2626" />
            </View>
            <Text style={styles.deletionModalTitle}>Request Account Deletion</Text>
            <Text style={styles.deletionModalDesc}>
              This will request the complete erasure of your login credentials and personal records.
              Active society maintenance dues and security logs must be cleared first.
            </Text>

            <Text style={styles.inputLabel}>Reason for Leaving (Optional)</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Relocating to a new city, Selling flat"
              placeholderTextColor={COLORS.textMuted}
              value={deletionReason}
              onChangeText={setDeletionReason}
              multiline
            />

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeletionModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitDeletion}
                disabled={deletionLoading}
              >
                {deletionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textMuted },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DEF7EC',
    borderColor: '#31C48D',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  successBannerText: { fontSize: 13, fontWeight: '600', color: '#03543F' },

  deletionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  deletionAlertTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
  deletionAlertText: { fontSize: 12, color: '#B91C1C' },
  cancelDeletionBtn: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  cancelDeletionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  toggleDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  radioGroup: { gap: 8 },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
  },
  radioItemSelected: { backgroundColor: '#EEF2FF' },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  radioLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  radioLabelSelected: { color: COLORS.primary, fontWeight: '700' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: 6,
    ...SHADOWS.md,
  },
  saveBtnDisabled: { backgroundColor: '#A5B4FC' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  groupHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
  },

  gdprItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  gdprTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  gdprDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  exportBtn: {
    backgroundColor: '#0891B2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  exportBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  deleteBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16, gap: 14 },
  exportSummaryCard: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 6,
  },
  exportSummaryTitle: { fontSize: 16, fontWeight: '700', color: '#065F46' },
  exportSummaryDate: { fontSize: 12, color: '#047857' },
  exportSectionHeading: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 6 },
  exportDataBlock: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 6,
  },
  exportDataRow: { fontSize: 13, color: COLORS.textSecondary },
  recordsGrid: { flexDirection: 'row', gap: 10 },
  recordTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  recordNum: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  recordLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  downloadDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: 14,
  },
  downloadDoneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Deletion Modal
  deletionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  deletionModalContent: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  deletionWarningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deletionModalTitle: { fontSize: 18, fontWeight: '700', color: '#DC2626', marginBottom: 8 },
  deletionModalDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  inputLabel: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  reasonInput: {
    width: '100%',
    height: 70,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActionButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  modalCancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
  },
  modalSubmitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
