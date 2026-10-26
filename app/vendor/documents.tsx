import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';

interface VendorDoc {
  id: string;
  title: string;
  type: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'NOT_UPLOADED';
  updatedAt?: string;
  fileName?: string;
}

const INITIAL_DOCS: VendorDoc[] = [
  {
    id: 'doc-1',
    title: 'Business Registration / GST Certificate',
    type: 'GST_CERTIFICATE',
    status: 'VERIFIED',
    updatedAt: 'Verified on 15 Aug 2026',
    fileName: 'GSTIN_29AAACH7409R1Z.pdf',
  },
  {
    id: 'doc-2',
    title: 'Government ID / Aadhaar / PAN',
    type: 'IDENTITY_PROOF',
    status: 'VERIFIED',
    updatedAt: 'Verified on 15 Aug 2026',
    fileName: 'Proprietor_PAN_Front.jpg',
  },
  {
    id: 'doc-3',
    title: 'Trade License / Municipal Clearance',
    type: 'TRADE_LICENSE',
    status: 'PENDING',
    updatedAt: 'Submitted yesterday',
    fileName: 'Trade_License_2026_Renewal.pdf',
  },
  {
    id: 'doc-4',
    title: 'Police Verification Certificate',
    type: 'POLICE_VERIFICATION',
    status: 'NOT_UPLOADED',
  },
  {
    id: 'doc-5',
    title: 'Commercial General Liability Insurance',
    type: 'INSURANCE',
    status: 'NOT_UPLOADED',
  },
];

export default function VendorDocumentsScreen() {
  const router = useRouter();
  const [docs, setDocs] = useState<VendorDoc[]>(INITIAL_DOCS);

  const handleUpload = (doc: VendorDoc) => {
    Alert.alert('Upload Document', `Select file source for "${doc.title}":`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Upload File / Photo',
        onPress: () => {
          const updated = docs.map(d =>
            d.id === doc.id
              ? { ...d, status: 'PENDING' as const, updatedAt: 'Submitted just now', fileName: 'Uploaded_Document.pdf' }
              : d
          );
          setDocs(updated);
          Alert.alert('Uploaded', 'Document submitted for society compliance verification.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>KYC & Documents</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="shield-checkmark" size={24} color="#059669" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.bannerTitle}>Society Vendor Compliance</Text>
          <Text style={styles.bannerSub}>Maintain verified documents to accept high-value society contracts.</Text>
        </View>
      </View>

      <FlatList
        data={docs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isVerified = item.status === 'VERIFIED';
          const isPending = item.status === 'PENDING';
          const isNotUploaded = item.status === 'NOT_UPLOADED';

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Ionicons name="document-attach" size={20} color={VENDOR_COLORS.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.docTitle}>{item.title}</Text>
                  {item.fileName && <Text style={styles.fileName}>{item.fileName}</Text>}
                  <Text style={styles.updatedAt}>{item.updatedAt || 'Action Required'}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  isVerified ? styles.verifiedBadge : isPending ? styles.pendingBadge : styles.missingBadge
                ]}>
                  <Text style={[
                    styles.statusText,
                    isVerified ? styles.verifiedText : isPending ? styles.pendingText : styles.missingText
                  ]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                {isNotUploaded || isPending ? (
                  <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload(item)}>
                    <Ionicons name="cloud-upload-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.uploadBtnText}>{isNotUploaded ? 'Upload Document' : 'Replace File'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => Alert.alert('View Document', `Displaying verified copy of ${item.fileName}`)}
                  >
                    <Ionicons name="eye-outline" size={14} color={VENDOR_COLORS.accent} />
                    <Text style={styles.viewBtnText}>View Verified Copy</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  banner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: '#ECFDF5', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 12 },
  bannerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  bannerSub: { fontSize: 11, color: '#047857', marginTop: 2, lineHeight: 16 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: VENDOR_COLORS.accentLight, justifyContent: 'center', alignItems: 'center' },
  docTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  fileName: { fontSize: 12, color: '#4F46E5', marginTop: 2, fontWeight: '600' },
  updatedAt: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '700' },
  verifiedBadge: { backgroundColor: '#DCFCE7' },
  verifiedText: { color: '#059669', fontSize: 10, fontWeight: '700' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  pendingText: { color: '#D97706', fontSize: 10, fontWeight: '700' },
  missingBadge: { backgroundColor: '#FEE2E2' },
  missingText: { color: '#DC2626', fontSize: 10, fontWeight: '700' },
  cardActions: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: VENDOR_COLORS.accent, paddingVertical: 9, borderRadius: 10 },
  uploadBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: VENDOR_COLORS.accentLight, paddingVertical: 9, borderRadius: 10 },
  viewBtnText: { color: VENDOR_COLORS.accent, fontSize: 13, fontWeight: '700', marginLeft: 6 },
});
