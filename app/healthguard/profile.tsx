import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Switch, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, SPACING } from "@/constants/config";
import { healthGuardService } from "@/services/healthGuardService";
import type { HealthProfileDto, BloodGroup } from "@/types/healthguard";

const BLOOD_GROUPS: { value: BloodGroup; label: string }[] = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "A_POSITIVE", label: "A+" },
  { value: "A_NEGATIVE", label: "A−" },
  { value: "B_POSITIVE", label: "B+" },
  { value: "B_NEGATIVE", label: "B−" },
  { value: "AB_POSITIVE", label: "AB+" },
  { value: "AB_NEGATIVE", label: "AB−" },
  { value: "O_POSITIVE", label: "O+" },
  { value: "O_NEGATIVE", label: "O−" },
];

const BLANK: Partial<HealthProfileDto> = {
  bloodGroup: "UNKNOWN",
  allergies: "",
  medicalConditions: "",
  emergencyNotes: "",
  organDonorConsent: false,
  medicalIdNumber: "",
  physicianName: "",
  physicianPhone: "",
};

export default function HealthProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<HealthProfileDto>>({ ...BLANK });
  const [showBGPicker, setShowBGPicker] = useState(false);

  useEffect(() => {
    healthGuardService.getProfile()
      .then(p => setForm({ ...BLANK, ...p }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = useCallback(<K extends keyof HealthProfileDto>(key: K, value: HealthProfileDto[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await healthGuardService.saveProfile(form as HealthProfileDto);
      setForm({ ...BLANK, ...saved });
      Alert.alert("Saved", "Health profile updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const bmi = form.heightCm && form.weightKg
    ? (form.weightKg / Math.pow(form.heightCm / 100, 2)).toFixed(1)
    : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Nav */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="chevron-back" size={22} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Health Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* Basic info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Health Info</Text>

        <Text style={styles.label}>Blood Group</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowBGPicker(!showBGPicker)}>
          <Text style={styles.pickerText}>{BLOOD_GROUPS.find(b => b.value === form.bloodGroup)?.label ?? "Unknown"}</Text>
          <Ionicons name={showBGPicker ? "chevron-up" : "chevron-down"} size={16} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
        {showBGPicker && (
          <View style={styles.dropdownBox}>
            {BLOOD_GROUPS.map(bg => (
              <TouchableOpacity
                key={bg.value}
                style={[styles.dropdownItem, form.bloodGroup === bg.value && styles.dropdownItemActive]}
                onPress={() => { set("bloodGroup", bg.value); setShowBGPicker(false); }}
              >
                <Text style={[styles.dropdownText, form.bloodGroup === bg.value && styles.dropdownTextActive]}>{bg.label}</Text>
                {form.bloodGroup === bg.value && <Ionicons name="checkmark" size={16} color={COLORS.PRIMARY} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="170"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              value={form.heightCm?.toString() ?? ""}
              onChangeText={t => set("heightCm", t ? parseInt(t) : undefined as unknown as number)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Weight (kg){bmi ? `  BMI: ${bmi}` : ""}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="65"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              value={form.weightKg?.toString() ?? ""}
              onChangeText={t => set("weightKg", t ? parseInt(t) : undefined as unknown as number)}
            />
          </View>
        </View>

        <Text style={styles.label}>Medical ID / ABHA Number</Text>
        <TextInput
          style={styles.input}
          placeholder="ABHA or health ID"
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          value={form.medicalIdNumber ?? ""}
          onChangeText={t => set("medicalIdNumber", t)}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Organ Donor</Text>
            <Text style={styles.switchSub}>I consent to organ donation</Text>
          </View>
          <Switch
            value={form.organDonorConsent ?? false}
            onValueChange={v => set("organDonorConsent", v)}
            trackColor={{ true: COLORS.PRIMARY }}
          />
        </View>
      </View>

      {/* Medical conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conditions & Allergies</Text>

        <Text style={styles.label}>Known Allergies</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholder="e.g. Penicillin, peanuts, latex..."
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          value={form.allergies ?? ""}
          onChangeText={t => set("allergies", t)}
        />

        <Text style={styles.label}>Medical Conditions</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholder="e.g. Diabetes Type 2, hypertension..."
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          value={form.medicalConditions ?? ""}
          onChangeText={t => set("medicalConditions", t)}
        />

        <Text style={styles.label}>Emergency Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          placeholder="e.g. Takes insulin, do not give NSAIDs..."
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          value={form.emergencyNotes ?? ""}
          onChangeText={t => set("emergencyNotes", t)}
        />
        <Text style={styles.hint}>Shown to emergency responders</Text>
      </View>

      {/* Physician */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Physician</Text>

        <Text style={styles.label}>Physician Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Dr. Name"
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          value={form.physicianName ?? ""}
          onChangeText={t => set("physicianName", t)}
        />

        <Text style={styles.label}>Physician Phone</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="+91-XXXXXXXXXX"
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          value={form.physicianPhone ?? ""}
          onChangeText={t => set("physicianPhone", t)}
        />
      </View>

      <TouchableOpacity style={styles.saveFullBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={styles.saveFullBtnText}>Save Health Profile</Text></>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: SPACING.MD, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  backIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...SHADOWS.SM },
  navTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  saveBtn: { backgroundColor: COLORS.PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  section: { backgroundColor: "#fff", borderRadius: RADIUS.LG, padding: 16, marginBottom: 14, ...SHADOWS.SM },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_PRIMARY, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: COLORS.TEXT_SECONDARY, marginBottom: 6, marginTop: 2 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: RADIUS.MD, padding: 11, fontSize: 14, color: COLORS.TEXT_PRIMARY, backgroundColor: "#f8fafc", marginBottom: 10 },
  textArea: { minHeight: 72 },
  hint: { fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: -6, marginBottom: 10 },
  picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: RADIUS.MD, padding: 11, backgroundColor: "#f8fafc", marginBottom: 4 },
  pickerText: { fontSize: 14, color: COLORS.TEXT_PRIMARY },
  dropdownBox: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: RADIUS.MD, backgroundColor: "#fff", marginBottom: 10, overflow: "hidden" },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  dropdownItemActive: { backgroundColor: COLORS.PRIMARY + "10" },
  dropdownText: { fontSize: 14, color: COLORS.TEXT_PRIMARY },
  dropdownTextActive: { color: COLORS.PRIMARY, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10 },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  switchLabel: { fontSize: 14, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  switchSub: { fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: 1 },
  saveFullBtn: { backgroundColor: COLORS.PRIMARY, borderRadius: RADIUS.LG, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, ...SHADOWS.MD },
  saveFullBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
