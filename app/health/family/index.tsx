import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { FamilyMemberDto } from "@/types/health";

export default function FamilyHealthScreen() {
  const [family, setFamily] = useState<FamilyMemberDto[]>([]);

  useEffect(() => {
    healthService.getFamilyMembers().then(setFamily);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.privacyBanner}>
          <Ionicons name="lock-closed" size={18} color="#0F766E" />
          <Text style={styles.privacyText}>
            <strong>Privacy Rule:</strong> Family medical records are never shared automatically. Each family profile operates with strict isolated consent.
          </Text>
        </View>

        <Text style={styles.sectionHeader}>Family Profiles ({family.length})</Text>
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
            <View style={styles.consentRow}>
              <Text style={styles.consentLabel}>Consent to share records with consulting doctors</Text>
              <Switch value={m.consentToShareRecords} trackColor={{ true: "#0D9488", false: "#D1D5DB" }} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  privacyBanner: { backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", padding: 12, borderRadius: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  privacyText: { fontSize: 12, color: "#115E59", flex: 1 },
  sectionHeader: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  rel: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  allergyWrap: { backgroundColor: "#FEF2F2", padding: 8, borderRadius: 8 },
  allergyLabel: { fontSize: 11, color: "#DC2626", fontWeight: "600" },
  consentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  consentLabel: { fontSize: 12, color: "#4B5563", flex: 1, marginRight: 10 }
});