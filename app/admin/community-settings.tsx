import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { COLORS } from '@/constants/config';
import type { CommunitySettingsDto } from '@/types/api';

function SectionHeader({ title }: { title: string }) {
  return <Text style={sh.text}>{title}</Text>;
}
const sh = StyleSheet.create({
  text: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
});

function FieldInput({
  label, value, onChangeText, placeholder, keyboardType, editable = true,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; editable?: boolean;
}) {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={[fi.input, !editable && fi.disabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );
}
const fi = StyleSheet.create({
  wrap:     { gap: 5 },
  label:    { fontSize: 13, fontWeight: '600', color: COLORS.text },
  input:    { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  disabled: { backgroundColor: '#F9FAFB', color: COLORS.textMuted },
});

function FeatureToggle({
  emoji, label, sub, value, onValueChange,
}: {
  emoji: string; label: string; sub: string; value: boolean; onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={ft.row}>
      <Text style={ft.emoji}>{emoji}</Text>
      <View style={ft.info}>
        <Text style={ft.label}>{label}</Text>
        <Text style={ft.sub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}
const ft = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  emoji: { fontSize: 22, width: 28 },
  info:  { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
});

// ── Screen ─────────────────────────────────────────────────────
export default function CommunitySettingsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-community-settings'],
    queryFn:  adminService.getCommunitySettings,
  });

  // Local form state — initialised from server data
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [address,     setAddress]     = useState('');
  const [city,        setCity]        = useState('');
  const [state,       setState]       = useState('');
  const [maxMembers,  setMaxMembers]  = useState('');
  const [inviteCode,  setInviteCode]  = useState('');
  const [features, setFeatures] = useState<CommunitySettingsDto['features']>({
    marketplace: true, sports: true, auction: true, jobs: true, polls: true,
  });

  useEffect(() => {
    if (!settings) return;
    setName(settings.name);
    setDescription(settings.description ?? '');
    setAddress(settings.address);
    setCity(settings.city);
    setState(settings.state);
    setMaxMembers(String(settings.maxMembers));
    setInviteCode(settings.inviteCode);
    setFeatures(settings.features);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => adminService.updateCommunitySettings({
      name, description, address, city, state,
      maxMembers: Number(maxMembers),
      features,
    }),
    onSuccess: (updated) => {
      setInviteCode(updated.inviteCode);
      qc.invalidateQueries({ queryKey: ['admin-community-settings'] });
      Alert.alert('Saved', 'Community settings updated.');
    },
    onError: () => Alert.alert('Error', 'Failed to save settings.'),
  });

  const regenMutation = useMutation({
    mutationFn: adminService.regenerateInviteCode,
    onSuccess: ({ inviteCode: newCode }) => {
      setInviteCode(newCode);
      Alert.alert('New Code', `Invite code regenerated:\n\n${newCode}\n\nShare this with new residents.`);
    },
    onError: () => Alert.alert('Error', 'Failed to regenerate code.'),
  });

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join our community on Mana Community!\nUse invite code: ${inviteCode}\nDownload the app: https://manacommunity.in`,
      });
    } catch {}
  };

  const toggleFeature = (key: keyof CommunitySettingsDto['features']) =>
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));

  if (isLoading) {
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Community Settings</Text>
        <TouchableOpacity
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={s.save}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Invite Code ── */}
          <View style={s.section}>
            <SectionHeader title="Invite Code" />
            <View style={s.inviteRow}>
              <View style={s.inviteBox}>
                <Text style={s.inviteCode}>{inviteCode}</Text>
                <Text style={s.inviteHint}>Share with new residents to join</Text>
              </View>
              <View style={s.inviteActions}>
                <TouchableOpacity style={s.inviteBtn} onPress={handleShareCode}>
                  <Text style={s.inviteBtnText}>📤 Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.inviteBtn, s.inviteBtnDanger]}
                  onPress={() =>
                    Alert.alert('Regenerate Code?',
                      'Old invite links will stop working immediately. Existing members are not affected.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Regenerate', style: 'destructive', onPress: () => regenMutation.mutate() },
                      ])
                  }
                  disabled={regenMutation.isPending}
                >
                  {regenMutation.isPending
                    ? <ActivityIndicator size="small" color={COLORS.error} />
                    : <Text style={[s.inviteBtnText, { color: COLORS.error }]}>🔄 Regen</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Community Info ── */}
          <View style={s.section}>
            <SectionHeader title="Community Info" />
            <FieldInput label="Community Name *" value={name} onChangeText={setName} placeholder="Sunrise Towers" />
            <FieldInput label="Description"       value={description} onChangeText={setDescription} placeholder="About your community…" />
            <FieldInput label="Address"           value={address} onChangeText={setAddress} />
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <FieldInput label="City"  value={city}  onChangeText={setCity}  placeholder="Hyderabad" />
              </View>
              <View style={{ flex: 1 }}>
                <FieldInput label="State" value={state} onChangeText={setState} placeholder="Telangana" />
              </View>
            </View>
            <FieldInput label="Max Members" value={maxMembers} onChangeText={setMaxMembers} keyboardType="number-pad" />
          </View>

          {/* ── Feature Toggles ── */}
          <View style={s.section}>
            <SectionHeader title="Features" />
            <View style={s.featureCard}>
              <FeatureToggle emoji="🛒" label="Marketplace"   sub="Buy/sell within community"      value={features.marketplace} onValueChange={() => toggleFeature('marketplace')} />
              <View style={s.divider} />
              <FeatureToggle emoji="🏆" label="Sports"        sub="Tournaments & team management"  value={features.sports}      onValueChange={() => toggleFeature('sports')} />
              <View style={s.divider} />
              <FeatureToggle emoji="🔨" label="Live Auction"  sub="Community auction bidding"      value={features.auction}     onValueChange={() => toggleFeature('auction')} />
              <View style={s.divider} />
              <FeatureToggle emoji="💼" label="Job Board"     sub="Neighbour job postings"         value={features.jobs}        onValueChange={() => toggleFeature('jobs')} />
              <View style={s.divider} />
              <FeatureToggle emoji="📊" label="Polls"         sub="Community voting & polls"       value={features.polls}       onValueChange={() => toggleFeature('polls')} />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:            { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:           { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  save:            { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  scroll:          { padding: 16, gap: 16 },
  section:         { gap: 12, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  inviteRow:       { gap: 12 },
  inviteBox:       { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
  inviteCode:      { fontSize: 28, fontWeight: '900', letterSpacing: 4, color: COLORS.primary },
  inviteHint:      { fontSize: 12, color: COLORS.textMuted },
  inviteActions:   { flexDirection: 'row', gap: 10 },
  inviteBtn:       { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  inviteBtnDanger: { borderColor: COLORS.error },
  inviteBtnText:   { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  row2:            { flexDirection: 'row', gap: 10 },
  featureCard:     { gap: 0 },
  divider:         { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
});
