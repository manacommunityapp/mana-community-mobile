import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { notificationPreferencesService } from '@/services/notificationPreferencesService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import type { UserSmsPreferenceRequest } from '@/types/api';

interface CategoryConfig {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  description: string;
  types: string[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'sports',
    title: 'Sports & Tournaments',
    icon: 'trophy-outline',
    color: '#D97706',
    bg: '#FEF3C7',
    description: 'Match reminders, live scores, team updates & tournament announcements',
    types: ['MATCH_REMINDER', 'SCHEDULE_UPDATED', 'WINNER_NOTIFICATION', 'TOURNAMENT_ANNOUNCEMENT'],
  },
  {
    id: 'events',
    title: 'Events & Circulars',
    icon: 'calendar-outline',
    color: '#2563EB',
    bg: '#DBEAFE',
    description: 'Community gatherings, cultural events, maintenance notices & circulars',
    types: ['EVENT_UPDATED', 'GENERAL', 'REGISTRATION_CONFIRMED'],
  },
  {
    id: 'auctions',
    title: 'Auctions & Bidding',
    icon: 'flash-outline',
    color: '#0891B2',
    bg: '#CFFAFE',
    description: 'Instant outbid alerts, auction starting notifications and hammer falls',
    types: ['BID_OUTBID', 'AUCTION_STARTED', 'PLAYER_SOLD', 'AUCTION_COMPLETED'],
  },
  {
    id: 'visitors',
    title: 'Gate & Visitor Security',
    icon: 'shield-checkmark-outline',
    color: '#059669',
    bg: '#D1FAE5',
    description: 'Visitor arrival approvals, delivery entries & gate pass status',
    types: ['VISITOR_PENDING', 'VISITOR_CHECK_IN'],
  },
  {
    id: 'commute',
    title: 'Commute & Carpooling',
    icon: 'car-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    description: 'Ride booking requests, ride confirmations & departure reminders',
    types: ['COMMUTE_BOOKING_CONFIRMED', 'COMMUTE_RIDE_REMINDER', 'COMMUTE_BOOKING_RECEIVED'],
  },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [preferredLang, setPreferredLang] = useState('en');

