import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/hooks/useOnboarding';
import { authService } from '@/services/authService';
import { StepHeader } from './account';
import { COLORS } from '@/constants/config';
import type { CommunityPreviewDto } from '@/types/api';

export default function CommunityStep() {
  const router = useRouter();
  const { setCommunity, inviteCode: savedCode, community: savedCommunity } = useOnboarding();

  const [code,      setCode]      = useState(savedCode);
  const [community, setCommunityLocal] = useState<CommunityPreviewDto | null>(savedCommunity);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  async function handleLookup() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) { setError('Enter your invite code'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await authService.lookupCommunity(trimmed);
      setCommunityLocal(result);
    } catch (err: any) {
      setError(
        err?.response?.status === 404
          ? 'Community not found. Check the code and try again.'
          : 'Could not verify the code. Please try again.',
      );
      setCommunityLocal(null);
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!community) { setError('Find your community first'); return; }
    setCommunity(code.trim().toUpperCase(), community);
    router.push('/onboarding/details');
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Back</Text>
          </TouchableOpacity>

          <StepHeader
            step={2} total={4}
            title="Find your community"
            sub="Enter the invite code shared by your admin"
          />

          {/* Code input */}
          <View style={s.field}>
            <Text style={s.label}>Invite code</Text>
            <View style={s.codeRow}>
              <TextInput
                style={[s.codeInput, error && s.inputError]}
                value={code}
                onChangeText={(v) => {
                  setCode(v.toUpperCase());
                  setCommunityLocal(null);
                  setError('');
                }}
                placeholder="e.g. PREET8AC"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleLookup}
                maxLength={12}
              />
              <TouchableOpacity
                style={s.lookupBtn}
                onPress={handleLookup}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.lookupBtnText}>Find</Text>
                }
              </TouchableOpacity>
            </View>
            {error ? (
              <Text style={s.error}>{error}</Text>
            ) : (
              <Text style={s.hint}>Ask your society admin or committee for the code</Text>
            )}
          </View>

          {/* Community preview card */}
          {community && (
            <View style={s.communityCard}>
              <View style={s.communityIcon}>
                <Text style={s.communityEmoji}>🏘️</Text>
              </View>
              <View style={s.communityInfo}>
                <Text style={s.communityName}>{community.name}</Text>
                <Text style={s.communityLocation}>
                  {[community.area, community.city, community.state].filter(Boolean).join(', ')}
                </Text>
                <Text style={s.communityMembers}>
                  👥 {community.memberCount} members
                </Text>
              </View>
              <Text style={s.communityCheck}>✅</Text>
            </View>
          )}

          {/* Skip code option */}
          <View style={s.dividerRow}>
            <View style={s.divider} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.divider} />
          </View>

          <TouchableOpacity
            style={s.searchBtn}
            onPress={() => {
              // For now just prompt — full city search can be added later
              setError("Ask your admin for the invite code. They can find it in Admin → Settings → Invite Code.");
            }}
          >
            <Text style={s.searchBtnText}>🔍 Search by community name</Text>
          </TouchableOpacity>

          <View style={{ height: 8 }} />

          <TouchableOpacity
            style={[s.nextBtn, !community && s.nextBtnDisabled]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={s.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
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
  codeRow:         { flexDirection: 'row', gap: 10 },
  codeInput:       { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 18, color: COLORS.text, fontWeight: '700', letterSpacing: 2, backgroundColor: COLORS.surface },
  inputError:      { borderColor: COLORS.error },
  lookupBtn:       { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  lookupBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  error:           { fontSize: 12, color: COLORS.error, fontWeight: '500', lineHeight: 17 },
  hint:            { fontSize: 12, color: COLORS.textMuted },
  communityCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EEF2FF', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#C7D2FE' },
  communityIcon:   { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  communityEmoji:  { fontSize: 24 },
  communityInfo:   { flex: 1, gap: 2 },
  communityName:   { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  communityLocation:{ fontSize: 12, color: COLORS.primary, opacity: 0.7 },
  communityMembers:{ fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  communityCheck:  { fontSize: 22 },
  dividerRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider:         { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText:     { fontSize: 13, color: COLORS.textMuted },
  searchBtn:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.surface },
  searchBtnText:   { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  nextBtn:         { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
});
