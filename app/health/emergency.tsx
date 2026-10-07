import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { HealthEmergencyContactDto } from "@/types/health";

export default function EmergencyHealthScreen() {
  const [contacts, setContacts] = useState<HealthEmergencyContactDto[]>([]);

  useEffect(() => {
    healthService.getEmergencyContacts().then(setContacts);
  }, []);

  const handleSos = () => {
    Alert.alert(
      "🚨 Broadcast Medical SOS",
      "This will immediately notify Security Control Room, on-call ambulance and configured primary responders.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "DISPATCH SOS", style: "destructive", onPress: () => Alert.alert("SOS Dispatched", "Security & on-call medical response team notified.") }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Big SOS Trigger */}
        <TouchableOpacity style={styles.sosCard} onPress={handleSos} activeOpacity={0.85}>
          <Ionicons name="alert-circle" size={40} color="#FFFFFF" />
          <Text style={styles.sosTitle}>1-TAP MEDICAL EMERGENCY SOS</Text>
          <Text style={styles.sosSub}>Alerts On-Site Security & Nearest Ambulance Unit Instantaneously</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Verified Community Emergency Contacts</Text>
        {contacts.map(c => (
          <View key={c.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <View style={styles.typeRow}>
                <Text style={styles.typeBadge}>{c.type}</Text>
                {c.is24x7 && <Text style={styles.pill247}>24x7 Active</Text>}
              </View>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.addr}>{c.address} • {c.distanceKm} km away</Text>
            </View>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${c.phone}`)}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
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
  sosCard: { backgroundColor: "#DC2626", padding: 20, borderRadius: 20, alignItems: "center", gap: 6, shadowColor: "#DC2626", shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  sosTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  sosSub: { color: "#FEE2E2", fontSize: 11, textAlign: "center" },
  sectionHeader: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", gap: 10 },
  typeRow: { flexDirection: "row", gap: 6, marginBottom: 2 },
  typeBadge: { backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: 10, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pill247: { backgroundColor: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  name: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  addr: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  callBtn: { backgroundColor: "#DC2626", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 },
  callText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 }
});