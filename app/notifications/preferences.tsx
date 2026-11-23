import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationService,
  type NotificationPreferences,
  type NotificationCategory,
} from '@/services/notificationService';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

const CATEGORY_META: Record<NotificationCategory, { label: string; emoji: string; desc: string }> = {
  SAFETY:    { label: 'Safety & Emergency', emoji: '🚨', desc: 'SOS alerts, fire drills, security incidents' },
  FINANCE:   { label: 'Finance & Payments', emoji: '💳', desc: 'Invoices, dues, payment receipts' },
  COMMUNITY: { label: 'Community',          emoji: '🏘️', desc: 'Posts, announcements, events' },
  SPORTS:    { label: 'Sports',             emoji: '🏆', desc: 'Tournaments, match results, registrations' },
  FOOD:      { label: 'Food & Orders',      emoji: '🍱', desc: 'Order updates, delivery status' },
  VISITORS:  { label: 'Visitors',           emoji: '🛡️', desc: 'Entry passes, gate approvals' },
  HELPDESK:  { label: 'Helpdesk',           emoji: '🎫', desc: 'Ticket updates, work order completion' },
  EVENTS:    { label: 'Events',             emoji: '📅', desc: 'Upcoming events, registrations' },
  OTHER:     { label: 'Other',              emoji: '🔔', desc: 'Marketplace, auctions, misc alerts' },
};

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00',
  '20:00', '21:00', '22:00', '23:00',
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn:  notificationService.getPreferences,
  });

  useEffect(() => { if (data) setPrefs(data); }, [data]);

  const saveMutation = useMutation({
    mutationFn: (p: NotificationPreferences) => notificationService.savePreferences(p),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] });
      router.back();
    },
  });

  function setCategoryPush(cat: NotificationCategory, value: boolean) {
    setPrefs((p) => {
      if (!p) return p;
      return {
        ...p,
        categorySettings: {
          ...p.categorySettings,
          [cat]: { ...p.categorySettings[cat], push: value },
        },
      };
    });
  }

  function setCategoryInApp(cat: NotificationCategory, value: boolean) {
    setPrefs((p) => {
      if (!p) return p;
      return {
        ...p,
        categorySettings: {
          ...p.categorySettings,
          [cat]: { ...p.categorySettings[cat], inApp: value },
        },
      };
    });
  }

  if (isLoading || !prefs) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.title}>Notification Preferences</Text>
        <TouchableOpacity
          style={[s.saveBtn, saveMutation.isPending && s.saveBtnDisabled]}
          onPress={() => saveMutation.mutate(prefs)}
          disabled={saveMutation.isPending}
        >
          <Text style={s.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Quiet Hours */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quiet Hours</Text>
          <Text style={s.sectionDesc}>Suppress push notifications during these hours</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="moon-outline" size={20} color={COLORS.primary} />
              <Text style={s.rowLabel}>Enable Quiet Hours</Text>
              <Switch
                value={prefs.quietHoursEnabled}
                onValueChange={(v) => setPrefs((p) => p ? { ...p, quietHoursEnabled: v } : p)}
                trackColor={{ true: COLORS.primary }}
              />
            </View>
            {prefs.quietHoursEnabled && (
              <>
                <View style={s.divider} />
                <Text style={s.subLabel}>From</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeRow}>
                  {TIME_OPTIONS.slice(5).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[s.timeChip, prefs.quietHoursStart === t && s.timeChipActive]}
                      onPress={() => setPrefs((p) => p ? { ...p, quietHoursStart: t } : p)}
                    >
                      <Text style={[s.timeChipText, prefs.quietHoursStart === t && s.timeChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={s.subLabel}>To</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeRow}>
                  {TIME_OPTIONS.slice(0, 5).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[s.timeChip, prefs.quietHoursEnd === t && s.timeChipActive]}
                      onPress={() => setPrefs((p) => p ? { ...p, quietHoursEnd: t } : p)}
                    >
                      <Text style={[s.timeChipText, prefs.quietHoursEnd === t && s.timeChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>

        {/* Daily Digest */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Daily Digest</Text>
          <Text style={s.sectionDesc}>Get a single daily summary instead of individual alerts</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="newspaper-outline" size={20} color={COLORS.primary} />
              <Text style={s.rowLabel}>Enable Daily Digest</Text>
              <Switch
                value={prefs.dailyDigestEnabled}
                onValueChange={(v) => setPrefs((p) => p ? { ...p, dailyDigestEnabled: v } : p)}
                trackColor={{ true: COLORS.primary }}
              />
            </View>
            {prefs.dailyDigestEnabled && (
              <>
                <View style={s.divider} />
                <Text style={s.subLabel}>Delivery Time</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeRow}>
                  {['06:00', '07:00', '08:00', '09:00', '18:00', '19:00', '20:00'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[s.timeChip, prefs.dailyDigestTime === t && s.timeChipActive]}
                      onPress={() => setPrefs((p) => p ? { ...p, dailyDigestTime: t } : p)}
                    >
                      <Text style={[s.timeChipText, prefs.dailyDigestTime === t && s.timeChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>

        {/* Category Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Notification Categories</Text>
          <Text style={s.sectionDesc}>Control push and in-app alerts per category</Text>
          {(Object.entries(CATEGORY_META) as [NotificationCategory, (typeof CATEGORY_META)[NotificationCategory]][]).map(
            ([cat, meta]) => {
              const cfg = prefs.categorySettings[cat];
              return (
                <View key={cat} style={[s.card, s.catCard]}>
                  <View style={s.catHeader}>
                    <Text style={s.catEmoji}>{meta.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.catLabel}>{meta.label}</Text>
                      <Text style={s.catDesc}>{meta.desc}</Text>
                    </View>
                  </View>
                  <View style={s.divider} />
                  <View style={s.row}>
                    <Ionicons name="phone-portrait-outline" size={16} color={COLORS.textMuted} />
                    <Text style={s.rowLabel}>Push Notifications</Text>
                    <Switch
                      value={cfg.push}
                      onValueChange={(v) => setCategoryPush(cat, v)}
                      trackColor={{ true: COLORS.primary }}
                    />
                  </View>
                  <View style={s.row}>
                    <Ionicons name="apps-outline" size={16} color={COLORS.textMuted} />
                    <Text style={s.rowLabel}>In-App Alerts</Text>
                    <Switch
                      value={cfg.inApp}
                      onValueChange={(v) => setCategoryInApp(cat, v)}
                      trackColor={{ true: COLORS.primary }}
                    />
                  </View>
                </View>
              );
            }
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  backBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title:              { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  saveBtn:            { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full },
  saveBtnDisabled:    { opacity: 0.5 },
  saveBtnText:        { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  scroll:             { paddingHorizontal: 16, paddingTop: 16, gap: 0 },
  section:            { marginBottom: 24 },
  sectionTitle:       { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sectionDesc:        { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  card:               { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm },
  catCard:            { marginBottom: 10 },
  catHeader:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  catEmoji:           { fontSize: 24, marginTop: 2 },
  catLabel:           { fontSize: 14, fontWeight: '700', color: COLORS.text },
  catDesc:            { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  row:                { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  rowLabel:           { flex: 1, fontSize: 14, color: COLORS.text },
  divider:            { height: 1, backgroundColor: COLORS.border },
  subLabel:           { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  timeRow:            { paddingHorizontal: 14, paddingBottom: 12 },
  timeChip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#F1F5F9', marginRight: 8 },
  timeChipActive:     { backgroundColor: COLORS.primary },
  timeChipText:       { fontSize: 12, fontWeight: '600', color: '#475569' },
  timeChipTextActive: { color: '#FFFFFF' },
});
