import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  documentService,
  DocumentDto,
  DocumentCategory,
  DocAccessLevel,
  DocumentUploadRequest,
} from '@/services/documentService';

interface DocumentUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  entityType?: string;
  entityId?: string | number;
  defaultCategory?: DocumentCategory;
  onUploaded: (doc: DocumentDto) => void;
}

const CATEGORIES: DocumentCategory[] = [
  'RENTAL_AGREEMENT', 'DOCTOR_DOCUMENT', 'VENDOR_KYC', 'SPORTS_WAIVER',
  'INSURANCE_DOCUMENT', 'INVOICE', 'EVENT_SPONSORSHIP_CONTRACT',
  'GOVERNANCE_RECORD', 'OTHER',
];

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  RENTAL_AGREEMENT: 'Rental Agreement',
  DOCTOR_DOCUMENT: 'Doctor Document',
  VENDOR_KYC: 'Vendor KYC',
  SPORTS_WAIVER: 'Sports Waiver',
  INSURANCE_DOCUMENT: 'Insurance',
  INVOICE: 'Invoice',
  EVENT_SPONSORSHIP_CONTRACT: 'Sponsorship Contract',
  GOVERNANCE_RECORD: 'Governance Record',
  OTHER: 'Other',
};

const ACCESS_LEVELS: { value: DocAccessLevel; label: string }[] = [
  { value: 'OWNER_ONLY', label: 'Only Me' },
  { value: 'COMMUNITY_ADMIN', label: 'Admins' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'PUBLIC', label: 'Public' },
];

interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

export function DocumentUploadSheet({
  visible,
  onClose,
  entityType,
  entityId,
  defaultCategory = 'OTHER',
  onUploaded,
}: DocumentUploadSheetProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [accessLevel, setAccessLevel] = useState<DocAccessLevel>('COMMUNITY_ADMIN');
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setTitle('');
    setCategory(defaultCategory);
    setAccessLevel('COMMUNITY_ADMIN');
    setExpiresAt('');
    setDescription('');
    setPickedFile(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setPickedFile({
        uri: asset.uri,
        name: asset.name ?? 'document',
        type: asset.mimeType ?? 'application/octet-stream',
      });
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a document title.');
      return;
    }
    if (!pickedFile) {
      Alert.alert('Required', 'Please select a file to upload.');
      return;
    }

    const request: DocumentUploadRequest = {
      title: title.trim(),
      category,
      accessLevel,
      description: description.trim() || undefined,
      entityType,
      entityId: entityId !== undefined ? String(entityId) : undefined,
      expiresAt: expiresAt.trim() || undefined,
    };

    setUploading(true);
    try {
      const doc = await documentService.upload(request, pickedFile);
      reset();
      onUploaded(doc);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.response?.data?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Upload Document</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Vendor GST Certificate"
                placeholderTextColor="#9CA3AF"
              />

              {/* Category */}
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, category === cat && styles.chipSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Access level */}
              <Text style={styles.label}>Access</Text>
              <View style={styles.accessRow}>
                {ACCESS_LEVELS.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.accessBtn, accessLevel === value && styles.accessBtnSelected]}
                    onPress={() => setAccessLevel(value)}
                  >
                    <Text
                      style={[
                        styles.accessBtnText,
                        accessLevel === value && styles.accessBtnTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Expiry date */}
              <Text style={styles.label}>Expiry Date (optional)</Text>
              <TextInput
                style={styles.input}
                value={expiresAt}
                onChangeText={setExpiresAt}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
              />

              {/* Description */}
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="Notes about this document…"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />

              {/* File picker */}
              <Text style={styles.label}>File *</Text>
              <TouchableOpacity style={styles.filePicker} onPress={handlePickFile}>
                <Ionicons name="document-attach-outline" size={20} color="#2563EB" />
                <Text style={styles.filePickerText}>
                  {pickedFile ? pickedFile.name : 'Tap to select PDF, image or Word document'}
                </Text>
              </TouchableOpacity>

              {/* Upload button */}
              <TouchableOpacity
                style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.uploadBtnText}>Upload</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  inputMulti: {
    height: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  accessRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accessBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  accessBtnSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  accessBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  accessBtnTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
  },
  filePickerText: {
    flex: 1,
    fontSize: 13,
    color: '#2563EB',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  uploadBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default DocumentUploadSheet;
