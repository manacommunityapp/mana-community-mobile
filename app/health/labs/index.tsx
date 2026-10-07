import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { LabPackageDto } from "@/types/health";

export default function LabsScreen() {
  const [packages, setPackages] = useState<LabPackageDto[]>([]);

  useEffect(() => {
    healthService.getLabPackages().then(setPackages);
  }, []);

  const handleBook = (pkg: LabPackageDto) => {
    Alert.alert(
      "Book Sample Collection",
      `Book ${pkg.name} for ₹${pkg.price}? A phlebotomist will arrive tomorrow between 7:00 AM - 9:00 AM.`,
      [{ text: "Cancel", style: "cancel" }, { text: "Confirm Booking", onPress: () => Alert.alert("Success", "Phlebotomist booked for doorstep sample collection.") }]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Preventive Health Packages & Home Collection</Text>
        {packages.map(pkg => (
          <View key={pkg.id} style={styles.card}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pkgName}>{pkg.name}</Text>
                <Text style={styles.pkgCount}>{pkg.testCount} Parameters Included • Reports in {pkg.reportTurnaroundHours}h</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.price}>₹{pkg.price}</Text>
                <Text style={styles.origPrice}>₹{pkg.originalPrice}</Text>
              </View>
            </View>

            <View style={styles.testsWrap}>
              {pkg.testsIncluded.map((t, idx) => (
                <View key={idx} style={styles.testBadge}>
                  <Text style={styles.testText}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={styles.footerRow}>
              <View style={styles.perk}>
                <Ionicons name="home" size={14} color="#059669" />
                <Text style={styles.perkText}>Home Collection</Text>
              </View>
              <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(pkg)}>
                <Text style={styles.bookBtnText}>Book Slot</Text>
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
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pkgName: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  pkgCount: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  price: { fontSize: 18, fontWeight: "bold", color: "#0D9488" },
  origPrice: { fontSize: 12, color: "#9CA3AF", textDecorationLine: "line-through" },
  testsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  testBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  testText: { fontSize: 11, color: "#374151" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  perk: { flexDirection: "row", alignItems: "center", gap: 4 },
  perkText: { fontSize: 12, color: "#059669", fontWeight: "600" },
  bookBtn: { backgroundColor: "#0D9488", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 }
});