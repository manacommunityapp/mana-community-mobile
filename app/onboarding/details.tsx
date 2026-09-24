import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { StepHeader } from './account';
import { COLORS } from '@/constants/config';

const FAMILY_SIZES = [1, 2, 3, 4, 5, 6];

export default function DetailsStep() {
  const router   = useRouter();
  const { setDetails, flatNo: savedFlat, block: savedBlock, familySize: savedFamily,
          name, email, phone, password, inviteCode } = useOnboarding();
  const { register } = useAuth();

  const [flatNo,     setFlatNo]     = useState(savedFlat);
  const [block,      setBlock]      = useState(savedBlock);
  const [familySize, setFamilySize] = useState(savedFamily);
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!flatNo.trim()) e.flatNo = 'Flat / unit number required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setDetails({ flatNo: flatNo.trim(), block: block.trim(), familySize });
    setLoading(true);
    try {
      await register({
        name,
        email,
        mobile:        phone,
        password,
        communityCode: inviteCode,
        flatNumber:    flatNo.trim(),
        tower:         block.trim() || undefined,
      });
      // Registration succeeded → user is now PENDING → go to KYC
      router.push('/onboarding/verify');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Registration failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Back</Text>
          </TouchableOpacity>

          <StepHeader
            step={3} total={4}
            title="Your residence"
            sub="This helps other residents find and verify you"
          />

          {/* Flat */}
          <View style={s.field}>
            <Text style={s.label}>Flat / Unit number *</Text>
            <TextInput
              style={[s.input, errors.flatNo && s.inputError]}
              value={flatNo}
              onChangeText={setFlatNo}
              placeholder="e.g. 204, A-12, Villa 7"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              returnKeyType="next"
            />
            {errors.flatNo && <Text style={s.error}>{errors.flatNo}</Text>}
          </View>

          {/* Block / Tower */}
          <View style={s.field}>
            <Text style={s.label}>Block / Tower <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={s.input}
              value={block}
              onChangeText={setBlock}
              placeholder="e.g. A, Tower 2, Phase 1"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
            />
          </View>

          {/* Family size */}
          <View style={s.field}>
            <Text style={s.label}>Family / household size</Text>
            <View style={s.sizeRow}>
              {FAMILY_SIZES.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[s.sizeChip, familySize === n && s.sizeChipActive]}
                  onPress={() => setFamilySize(n)}
                >
                  <Text style={[s.sizeText, familySize === n && s.sizeTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.sizeChip, familySize > 6 && s.sizeChipActive]}
                onPress={() => setFamilySize(7)}
              >
                <Text style={[s.sizeText, familySize > 6 && s.sizeTextActive]}>7+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Privacy note */}
          <View style={s.privacyNote}>
            <Text style={s.privacyEmoji}>🔒</Text>
            <Text style={s.privacyText}>
              Your flat number is only visible to verified community members, not the public.
            </Text>
          </View>

          <View style={{ height: 8 }} />

          <TouchableOpacity
            style={[s.nextBtn, loading && s.nextBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.nextBtnText}>Create Account →</Text>
            }
          </TouchableOpacity>

          <Text style={s.terms}>
            By continuing you agree to our{' '}
            <Text style={{ color: COLORS.primary }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: COLORS.primary }}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  optional:        { fontWeight: '400', color: COLORS.textMuted },
  input:           { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  inputError:      { borderColor: COLORS.error },
  error:           { fontSize: 12, color: COLORS.error, fontWeight: '500' },
  sizeRow:         { flexDirection: 'row', gap: 10 },
  sizeChip:        { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  sizeChipActive:  { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  sizeText:        { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  sizeTextActive:  { color: COLORS.primary, fontWeight: '800' },
  privacyNote:     { flexDirection: 'row', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  privacyEmoji:    { fontSize: 18 },
  privacyText:     { fontSize: 13, color: COLORS.textMuted, flex: 1, lineHeight: 18 },
  nextBtn:         { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
  terms:           { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});
