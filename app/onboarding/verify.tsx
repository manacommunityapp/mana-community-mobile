import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { StepHeader } from './account';
import { COLORS } from '@/constants/config';
import api from '@/services/apiClient';
import type { GovtIdType } from '@/types/api';

const ID_TYPES: { key: GovtIdType; label: string; emoji: string; hint: string }[] = [
  { key: 'AADHAAR',          label: 'Aadhaar',         emoji: '🪪', hint: '12-digit number' },
  { key: 'PAN',              label: 'PAN Card',         emoji: '💳', hint: '10-character code' },
  { key: 'PASSPORT',         label: 'Passport',         emoji: '📘', hint: 'Passport number' },
  { key: 'VOTER_ID',         label: 'Voter ID',         emoji: '🗳️', hint: 'Voter ID number' },
  { key: 'DRIVING_LICENSE',  label: 'Driving Licence',  emoji: '🚗', hint: 'DL number' },
];

async function uploadImage(uri: string): Promise<string> {
  const filename = uri.split('/').pop() ?? 'doc.jpg';
  const form     = new FormData();
  form.append('file', { uri, name: filename, type: 'image/jpeg' } as any);
  const res = await api.post<{ url: string }>('/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url;
}

export default function VerifyStep() {
  const router      = useRouter();
  const { updateUser } = useAuth();
  const { reset }   = useOnboarding();

  const [idType,    setIdType]    = useState<GovtIdType>('AADHAAR');
  const [idNumber,  setIdNumber]  = useState('');
  const [frontUri,  setFrontUri]  = useState<string | null>(null);
  const [backUri,   setBackUri]   = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const selectedType = ID_TYPES.find((t) => t.key === idType)!;
  const needsBack    = ['AADHAAR', 'DRIVING_LICENSE', 'VOTER_ID'].includes(idType);

  async function pickImage(side: 'front' | 'back') {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    side === 'front' ? setFrontUri(uri) : setBackUri(uri);
    setErrors((e) => ({ ...e, [side === 'front' ? 'front' : 'back']: '' }));
  }

  async function handleSubmit() {
    const e: Record<string, string> = {};
    if (!idNumber.trim()) e.idNumber = 'ID number is required';
    if (!frontUri)         e.front   = 'Upload front of your ID';
    if (needsBack && !backUri) e.back = 'Upload back of your ID';
    if (Object.keys(e).length) { setErrors(e); return; }

    setUploading(true);
    try {
      const frontUrl = await uploadImage(frontUri!);
      const backUrl  = backUri ? await uploadImage(backUri) : undefined;

      const updatedUser = await authService.submitKyc({
        govtIdType:       idType,
        govtIdNumber:     idNumber.trim(),
        documentFrontUrl: frontUrl,
        documentBackUrl:  backUrl,
      });

      updateUser(updatedUser);
      reset();
      router.replace('/onboarding/pending');
    } catch (err: any) {
      Alert.alert('Upload failed', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleSkip() {
    Alert.alert(
      'Skip for now?',
      'You can submit your ID later from your Profile. Your account will remain pending until an admin verifies you.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => { reset(); router.replace('/onboarding/pending'); } },
      ],
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>

        <StepHeader
          step={4} total={4}
          title="Verify your identity"
          sub="Keeps the community safe. Admin reviews your document privately."
        />

        {/* ID type selector */}
        <View style={s.field}>
          <Text style={s.label}>Document type</Text>
          <View style={s.idGrid}>
            {ID_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[s.idChip, idType === t.key && s.idChipActive]}
                onPress={() => { setIdType(t.key); setIdNumber(''); }}
              >
                <Text style={s.idEmoji}>{t.emoji}</Text>
                <Text style={[s.idLabel, idType === t.key && s.idLabelActive]} numberOfLines={1}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ID number */}
        <View style={s.field}>
          <Text style={s.label}>{selectedType.label} number</Text>
          <TextInput
            style={[s.input, errors.idNumber && s.inputError]}
            value={idNumber}
            onChangeText={setIdNumber}
            placeholder={selectedType.hint}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            maxLength={20}
          />
          {errors.idNumber && <Text style={s.error}>{errors.idNumber}</Text>}
        </View>

        {/* Front image */}
        <View style={s.field}>
          <Text style={s.label}>Front of document *</Text>
          <TouchableOpacity style={[s.uploadBox, errors.front && s.uploadBoxError]} onPress={() => pickImage('front')}>
            {frontUri ? (
              <Image source={{ uri: frontUri }} style={s.previewImg} resizeMode="cover" />
            ) : (
              <>
                <Text style={s.uploadIcon}>📷</Text>
                <Text style={s.uploadText}>Tap to upload front</Text>
                <Text style={s.uploadHint}>JPG or PNG · Max 5MB</Text>
              </>
            )}
          </TouchableOpacity>
          {errors.front && <Text style={s.error}>{errors.front}</Text>}
        </View>

        {/* Back image (where required) */}
        {needsBack && (
          <View style={s.field}>
            <Text style={s.label}>Back of document *</Text>
            <TouchableOpacity style={[s.uploadBox, errors.back && s.uploadBoxError]} onPress={() => pickImage('back')}>
              {backUri ? (
                <Image source={{ uri: backUri }} style={s.previewImg} resizeMode="cover" />
              ) : (
                <>
                  <Text style={s.uploadIcon}>📷</Text>
                  <Text style={s.uploadText}>Tap to upload back</Text>
                  <Text style={s.uploadHint}>JPG or PNG · Max 5MB</Text>
                </>
              )}
            </TouchableOpacity>
            {errors.back && <Text style={s.error}>{errors.back}</Text>}
          </View>
        )}

        {/* Privacy assurance */}
        <View style={s.assurance}>
          <Text style={s.assuranceText}>
            🔐 Your document is encrypted and only visible to your community admin. It is never shared with third parties.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, uploading && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading
            ? <><ActivityIndicator color="#fff" /><Text style={s.submitBtnText}> Uploading…</Text></>
            : <Text style={s.submitBtnText}>Submit for Verification</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipText}>Skip for now — I'll verify later</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  scroll:          { padding: 24, gap: 16 },
  backBtn:         { alignSelf: 'flex-start', marginBottom: 4 },
  backText:        { fontSize: 17, color: COLORS.primary, fontWeight: '500' },
  field:           { gap: 6 },
  label:           { fontSize: 14, fontWeight: '600', color: COLORS.text },
  idGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  idChip:          { width: '30%', alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: COLORS.border, gap: 4 },
  idChipActive:    { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  idEmoji:         { fontSize: 20 },
  idLabel:         { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center' },
  idLabelActive:   { color: COLORS.primary, fontWeight: '700' },
  input:           { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  inputError:      { borderColor: COLORS.error },
  error:           { fontSize: 12, color: COLORS.error, fontWeight: '500' },
  uploadBox:       { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, borderStyle: 'dashed', height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', gap: 6, overflow: 'hidden' },
  uploadBoxError:  { borderColor: COLORS.error },
  uploadIcon:      { fontSize: 32 },
  uploadText:      { fontSize: 14, fontWeight: '600', color: COLORS.text },
  uploadHint:      { fontSize: 12, color: COLORS.textMuted },
  previewImg:      { width: '100%', height: '100%' },
  assurance:       { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  assuranceText:   { fontSize: 13, color: '#166534', lineHeight: 19 },
  submitBtn:       { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnDisabled:{ opacity: 0.6 },
  submitBtnText:   { color: '#fff', fontWeight: '800', fontSize: 16 },
  skipBtn:         { alignItems: 'center', paddingVertical: 10 },
  skipText:        { fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'underline' },
});
