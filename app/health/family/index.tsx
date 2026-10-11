import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Modal, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { FamilyMemberDto, FamilyRelationship } from "@/types/health";

export default function FamilyHealthScreen() {
  const [family, setFamily] = useState<FamilyMemberDto[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship>("CHILD");
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [allergies, setAllergies] = useState("");

  useEffect(() => {
    healthService.getFamilyMembers().then(setFamily);
  }, []);

  const handleAddMember = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter full name");
      return;
    }
    const created: FamilyMemberDto = {
      id: "fam-" + Date.now(),
      residentUserId: "usr-me",
      fullName: name.trim(),
      relationship,
      age: parseInt(age) || 0,
      gender: "MALE",
      bloodGroup,
      allergies: allergies ? allergies.split(",").map(s => s.trim()) : [],
      consentToShareRecords: true
    };
    await healthService.addFamilyMember(created);
    setFamily(prev => [...prev, created]);
    setShowAddModal(false);
    setName("");
    setAge("");
    Alert.alert("Success", `${created.fullName} added to family health hub.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.privacyBanner}>
          <Ionicons name="lock-closed" size={18} color="#0F766E" />
          <Text style={styles.privacyText}>
            Privacy Rule: Family medical records are never shared automatically. Each family profile operates with strict isolated consent.
          </Text>
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.sectionHeader}>Family Profiles ({family.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Member</Text>
          </TouchableOpacity>
        </View>

        {family.map(m => (
          <View key={m.id} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.fullName}</Text>
                <Text style={styles.rel}>{m.relationship} • {m.age} yrs • Blood Group: {m.bloodGroup || "N/A"}</Text>
              </View>
            </View>
            {m.allergies && m.allergies.length > 0 && (
              <View style={styles.allergyWrap}>
                <Text style={styles.allergyLabel}>Allergies: {m.allergies.join(", ")}</Text>
              </View>
            )}

            {m.chronicConditions && m.chronicConditions.length > 0 && (
              <View style={[styles.allergyWrap, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.allergyLabel, { color: "#B45309" }]}>Conditions: {m.chronicConditions.join(", ")}</Text>
              </View>
            )}

            {/* Elder Care / Caregiver Delegation */}
            {m.caregivers && m.caregivers.length > 0 && (
              <View style={{ backgroundColor: "#F0FDFA", padding: 8, borderRadius: 8, gap: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#0F766E" }}>👵 Authorized Caregivers:</Text>
                {m.caregivers.map((cg, i) => (
                  <Text key={i} style={{ fontSize: 10, color: "#334155" }}>
                    • {cg.caregiverName} ({cg.accessScope.replace("_", " ")})
                  </Text>
                ))}
              </View>
            )}

            {/* Upcoming Reminders */}
            {m.upcomingReminders && m.upcomingReminders.length > 0 && (
              <View style={{ backgroundColor: "#EEF2FF", padding: 8, borderRadius: 8, gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#4338CA" }}>🔔 Reminders & Vaccinations:</Text>
                {m.upcomingReminders.map((rem, i) => (
                  <View key={i} style={{ backgroundColor: "#FFFFFF", padding: 6, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#1E293B" }}>{rem.title}</Text>
                    <Text style={{ fontSize: 10, color: "#6366F1" }}>Due: {rem.dueDate}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.consentRow}>
              <Text style={styles.consentLabel}>Consent to share records with consulting doctors</Text>
              <Switch value={m.consentToShareRecords} trackColor={{ true: "#0D9488", false: "#D1D5DB" }} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Maya Varma"
              value={name}
              onChangeText={setName}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Relationship</Text>
                <View style={styles.relWrap}>
                  {(["CHILD", "SPOUSE", "PARENT", "DEPENDENT"] as FamilyRelationship[]).map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.relOption, relationship === r && styles.relOptionActive]}
                      onPress={() => setRelationship(r)}
                    >
                      <Text style={[styles.relOptionText, relationship === r && { color: "#FFFFFF", fontWeight: "700" }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ width: 80 }}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Yrs"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                />
              </View>
            </View>

            <Text style={styles.label}>Known Allergies (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Peanuts, Penicillin"
              value={allergies}
              onChangeText={setAllergies}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddMember}>
              <Text style={styles.saveBtnText}>Save Family Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  privacyBanner: { backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", padding: 12, borderRadius: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  privacyText: { fontSize: 12, color: "#115E59", flex: 1, lineHeight: 17 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionHeader: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0D9488", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  rel: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  allergyWrap: { backgroundColor: "#FEF2F2", padding: 8, borderRadius: 8 },
  allergyLabel: { fontSize: 11, color: "#DC2626", fontWeight: "600" },
  consentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  consentLabel: { fontSize: 12, color: "#4B5563", flex: 1, marginRight: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  label: { fontSize: 12, fontWeight: "700", color: "#475569" },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#F8FAFC" },
  relWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  relOption: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: "#F1F5F9" },
  relOptionActive: { backgroundColor: "#0D9488" },
  relOptionText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  saveBtn: { backgroundColor: "#0D9488", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" }
});
