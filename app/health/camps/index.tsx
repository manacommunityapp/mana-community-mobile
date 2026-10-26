import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { HealthCampDto } from "@/types/health";

export default function HealthCampsScreen() {
  const [camps, setCamps] = useState<HealthCampDto[]>([]);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);

  useEffect(() => {
    healthService.getHealthCamps().then(setCamps);
  }, []);

  const handleRegister = async (camp: HealthCampDto) => {
    Alert.alert(
      "Reserve Private Camp Slot",
      `Reserve slot for "${camp.title}" at ${camp.venue} (${camp.date})? Vitals and results will be sent to your private Health Vault.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Slot",
          onPress: async () => {
            await healthService.registerForCamp(camp.id, "fam-1", camp.startTime);
            setRegisteredIds(prev => [...prev, camp.id]);
            Alert.alert("Reserved!", "Your private screening slot has been booked. Arrive at the clubhouse venue on time.");
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>⛺ Clubhouse Health Camps</Text>
          <Text style={styles.bannerSub}>
            Preventive health screening drives organized directly at our Clubhouse with accredited hospital partners. Private results delivered straight to your Health Vault.
          </Text>
          <View style={styles.lifecycleStrip}>
            <Text style={styles.lifecycleHeading}>🔄 End-to-End Privacy Flow:</Text>
            <Text style={styles.lifecycleText}>
              1. Admin publishes camp • 2. Private resident slot booking • 3. Provider on-site screening • 4. Private results to Vault • 5. Admin sees aggregate counts only
            </Text>
          </View>
        </View>

        {camps.map(camp => {
          const isRegistered = registeredIds.includes(camp.id);
          return (
            <View key={camp.id} style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{camp.campCategory.replace("_", " ")}</Text>
                </View>
                <View style={[styles.priceTag, camp.isFree ? styles.freeTag : styles.paidTag]}>
                  <Text style={[styles.priceTagText, camp.isFree ? styles.freeText : styles.paidText]}>
                    {camp.isFree ? "FREE DRIVE" : `₹${camp.feePerResident}`}
                  </Text>
                </View>
              </View>

              <Text style={styles.title}>{camp.title}</Text>
              <Text style={styles.partner}>Partner: <Text style={styles.partnerBold}>{camp.partnerProviderName}</Text></Text>
              <Text style={styles.desc}>{camp.description}</Text>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="#0D9488" />
                  <Text style={styles.infoText}>{camp.venue}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color="#0D9488" />
                  <Text style={styles.infoText}>{camp.date} ({camp.startTime} - {camp.endTime})</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="people-outline" size={14} color="#0D9488" />
                  <Text style={styles.infoText}>Available Slots: <Text style={{ fontWeight: "700", color: "#0F766E" }}>{camp.availableSlots} / {camp.totalSlots}</Text></Text>
                </View>
              </View>

              <View style={styles.servicesWrap}>
                {camp.servicesIncluded.map((s, idx) => (
                  <View key={idx} style={styles.serviceChip}>
                    <Text style={styles.serviceText}>✓ {s}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                disabled={isRegistered}
                style={[styles.btn, isRegistered ? styles.btnDisabled : styles.btnActive]}
                onPress={() => handleRegister(camp)}
              >
                <Text style={[styles.btnText, isRegistered && { color: "#64748B" }]}>
                  {isRegistered ? "Slot Reserved ✓" : "Reserve Private Slot"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  banner: {
    backgroundColor: "#0F766E",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16
  },
  bannerTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginBottom: 4 },
  bannerSub: { fontSize: 12, color: "#CCFBF1", lineHeight: 18 },
  lifecycleStrip: { backgroundColor: "rgba(255, 255, 255, 0.12)", borderRadius: 10, padding: 8, marginTop: 8 },
  lifecycleHeading: { fontSize: 10, fontWeight: "bold", color: "#A7F3D0" },
  lifecycleText: { fontSize: 10, color: "#E6FFFA", marginTop: 2, lineHeight: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  badge: { backgroundColor: "#F0FDFA", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#CCFBF1" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#0F766E" },
  priceTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  freeTag: { backgroundColor: "#DCFCE7" },
  paidTag: { backgroundColor: "#EFF6FF" },
  priceTagText: { fontSize: 11, fontWeight: "800" },
  freeText: { color: "#166534" },
  paidText: { color: "#1E40AF" },
  title: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginTop: 4 },
  partner: { fontSize: 12, color: "#64748B", marginTop: 2 },
  partnerBold: { fontWeight: "700", color: "#0D9488" },
  desc: { fontSize: 12, color: "#475569", marginTop: 6, lineHeight: 17 },
  infoBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10, marginTop: 10, gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, color: "#334155" },
  servicesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  serviceChip: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  serviceText: { fontSize: 11, color: "#334155", fontWeight: "500" },
  btn: { marginTop: 14, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnActive: { backgroundColor: "#0D9488" },
  btnDisabled: { backgroundColor: "#E2E8F0" },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 }
});
