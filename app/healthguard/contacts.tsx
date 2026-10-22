import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, SPACING } from "@/constants/config";
import { healthGuardService } from "@/services/healthGuardService";
import type { EmergencyContactDto, ContactRelationship } from "@/types/healthguard";

const RELATIONSHIPS: ContactRelationship[] = [
  "SPOUSE", "PARENT", "CHILD", "SIBLING", "FRIEND", "NEIGHBOR", "DOCTOR", "CAREGIVER", "OTHER",
];

const BLANK: Partial<EmergencyContactDto> = {
  name: "", phone: "", email: "", relationship: "OTHER",
  priority: 1, notifyOnSos: true, notifyOnAlert: true,
};

export default function ContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<EmergencyContactDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<EmergencyContactDto>>({ ...BLANK });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    healthGuardService.getContacts()
      .then(list => setContacts(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof EmergencyContactDto>(key: K, value: EmergencyContactDto[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.name?.trim() || !form.phone?.trim()) {
      Alert.alert("Required", "Name and phone are required.");
      return;
    }
    setSaving(true);
    try {
      if (editId != null) {
        const updated = await healthGuardService.updateContact(editId, form as EmergencyContactDto);
        setContacts(prev => prev.map(c => c.id === editId ? updated : c));
      } else {
        const created = await healthGuardService.addContact(form as EmergencyContactDto);
        setContacts(prev => [...prev, created]);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ ...BLANK });
    } catch {
      Alert.alert("Error", "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Remove Contact", "Remove this emergency contact?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try {
            await healthGuardService.deleteContact(id);
            setContacts(prev => prev.filter(c => c.id !== id));
          } catch {
            Alert.alert("Error", "Failed to remove contact.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.PRIMARY} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Nav */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="chevron-back" size={22} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Emergency Contacts</Text>
        {!showForm && (
          <TouchableOpacity style={styles.addBtn} onPress={() => { setForm({ ...BLANK }); setEditId(null); setShowForm(true); }}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Add/Edit Form */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editId ? "Edit Contact" : "New Emergency Contact"}</Text>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput style={styles.input} placeholder="Contact name" placeholderTextColor={COLORS.TEXT_SECONDARY} value={form.name ?? ""} onChangeText={t => set("name", t)} />
          <Text style={styles.label}>Phone *</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" placeholder="+91-XXXXXXXXXX" placeholderTextColor={COLORS.TEXT_SECONDARY} value={form.phone ?? ""} onChangeText={t => set("phone", t)} />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} keyboardType="email-address" placeholder="email@example.com" placeholderTextColor={COLORS.TEXT_SECONDARY} value={form.email ?? ""} onChangeText={t => set("email", t)} autoCapitalize="none" />
          <Text style={styles.label}>Relationship</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {RELATIONSHIPS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, form.relationship === r && styles.chipActive]}
                  onPress={() => set("relationship", r)}
                >
                  <Text style={[styles.chipText, form.relationship === r && styles.chipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={styles.toggle} onPress={() => set("notifyOnSos", !form.notifyOnSos)}>
              <View style={[styles.checkbox, form.notifyOnSos && styles.checkboxChecked]}>
                {form.notifyOnSos && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.toggleText}>Notify on SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggle} onPress={() => set("notifyOnAlert", !form.notifyOnAlert)}>
              <View style={[styles.checkbox, form.notifyOnAlert && styles.checkboxChecked]}>
                {form.notifyOnAlert && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.toggleText}>Notify on Alert</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formBtns}>
            <TouchableOpacity style={styles.saveFormBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveFormBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelFormBtn} onPress={() => { setShowForm(false); setEditId(null); setForm({ ...BLANK }); }}>
              <Text style={styles.cancelFormBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Contact list */}
      {contacts.length === 0 && !showForm ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyTitle}>No emergency contacts</Text>
          <Text style={styles.emptySub}>Add people who should be notified in an emergency</Text>
          <TouchableOpacity style={styles.addBtn2} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtn2Text}>Add First Contact</Text>
          </TouchableOpacity>
        </View>
      ) : (
        contacts.map((c, idx) => (
          <View key={c.id} style={styles.contactCard}>
            <View style={styles.contactAvatar}>
              <Text style={styles.contactInitial}>{c.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactIdx}>#{idx + 1}</Text>
              </View>
              <Text style={styles.contactPhone}>{c.phone}</Text>
              <View style={styles.contactBadges}>
                <View style={styles.badge}><Text style={styles.badgeText}>{c.relationship}</Text></View>
                {c.notifyOnSos && <View style={[styles.badge, styles.sosBadge]}><Text style={[styles.badgeText, styles.sosBadgeText]}>SOS</Text></View>}
              </View>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => { setForm({ ...c }); setEditId(c.id ?? null); setShowForm(true); }}>
                <Ionicons name="pencil-outline" size={16} color={COLORS.PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => c.id && handleDelete(c.id)}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: SPACING.MD, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  backIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...SHADOWS.SM },
  navTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.PRIMARY, alignItems: "center", justifyContent: "center" },
  formCard: { backgroundColor: "#fff", borderRadius: RADIUS.LG, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: COLORS.PRIMARY + "40", ...SHADOWS.SM },
  formTitle: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_PRIMARY, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: COLORS.TEXT_SECONDARY, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: RADIUS.MD, padding: 11, fontSize: 14, color: COLORS.TEXT_PRIMARY, backgroundColor: "#f8fafc", marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  chipActive: { backgroundColor: COLORS.PRIMARY + "15", borderColor: COLORS.PRIMARY },
  chipText: { fontSize: 12, color: COLORS.TEXT_SECONDARY },
  chipTextActive: { color: COLORS.PRIMARY, fontWeight: "600" },
  toggleRow: { flexDirection: "row", gap: 16, marginBottom: 14 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: "#94a3b8", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  toggleText: { fontSize: 13, color: COLORS.TEXT_PRIMARY },
  formBtns: { flexDirection: "row", gap: 10 },
  saveFormBtn: { flex: 1, backgroundColor: COLORS.PRIMARY, borderRadius: RADIUS.MD, padding: 12, alignItems: "center" },
  saveFormBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelFormBtn: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: RADIUS.MD, padding: 12, alignItems: "center" },
  cancelFormBtnText: { color: COLORS.TEXT_PRIMARY, fontWeight: "600", fontSize: 14 },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  emptySub: { fontSize: 13, color: COLORS.TEXT_SECONDARY, textAlign: "center" },
  addBtn2: { marginTop: 8, backgroundColor: COLORS.PRIMARY, borderRadius: RADIUS.MD, paddingHorizontal: 20, paddingVertical: 10 },
  addBtn2Text: { color: "#fff", fontWeight: "700", fontSize: 14 },
  contactCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.MD, padding: 12, marginBottom: 8, ...SHADOWS.SM },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginRight: 10 },
  contactInitial: { fontSize: 17, fontWeight: "700", color: "#1d4ed8" },
  contactName: { fontSize: 14, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  contactIdx: { fontSize: 11, color: COLORS.TEXT_SECONDARY },
  contactPhone: { fontSize: 12, color: COLORS.TEXT_SECONDARY, marginTop: 1 },
  contactBadges: { flexDirection: "row", gap: 4, marginTop: 4 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  badgeText: { fontSize: 10, color: COLORS.TEXT_SECONDARY },
  sosBadge: { backgroundColor: "#fef2f2", borderColor: "#fca5a5" },
  sosBadgeText: { color: "#dc2626", fontWeight: "700" },
  contactActions: { flexDirection: "row", gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" },
});
