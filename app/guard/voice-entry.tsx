import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/config';
import { otaLocalizationService } from '@/services/otaLocalizationService';
import { getIndicLineHeight, isRtlLocale, resolveOtaString } from '@/utils/otaI18n';
import type { OtaBundle, SupportedLocale, VoiceGateEntry } from '@/types/localization';

const LOCALES: Array<{ code: SupportedLocale; label: string }> = [
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ur', label: 'اردو' },
  { code: 'en', label: 'English' },
];

export default function GuardVoiceEntryScreen() {
  const [locale, setLocale] = useState<SupportedLocale>('te');
  const [bundle, setBundle] = useState<OtaBundle | null>(null);
  const [flatNumber, setFlatNumber] = useState('A-402');
  const [utterance, setUtterance] = useState('Urban Company nundi Ramesh');
  const [isRecording, setIsRecording] = useState(false);
  const [lastEntry, setLastEntry] = useState<VoiceGateEntry | null>(null);

  const loadLocale = useCallback(async (loc: SupportedLocale) => {
    const cached = await otaLocalizationService.getCachedBundle(loc, 'gate');
    if (cached) setBundle(cached);
    try {
      const fresh = await otaLocalizationService.fetchAndCacheBundle(loc, 'gate');
      setBundle(fresh);
    } catch {
      // Offline: embedded fallback + cached MMKV bundle remain active
    }
  }, []);

  useEffect(() => {
    void loadLocale(locale);
  }, [locale, loadLocale]);

  const rtl = isRtlLocale(locale);
  const promptText = resolveOtaString('gate.audioPrompt', locale, bundle?.strings);
  const holdText = resolveOtaString('gate.holdToSpeak', locale, bundle?.strings);
  const approveText = resolveOtaString('gate.approve', locale, bundle?.strings);
  const denyText = resolveOtaString('gate.deny', locale, bundle?.strings);

  const handlePlayPromptAudio = async () => {
    try {
      const tts = await otaLocalizationService.synthesizeTts(locale, promptText);
      Alert.alert(
        'Audio Voiceover',
        `${tts.codec} (${tts.sizeBytes} B) · ${tts.cacheHit ? 'Cache Hit' : 'Cached'}\n${promptText}`,
      );
    } catch {
      Alert.alert('Offline Voiceover', promptText);
    }
  };

  const handleVoiceRelease = async () => {
    setIsRecording(false);
    try {
      const entry = await otaLocalizationService.dispatchVoiceGateEntry({
        societyId: 1,
        guardUserId: 'guard_hyd_01',
        flatNumber,
        guardLocale: locale,
        residentLocale: 'en',
        spokenUtteranceHint: utterance,
      });
      setLastEntry(entry);
    } catch (err) {
      Alert.alert('Dispatch Error', err instanceof Error ? err.message : 'Unable to send clip');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Vernacular Guard Voice Entry</Text>

        {/* Language Picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langBar}>
          {LOCALES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langChip, locale === l.code && styles.langChipActive]}
              onPress={() => setLocale(l.code)}
            >
              <Text style={[styles.langText, locale === l.code && styles.langTextActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Audio-Assisted Prompt Card (48dp touch target + Indic line-height safety) */}
        <View style={[styles.card, rtl && styles.rtlCard]}>
          <View style={styles.promptHeader}>
            <Text
              style={[
                styles.promptText,
                { lineHeight: getIndicLineHeight(15, locale) },
                rtl && styles.rtlText,
              ]}
            >
              {promptText}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={promptText}
              style={styles.speakerBtn}
              onPress={() => void handlePlayPromptAudio()}
            >
              <Text style={styles.speakerIcon}>🔊</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionChips}>
            <View style={styles.approvePill}>
              <Text style={[styles.pillText, { lineHeight: getIndicLineHeight(13, locale) }]}>
                ✓ {approveText}
              </Text>
            </View>
            <View style={styles.denyPill}>
              <Text style={[styles.pillText, { lineHeight: getIndicLineHeight(13, locale) }]}>
                ✕ {denyText}
              </Text>
            </View>
          </View>
        </View>

        {/* 2s Hold-to-Talk Gate Entry */}
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={flatNumber}
            onChangeText={setFlatNumber}
            placeholder="Flat (e.g. A-402)"
          />
          <TextInput
            style={styles.input}
            value={utterance}
            onChangeText={setUtterance}
            placeholder="Spoken utterance"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={holdText}
            style={[styles.micBtn, isRecording && styles.micBtnRecording]}
            onPressIn={() => setIsRecording(true)}
            onPressOut={() => void handleVoiceRelease()}
          >
            <Text style={[styles.micText, { lineHeight: getIndicLineHeight(14, locale) }]}>
              {isRecording ? '● Recording 16kHz Opus… Release to Send' : `🎙️ ${holdText}`}
            </Text>
          </TouchableOpacity>
        </View>

        {lastEntry ? (
          <View style={styles.lockPreview}>
            <Text style={styles.lockHeader}>Resident Lock-Screen Alert Preview</Text>
            <Text style={styles.lockTitle}>
              {lastEntry.transcriptTranslated ?? '2s Guard Voice Note'} · Flat {lastEntry.flatNumber}
            </Text>
            <Text style={styles.lockMeta}>
              {lastEntry.audioCodec} ({lastEntry.audioSizeBytes} B) · {lastEntry.status}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 14 },
  header: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  langBar: { flexDirection: 'row' },
  langChip: {
    marginEnd: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  langTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
  },
  rtlCard: { direction: 'rtl' },
  rtlText: { textAlign: 'right' },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promptText: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  speakerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerIcon: { fontSize: 20 },
  actionChips: { flexDirection: 'row', gap: 8 },
  approvePill: { backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  denyPill: { backgroundColor: COLORS.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: COLORS.text,
  },
  micBtn: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  micBtnRecording: { backgroundColor: COLORS.error },
  micText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  lockPreview: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  lockHeader: { color: '#93C5FD', fontSize: 11, fontWeight: '700' },
  lockTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  lockMeta: { color: '#D1D5DB', fontSize: 12 },
});
