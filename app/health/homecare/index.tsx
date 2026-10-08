import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { HomecareProviderDto } from "@/types/health";

export default function HomecareScreen() {
  const [providers, setProviders] = useState<HomecareProviderDto[]>([]);

  useEffect(() => {
    healthService.getHomecareProviders().then(setProviders);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Verified Home Healthcare & Medical Equipment</Text>
        {providers.map(p => (
          <View key={p.id} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.avatar}>
                <Ionicons name="medical" size={24} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  {p.verifiedHealthcareBadge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>✓ Verified Care</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.role}>{p.role} • {p.experienceYears} yrs exp • Lic: {p.licenseNumber}</Text>
              </View>
              <Text style={styles.rating}>⭐ {p.rating}</Text>
            </View>
            <Text style={styles.desc}>{p.description}</Text>
            <View style={styles.footer}>
              <Text style={styles.rate}>₹{p.dailyRate}/day {p.hourlyRate > 0 ? `(₹${p.hourlyRate}/hr)` : ""}</Text>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => Alert.alert("Request Care Service", `Care request initiated for ${p.name}. Dispatch coordination in progress.`)}
              >
                <Text style={styles.bookBtnText}>Book Care</Text>
              </TouchableOpacity>
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
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  badge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: "#15803D", fontSize: 10, fontWeight: "bold" },
  role: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  rating: { fontSize: 12, fontWeight: "bold", color: "#B45309" },
  desc: { fontSize: 12, color: "#4B5563" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  rate: { fontSize: 14, fontWeight: "bold", color: "#0D9488" },
  bookBtn: { backgroundColor: "#0D9488", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 }
});