import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { healthGuardService } from '@/services/healthGuardService';
import type { HealthProfileDto, BloodGroup } from '@/types/healthguard';

const BLOOD_GROUPS: BloodGroup[] = [
  'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
  'O_POSITIVE', 'O_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'UNKNOWN',
];
const BG_LABEL: Record<BloodGroup, string> = {
  A_POSITIVE: 'A+', A_NEGATIVE: 'A−', B_POSITIVE: 'B+', B_NEGATIVE: 'B−',
  O_POSITIVE: 'O+', O_NEGATIVE: 'O−', AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB−', UNKNOWN: '?',
};

export default function HealthProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<HealthProfileDto>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    healthGuardService.getProfile().then(p => { setProfile(p); setLoading(false); });
  }, []);

  const set = (key: keyof HealthProfileDto, value: any) =>
    setProfile(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await healthGuardService.saveProfile(profile);
      setProfile(saved);
      setEditing(false);
      Alert.alert('Saved', 'Health profile updated.');
    } catch {
      Alert.alert('Error', 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Health Profile</Text>
        <TouchableOpacity onPress={() => editing ? save() : setEditing(true)} style={styles.editBtn} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> :
            <Text style={styles.editBtnText}>{editing ? 'Save' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      {/* Blood Group */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Blood Group</Text>
        <View style={styles.bgGrid}>
          {BLOOD_GROUPS.map(bg => (
            <TouchableOpacity
              key={bg}
              style={[styles.bgChip, profile.bloodGroup === bg && styles.bgChipSelected]}
              onPress={() => editing && set('bloodGroup', bg)}
              activeOpacity={editing ? 0.7 : 1}
            >
              <Text style={[styles.bgChipText, profile.bloodGroup === bg && styles.bgChipTextSelected]}>
                {BG_LABEL[bg]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Physical */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Physical Details</Text>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Height (cm)</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputReadonly]}
              value={profile.heightCm?.toString() ?? ''}
              onChangeText={v => set('heightCm', v ? parseInt(v) : undefined)}
              keyboardType="numeric" editable={editing} placeholderTextColor={COLORS.textSecondary}
              placeholder="170"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputReadonly]}
              value={profile.weightKg?.toString() ?? ''}
              onChangeText={v => set('weightKg', v ? parseFloat(v) : undefined)}
              keyboardType="numeric" editable={editing} placeholderTextColor={COLORS.textSecondary}
              placeholder="70"
            />
          </View>
        </View>
        <Text style={styles.fieldLabel}>Date of Birth</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputReadonly]}
          value={profile.dateOfBirth ?? ''}
          onChangeText={v => set('dateOfBirth', v)}
          editable={editing} placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* Medical */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Medical Information</Text>
        <Text style={styles.fieldLabel}>Allergies</Text>
        <TextInput
          style={[styles.input, styles.multiline, !editing && styles.inputReadonly]}
          value={profile.allergies ?? ''}
          onChangeText={v => set('allergies', v)}
          editable={editing} multiline placeholder="e.g. Penicillin, peanuts"
          placeholderTextColor={COLORS.textSecondary}
        />
        <Text style={styles.fieldLabel}>Medical Conditions</Text>
        <TextInput
          style={[styles.input, styles.multiline, !editing && styles.inputReadonly]}
          value={profile.medicalConditions ?? ''}
          onChangeText={v => set('medicalConditions', v)}
          editable={editing} multiline placeholder="e.g. Diabetes, Hypertension"
          placeholderTextColor={COLORS.textSecondary}
        />
        <Text style={styles.fieldLabel}>Emergency Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline, !editing && styles.inputReadonly]}
          value={profile.emergencyNotes ?? ''}
          onChangeText={v => set('emergencyNotes', v)}
          editable={editing} multiline placeholder="e.g. Carry EpiPen, DNR order"
          placeholderTextColor={COLORS.textSecondary}
        />
        <Text style={styles.fieldLabel}>Medical ID Number</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputReadonly]}
          value={profile.medicalIdNumber ?? ''}
          onChangeText={v => set('medicalIdNumber', v)}
          editable={editing} placeholder="Aadhaar / Health ID"
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* Physician */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Primary Physician</Text>
        <Text style={styles.fieldLabel}>Doctor Name</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputReadonly]}
          value={profile.physicianName ?? ''}
          onChangeText={v => set('physicianName', v)}
          editable={editing} placeholder="Dr. Sharma"
          placeholderTextColor={COLORS.textSecondary}
        />
        <Text style={styles.fieldLabel}>Phone</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputReadonly]}
          value={profile.physicianPhone ?? ''}
          onChangeText={v => set('physicianPhone', v)}
          keyboardType="phone-pad" editable={editing} placeholder="+91-XXXXXXXXXX"
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* Organ Donor */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Organ Donor Consent</Text>
            <Text style={styles.switchSub}>Shared with responders in an emergency</Text>
          </View>
          <Switch
            onValueChange={v => {
              if (editing) set('organDonorConsent', v);
            }}
            trackColor={{ true: COLORS.primary }}
            disabled={!editing}
          />
        </View>
      </View>

      {editing && (
        <TouchableOpacity style={styles.saveBar} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBarText}>Save Health Profile</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 48 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  fieldLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14,
  },
  inputReadonly: { borderColor: 'transparent', paddingHorizontal: 0 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: SPACING.sm },
  halfField: { flex: 1 },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bgChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border },
  bgChipSelected: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  bgChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  bgChipTextSelected: { color: '#ef4444' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  switchSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  saveBar: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 16, alignItems: 'center', marginTop: SPACING.sm, ...SHADOWS.md,
  },
  saveBarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