  // Category channel states: { [categoryId]: { push: boolean, sms: boolean, whatsapp: boolean } }
  const [channelState, setChannelState] = useState<Record<string, { push: boolean; sms: boolean; whatsapp: boolean }>>({
    sports:   { push: true, sms: false, whatsapp: true },
    events:   { push: true, sms: true,  whatsapp: true },
    auctions: { push: true, sms: false, whatsapp: true },
    visitors: { push: true, sms: true,  whatsapp: true },
    commute:  { push: true, sms: false, whatsapp: false },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const serverPrefs = await notificationPreferencesService.getPreferences();
      if (serverPrefs && serverPrefs.length > 0) {
        // Map server preferences to categories
        const updated = { ...channelState };
        let foundLang = 'en';

        serverPrefs.forEach((p) => {
          if (p.preferredLanguage) foundLang = p.preferredLanguage;
          // Find matching category
          const cat = CATEGORIES.find((c) => c.types.includes(p.notificationType));
          if (cat) {
            updated[cat.id] = {
              push: p.pushEnabled ?? updated[cat.id].push,
              sms: p.smsEnabled,
              whatsapp: p.whatsappEnabled,
            };
          }
        });
        setChannelState(updated);
        setPreferredLang(foundLang);
      }
    } catch (e) {
      console.warn('Failed to load preferences', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (catId: string, channel: 'push' | 'sms' | 'whatsapp', val: boolean) => {
    setChannelState((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        [channel]: val,
      },
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      const requests: UserSmsPreferenceRequest[] = [];
      CATEGORIES.forEach((cat) => {
        const catState = channelState[cat.id];
        cat.types.forEach((type) => {
          requests.push({
            notificationType: type,
            smsEnabled: catState.sms,
            whatsappEnabled: catState.whatsapp,
            preferredLanguage: preferredLang,
          });
        });
      });

      await notificationPreferencesService.batchUpdate(requests);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Notification Preferences"
        subtitle="Manage push, SMS & WhatsApp delivery"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notification preferences...</Text>
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
              <Text style={styles.successBannerText}>Preferences saved successfully!</Text>
            </View>
          )}

          {/* Intro Card */}
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons name="notifications" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.introTitle}>Multi-Channel Alerts</Text>
              <Text style={styles.introSubtitle}>
                Choose how you want to be notified for each society activity. SMS and WhatsApp alerts
                are delivered to your registered mobile number.
              </Text>
            </View>
          </View>

          {/* Preferred Language Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionCardTitle}>SMS & WhatsApp Alert Language</Text>
            </View>
            <Text style={styles.langHelpText}>
              Select your preferred language for automated text message updates:
            </Text>
            <View style={styles.langChipsRow}>
              {LANGUAGES.map((lang) => {
                const isSelected = preferredLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langChip, isSelected && styles.langChipSelected]}
                    onPress={() => {
                      setPreferredLang(lang.code);
                      setSaveSuccess(false);
                    }}
                  >
                    <Text style={[styles.langChipText, isSelected && styles.langChipTextSelected]}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category Preference Cards */}
          <Text style={styles.groupHeading}>Categories & Delivery Channels</Text>

          {CATEGORIES.map((cat) => {
            const state = channelState[cat.id];
            return (
              <View key={cat.id} style={styles.catCard}>
                <View style={styles.catCardHeader}>
                  <View style={[styles.catIconWrap, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon} size={20} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catTitle}>{cat.title}</Text>
                    <Text style={styles.catDesc}>{cat.description}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Channel Toggles */}
                <View style={styles.togglesContainer}>
                  {/* Push Notifications */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelGroup}>
                      <Ionicons name="phone-portrait-outline" size={17} color={COLORS.textSecondary} />
                      <Text style={styles.toggleTitle}>Push Notifications</Text>
                    </View>
                    <Switch
                      value={state.push}
                      onValueChange={(val) => toggleChannel(cat.id, 'push', val)}
                      trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                      thumbColor={state.push ? COLORS.primary : '#9CA3AF'}
                    />
                  </View>

                  {/* SMS Alerts */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelGroup}>
                      <Ionicons name="chatbubble-ellipses-outline" size={17} color={COLORS.textSecondary} />
                      <Text style={styles.toggleTitle}>SMS Text Alerts</Text>
                    </View>
                    <Switch
                      value={state.sms}
                      onValueChange={(val) => toggleChannel(cat.id, 'sms', val)}
                      trackColor={{ false: '#E5E7EB', true: COLORS.primaryLight }}
                      thumbColor={state.sms ? COLORS.primary : '#9CA3AF'}
                    />
                  </View>

                  {/* WhatsApp Messages */}
                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.toggleLabelGroup}>
                      <Ionicons name="logo-whatsapp" size={17} color="#16A34A" />
                      <Text style={styles.toggleTitle}>WhatsApp Updates</Text>
                    </View>
                    <Switch
                      value={state.whatsapp}
                      onValueChange={(val) => toggleChannel(cat.id, 'whatsapp', val)}
                      trackColor={{ false: '#E5E7EB', true: '#DCFCE7' }}
                      thumbColor={state.whatsapp ? '#16A34A' : '#9CA3AF'}
                    />
                  </View>
                </View>
              </View>
            );
          })}

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
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Preferences</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
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

  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primaryDark, marginBottom: 2 },
  introSubtitle: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    ...SHADOWS.sm,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionCardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  langHelpText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  langChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  langChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  langChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  langChipTextSelected: { color: COLORS.primary, fontWeight: '700' },

  groupHeading: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },

  catCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    ...SHADOWS.sm,
  },
  catCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  catTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  catDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  togglesContainer: { gap: 6 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: 10,
    ...SHADOWS.md,
  },
  saveBtnDisabled: { backgroundColor: '#A5B4FC' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
