import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  kycService,
  KycSummary,
  KycDocument,
  KycDocumentType,
  KycStatus,
  SubmitKycRequest,
} from '@/services/kycService';

const MOCK_KYC: KycSummary = {
  overallStatus: 'PENDING_REVIEW',
  submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  documents: [
    {
      id: 1,
      documentType: 'AADHAAR',
      documentNumber: 'XXXX XXXX 4521',
      status: 'PENDING_REVIEW',
      submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
  ],
};

const DOC_TYPES: { type: KycDocumentType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'AADHAAR',          label: 'Aadhaar Card',       icon: 'card-outline' },
  { type: 'PAN',              label: 'PAN Card',            icon: 'document-text-outline' },
  { type: 'PASSPORT',         label: 'Passport',            icon: 'airplane-outline' },
  { type: 'DRIVING_LICENSE',  label: 'Driving License',     icon: 'car-outline' },
  { type: 'VOTER_ID',         label: "Voter ID",            icon: 'people-outline' },
];

const STATUS_CONFIG: Record<KycStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  NOT_SUBMITTED:  { label: 'Not Submitted',       color: '#6B7280', bg: '#F3F4F6', icon: 'time-outline' },
  PENDING_REVIEW: { label: 'Under Review',         color: '#D97706', bg: '#FEF3C7', icon: 'hourglass-outline' },
  APPROVED:       { label: 'Approved',             color: '#059669', bg: '#D1FAE5', icon: 'shield-checkmark-outline' },
  REJECTED:       { label: 'Rejected',             color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

const BANNER_CONFIG: Record<KycStatus, { bg: string; border: string; text: string; sub: string; icon: keyof typeof Ionicons.glyphMap }> = {
  NOT_SUBMITTED:  { bg: '#F3F4F6', border: '#E2E8F0', text: 'KYC Not Completed', sub: 'Complete your KYC to unlock full access to society services.', icon: 'alert-circle-outline' },
  PENDING_REVIEW: { bg: '#FEF3C7', border: '#FDE68A', text: 'Documents Under Review', sub: 'Your documents are being verified by the society management (2–3 business days).', icon: 'hourglass-outline' },
  APPROVED:       { bg: '#D1FAE5', border: '#6EE7B7', text: '✓ KYC Verified', sub: 'Your identity has been verified. All features are unlocked.', icon: 'shield-checkmark' },
  REJECTED:       { bg: '#FEE2E2', border: '#FECACA', text: 'KYC Rejected', sub: 'One or more documents were rejected. Please resubmit with correct documents.', icon: 'close-circle-outline' },
};

function fmtDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function KycScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [resubmitDoc, setResubmitDoc] = useState<KycDocument | null>(null);
  const [form, setForm] = useState<SubmitKycRequest>({ documentType: 'AADHAAR', documentNumber: '' });

  const { data: rawKyc, isLoading } = useQuery<KycSummary | null>({
    queryKey: ['kyc', 'status'],
    queryFn: () => kycService.getKycStatus(),
    staleTime: 60_000,
  });
  const kyc = rawKyc ?? MOCK_KYC;

  const submitMutation = useMutation({
    mutationFn: (data: SubmitKycRequest) => kycService.submitDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      setShowAdd(false);
      setForm({ documentType: 'AADHAAR', documentNumber: '' });
      Alert.alert('Document Submitted', 'Your document is now under review. You will be notified once verified.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const resubmitMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubmitKycRequest }) => kycService.resubmitDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      setResubmitDoc(null);
      setForm({ documentType: 'AADHAAR', documentNumber: '' });
      Alert.alert('Resubmitted', 'Your document has been resubmitted for review.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const handleSubmit = () => {
    if (!form.documentNumber.trim()) { Alert.alert('Required', 'Please enter the document number.'); return; }
    if (resubmitDoc) {
      resubmitMutation.mutate({ id: resubmitDoc.id, data: form });
    } else {
      submitMutation.mutate(form);
    }
  };

  const openResubmit = (doc: KycDocument) => {
    setResubmitDoc(doc);
    setForm({ documentType: doc.documentType, documentNumber: doc.documentNumber });
    setShowAdd(true);
  };

  const overallStatus = kyc?.overallStatus ?? 'NOT_SUBMITTED';
  const banner = BANNER_CONFIG[overallStatus];
  const bannerIconColor = overallStatus === 'APPROVED' ? '#059669' : overallStatus === 'REJECTED' ? '#DC2626' : overallStatus === 'PENDING_REVIEW' ? '#D97706' : '#6B7280';
  const submittedTypes = new Set(kyc?.documents.map(d => d.documentType) ?? []);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>KYC Verification</Text>
          <Text style={s.headerSub}>Identity document verification</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <View style={s.loading}><ActivityIndicator size="large" color="#059669" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {/* Status banner */}
          <View style={[s.banner, { backgroundColor: banner.bg, borderColor: banner.border }]}>
            <Ionicons name={banner.icon} size={22} color={bannerIconColor} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={[s.bannerTitle, { color: bannerIconColor }]}>{banner.text}</Text>
              <Text style={s.bannerSub}>{banner.sub}</Text>
            </View>
          </View>

          {/* Why KYC matters (not shown when approved) */}
          {overallStatus !== 'APPROVED' && (
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>Why is KYC required?</Text>
              {[
                'Required by society bye-laws for all residents',
                'Enables maintenance payment auto-debit setup',
                'Allows your vehicles to be whitelisted at the gate',
                'Speeds up move-in / move-out NOC process',
              ].map((point, i) => (
                <View key={i} style={s.infoRow}>
                  <View style={s.infoDot} />
                  <Text style={s.infoText}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Submitted documents */}
          <Text style={s.sectionTitle}>Your Documents</Text>

          {kyc?.documents.map(doc => {
            const docMeta = DOC_TYPES.find(d => d.type === doc.documentType);
            const stCfg = STATUS_CONFIG[doc.status];
            return (
              <View key={doc.id} style={s.docCard}>
                <View style={s.docCardTop}>
                  <View style={s.docIcon}>
                    <Ionicons name={docMeta?.icon ?? 'document-outline'} size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Text style={s.docName}>{docMeta?.label ?? doc.documentType}</Text>
                    <Text style={s.docNumber}>{doc.documentNumber}</Text>
                  </View>
                  <View style={[s.docStatus, { backgroundColor: stCfg.bg }]}>
                    <Ionicons name={stCfg.icon} size={12} color={stCfg.color} />
                    <Text style={[s.docStatusText, { color: stCfg.color }]}>{stCfg.label}</Text>
                  </View>
                </View>
                {doc.submittedAt && (
                  <Text style={s.docDate}>Submitted {fmtDate(doc.submittedAt)}</Text>
                )}
                {doc.rejectionReason && (
                  <View style={s.rejectionRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                    <Text style={s.rejectionText}>{doc.rejectionReason}</Text>
                  </View>
                )}
                {doc.status === 'REJECTED' && (
                  <TouchableOpacity style={s.resubmitBtn} onPress={() => openResubmit(doc)}>
                    <Ionicons name="refresh-outline" size={14} color="#DC2626" />
                    <Text style={s.resubmitBtnText}>Resubmit Document</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Add document button */}
          {overallStatus !== 'APPROVED' && (
            <TouchableOpacity style={s.addDocBtn} onPress={() => { setResubmitDoc(null); setForm({ documentType: 'AADHAAR', documentNumber: '' }); setShowAdd(true); }}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={s.addDocBtnText}>Add Document</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Add / Resubmit Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{resubmitDoc ? 'Resubmit Document' : 'Add Document'}</Text>
              <TouchableOpacity onPress={() => { setShowAdd(false); setResubmitDoc(null); }} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Document Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DOC_TYPES.filter(dt => !submittedTypes.has(dt.type) || resubmitDoc?.documentType === dt.type).map(dt => (
                  <TouchableOpacity
                    key={dt.type}
                    style={[s.typeChip, form.documentType === dt.type && s.typeChipActive]}
                    onPress={() => setForm(f => ({ ...f, documentType: dt.type }))}
                  >
                    <Ionicons name={dt.icon} size={14} color={form.documentType === dt.type ? '#fff' : COLORS.textSecondary} />
                    <Text style={[s.typeChipText, form.documentType === dt.type && s.typeChipTextActive]}>{dt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.label}>Document Number *</Text>
            <TextInput
              style={s.input}
              placeholder={form.documentType === 'AADHAAR' ? 'XXXX XXXX XXXX' : form.documentType === 'PAN' ? 'ABCDE1234F' : 'Enter document number'}
              placeholderTextColor={COLORS.textMuted}
              value={form.documentNumber}
              onChangeText={v => setForm(f => ({ ...f, documentNumber: v }))}
              autoCapitalize="characters"
            />

            <Text style={s.label}>Front Side</Text>
            <TouchableOpacity
              style={s.uploadBox}
              onPress={() => Alert.alert('Camera Integration', 'Camera and gallery integration will be available in the next update.')}
            >
              <Ionicons name="camera-outline" size={28} color={COLORS.textMuted} />
              <Text style={s.uploadText}>Tap to upload front side</Text>
              <Text style={s.uploadSub}>JPG, PNG • Max 5MB</Text>
            </TouchableOpacity>

            <Text style={s.label}>Back Side (if applicable)</Text>
            <TouchableOpacity
              style={[s.uploadBox, { marginBottom: SPACING.lg }]}
              onPress={() => Alert.alert('Camera Integration', 'Camera and gallery integration will be available in the next update.')}
            >
              <Ionicons name="camera-outline" size={28} color={COLORS.textMuted} />
              <Text style={s.uploadText}>Tap to upload back side</Text>
              <Text style={s.uploadSub}>Optional for some documents</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.submitBtn, (submitMutation.isPending || resubmitMutation.isPending) && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitMutation.isPending || resubmitMutation.isPending}
            >
              {(submitMutation.isPending || resubmitMutation.isPending)
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>{resubmitDoc ? 'Resubmit for Verification' : 'Submit for Verification'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(5,150,105,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },

  banner: { borderRadius: RADIUS.xl, borderWidth: 1.5, padding: SPACING.lg, flexDirection: 'row', alignItems: 'flex-start' },
  bannerTitle: { fontSize: 15, fontWeight: '800', fontFamily: 'Outfit-Bold', marginBottom: 3 },
  bannerSub: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 17 },

  infoCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99,102,241,0.12)', ...SHADOWS.sm },
  infoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', marginBottom: SPACING.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 },
  infoDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.primary, marginTop: 6 },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 17 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: SPACING.sm },

  docCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99,102,241,0.12)', ...SHADOWS.sm },
  docCardTop: { flexDirection: 'row', alignItems: 'center' },
  docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  docNumber: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 2 },
  docStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  docStatusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  docDate: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: SPACING.sm },
  rejectionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: SPACING.sm, backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: SPACING.sm },
  rejectionText: { flex: 1, fontSize: 12, color: '#DC2626', fontFamily: 'DMSans-Regular', lineHeight: 16 },
  resubmitBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: '#FEE2E2', justifyContent: 'center' },
  resubmitBtnText: { fontSize: 13, fontWeight: '700', color: '#DC2626', fontFamily: 'Outfit-Bold' },

  addDocBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 14, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', backgroundColor: '#EEF2FF' },
  addDocBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 11, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', marginBottom: SPACING.md },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  typeChipTextActive: { color: '#fff', fontFamily: 'Outfit-Bold', fontWeight: '700' },
  uploadBox: { height: 90, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: '#CBD5E1', borderStyle: 'dashed', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: SPACING.md },
  uploadText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium', fontWeight: '600' },
  uploadSub: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  submitBtn: { backgroundColor: '#059669', paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', ...SHADOWS.sm },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
});
