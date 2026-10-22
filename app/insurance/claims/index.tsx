import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { insuranceService } from '@/services/insuranceService';
import { FONTS, COLORS, SHADOWS } from '@/constants/config';
import type { ClaimCaseView } from '@/types/insurance';

const ASSISTANCE_STATUS_CONFIG: Record<ClaimCaseView['assistanceStatus'], { label: string; bg: string; text: string; step: number }> = {
  OPEN:          { label: 'Intimation Submitted', bg: '#EFF6FF', text: '#1D4ED8', step: 1 },
  IN_REVIEW:     { label: 'In Review by Mana Desk', bg: '#FEF3C7', text: '#D97706', step: 2 },
  AWAITING_USER: { label: 'Action Required', bg: '#FEE2E2', text: '#DC2626', step: 2 },
  CLOSED:        { label: 'Settlement Completed', bg: '#ECFDF5', text: '#059669', step: 4 },
};

const CLAIM_TYPES = [
  'Cashless Hospitalization',
  'Hospital Reimbursement',
  'Motor Accidental Damage',
  'Home Content Fire / Burglary',
  'Other / Accidental',
];

export default function ClaimsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [claimType, setClaimType] = useState('Cashless Hospitalization');
  const [hospitalName, setHospitalName] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [description, setDescription] = useState('');
  const [formErr, setFormErr] = useState<Record<string, string>>({});

  const casesQ = useQuery({
    queryKey: ['insurance-claims'],
    queryFn: insuranceService.claimCases,
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: () => insuranceService.createClaimCase({
      claimType: `${claimType}${hospitalName ? ` (${hospitalName})` : ''}`,
      description: description ? `${description}${estimatedAmount ? ` | Est: ₹${estimatedAmount}` : ''}` : (estimatedAmount ? `Est Amount: ₹${estimatedAmount}` : undefined),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-claims'] });
      setShowModal(false);
      setClaimType('Cashless Hospitalization');
      setHospitalName('');
      setEstimatedAmount('');
      setDescription('');
      setFormErr({});
    },
  });

  function handleSubmit() {
    const e: Record<string, string> = {};
    if (!claimType.trim()) e.claimType = 'Please select claim type';
    setFormErr(e);
    if (Object.keys(e).length) return;
    createMut.mutate();
  }

  const cases = casesQ.data || [];

  return (
    <View style={s.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/insurance')}
          style={s.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={s.topNavTitleBox}>
          <Text style={s.topNavTitle}>Claims Assistance</Text>
          <Text style={s.topNavSubtitle}>Cashless Pre-Auth & Reimbursement Tracking</Text>
        </View>

        <TouchableOpacity
          onPress={() => Linking.openURL('tel:18002666400')}
          style={s.callBtn}
          accessibilityLabel="Call TPA Helpline"
        >
          <Ionicons name="call" size={17} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Emergency Cashless Protocol Banner ─────────────────── */}
        <LinearGradient
          colors={['#DC2626', '#B91C1C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.emergencyBanner}
        >
          <View style={s.emergencyBannerTop}>
            <View style={s.emergencyBadge}>
              <Ionicons name="flash" size={11} color="#FEF08A" />
              <Text style={s.emergencyBadgeText}>24X7 CASHLESS HOSPITAL DESK</Text>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL('tel:18002666400')}
              style={s.emergencyCallTag}
            >
              <Ionicons name="call" size={12} color="#DC2626" />
              <Text style={s.emergencyCallTagText}>1800-2666-400</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.emergencyHeading}>Admitted to a Network Hospital?</Text>
          <Text style={s.emergencySub}>
            Show your Health Card at the hospital TPA insurance desk. The hospital initiates Pre-Auth directly with your insurer.
          </Text>

          <View style={s.stepsMiniRow}>
            <View style={s.stepMini}>
              <Text style={s.stepMiniNum}>1</Text>
              <Text style={s.stepMiniLabel}>Show ID at TPA</Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.6)" />
            <View style={s.stepMini}>
              <Text style={s.stepMiniNum}>2</Text>
              <Text style={s.stepMiniLabel}>Pre-Auth Form</Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.6)" />
            <View style={s.stepMini}>
              <Text style={s.stepMiniNum}>3</Text>
              <Text style={s.stepMiniLabel}>Cashless Grant</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Open Case Action Bar ──────────────────────────────── */}
        <TouchableOpacity
          style={s.openCaseCta}
          onPress={() => setShowModal(true)}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#4F46E5', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.openCaseGradient}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={s.openCaseText}>Open Claims Assistance Case</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Active Claim Cases Tracker ─────────────────────────── */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Track Active Claims ({cases.length})</Text>
          <Text style={s.sectionSubtitle}>Real-time TPA milestone updates</Text>
        </View>

        {casesQ.isLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={s.loadingText}>Fetching active claim cases…</Text>
          </View>
        ) : cases.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
            <Text style={s.emptyTitle}>No open claim cases</Text>
            <Text style={s.emptySubtitle}>
              If you have hospital bills or accidental damage, tap the button above to request Mana claims assistance.
            </Text>
          </View>
        ) : (
          cases.map((c) => {
            const cfg = ASSISTANCE_STATUS_CONFIG[c.assistanceStatus] || ASSISTANCE_STATUS_CONFIG.OPEN;
            return (
              <View key={c.id} style={s.caseCard}>
                <View style={s.caseCardHeader}>
                  <View>
                    <Text style={s.caseRef}>Case #{c.caseRef}</Text>
                    <Text style={s.caseDate}>
                      Intimated on {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Progress Stepper */}
                <View style={s.stepperRow}>
                  {[
                    { label: 'Intimated', step: 1 },
                    { label: 'Verification', step: 2 },
                    { label: 'TPA Query', step: 3 },
                    { label: 'Settlement', step: 4 },
                  ].map((st, i) => {
                    const isDone = cfg.step >= st.step;
                    const isCurrent = cfg.step === st.step;
                    return (
                      <React.Fragment key={st.step}>
                        <View style={s.stepperItem}>
                          <View style={[
                            s.stepperDot,
                            isDone && { backgroundColor: COLORS.success },
                            isCurrent && { backgroundColor: COLORS.primary },
                          ]}>
                            {isDone ? (
                              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                            ) : (
                              <Text style={s.stepperDotText}>{st.step}</Text>
                            )}
                          </View>
                          <Text style={[s.stepperText, isCurrent && { color: COLORS.text, fontFamily: FONTS.bold }]}>
                            {st.label}
                          </Text>
                        </View>
                        {i < 3 && <View style={[s.stepperLine, isDone && { backgroundColor: COLORS.success }]} />}
                      </React.Fragment>
                    );
                  })}
                </View>

                <View style={s.caseDetailsBox}>
                  <Text style={s.caseTypeTitle}>{c.claimType}</Text>
                  {c.description && <Text style={s.caseDesc}>{c.description}</Text>}

                  {c.insurerClaimReference && (
                    <View style={s.insurerRefTag}>
                      <Ionicons name="barcode-outline" size={14} color={COLORS.primary} />
                      <Text style={s.insurerRefText}>
                        Insurer Ref: <Text style={{ fontFamily: FONTS.bold }}>{c.insurerClaimReference}</Text>
                      </Text>
                    </View>
                  )}
                </View>

                <View style={s.caseCardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="shield-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={s.teamMeta}>Handled by: {c.assignedTeam || 'Mana Claims Assistance'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('tel:18002666400')}
                    style={s.trackHelpBtn}
                  >
                    <Text style={s.trackHelpText}>Follow Up</Text>
                    <Ionicons name="call" size={11} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ── Document Checklist Card ────────────────────────────── */}
        <View style={s.checklistCard}>
          <View style={s.checklistHeader}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={COLORS.primary} />
            <Text style={s.checklistTitle}>Required Claim Documents Checklist</Text>
          </View>
          <Text style={s.checklistSubtitle}>
            Keep original copies safe to ensure zero delays during reimbursement:
          </Text>

          <View style={s.checkItems}>
            <View style={s.checkItem}>
              <Ionicons name="checkbox" size={16} color={COLORS.primary} />
              <Text style={s.checkItemText}>Discharge Summary with doctor's stamp and signature</Text>
            </View>
            <View style={s.checkItem}>
              <Ionicons name="checkbox" size={16} color={COLORS.primary} />
              <Text style={s.checkItemText}>Final Itemized Hospital Bill with payment receipt</Text>
            </View>
            <View style={s.checkItem}>
              <Ionicons name="checkbox" size={16} color={COLORS.primary} />
              <Text style={s.checkItemText}>Diagnostic reports (Blood tests, X-Ray, MRI scans)</Text>
            </View>
            <View style={s.checkItem}>
              <Ionicons name="checkbox" size={16} color={COLORS.primary} />
              <Text style={s.checkItemText}>Prescriptions matching pharmacy medicine bills</Text>
            </View>
          </View>
        </View>

        {/* ── Administrative Notice ──────────────────────────────── */}
        <View style={s.noticeCard}>
          <Ionicons name="information-circle-outline" size={16} color="#B45309" />
          <Text style={s.noticeText}>
            Mana Community provides administrative liaison and tracking assistance. All claim approval, query assessment, and settlement decisions are made solely by the licensed insurance company.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Open Claim Case Modal ───────────────────────────────── */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <View style={s.sheetHandle} />

            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Open Assistance Case</Text>
                <Text style={s.modalSubtitle}>Our insurance team will assist with documentation</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Claim Type *</Text>
              <View style={s.typeChipsRow}>
                {CLAIM_TYPES.map((t) => {
                  const isSelected = claimType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeChip, isSelected && s.typeChipActive]}
                      onPress={() => setClaimType(t)}
                    >
                      <Text style={[s.typeChipText, isSelected && s.typeChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.fieldLabel}>Hospital / Workshop Name</Text>
              <TextInput
                style={s.formInput}
                value={hospitalName}
                onChangeText={setHospitalName}
                placeholder="e.g. Manipal Hospital, Whitefield"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={s.fieldLabel}>Estimated Claim Amount (₹)</Text>
              <TextInput
                style={s.formInput}
                value={estimatedAmount}
                onChangeText={setEstimatedAmount}
                placeholder="e.g. 75000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              <Text style={s.fieldLabel}>Additional Situation Details</Text>
              <TextInput
                style={[s.formInput, { height: 75, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Briefly describe the illness, accident or incident..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[s.submitBtn, createMut.isPending && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={createMut.isPending}
                activeOpacity={0.88}
              >
                {createMut.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.submitBtnText}>Submit Assistance Request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundAlt,
  },
  topNavTitleBox: {
    flex: 1,
  },
  topNavTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  topNavSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  emergencyBanner: {
    borderRadius: 18,
    padding: 18,
    gap: 8,
    ...SHADOWS.card,
  },
  emergencyBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  emergencyBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emergencyCallTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  emergencyCallTagText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#DC2626',
  },
  emergencyHeading: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  emergencySub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
  stepsMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  stepMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepMiniNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 18,
  },
  stepMiniLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#FFFFFF',
  },
  openCaseCta: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  openCaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  openCaseText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 12,
  },
  caseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caseRef: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  caseDate: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 10,
  },
  stepperItem: {
    alignItems: 'center',
    gap: 3,
  },
  stepperDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDotText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  stepperText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  caseDetailsBox: {
    gap: 4,
  },
  caseTypeTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  caseDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  insurerRefTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  insurerRefText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
  },
  caseCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
  },
  teamMeta: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  trackHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
  },
  trackHelpText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 10,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  checklistSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  checkItems: {
    gap: 8,
    marginTop: 2,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkItemText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#92400E',
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    paddingTop: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 10,
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  typeChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});