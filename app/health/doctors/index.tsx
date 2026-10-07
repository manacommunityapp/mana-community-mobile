import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { DoctorDto } from "@/types/health";

const SPECIALTIES = ["All", "Cardiologist", "Pediatrician", "Orthopedic Surgeon", "Dermatologist"];

export default function DoctorsListScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    healthService.getDoctors().then(setDoctors);
  }, []);

  const filtered = doctors.filter(doc => {
    const matchesSpec = selectedSpecialty === "All" || doc.specialty === selectedSpecialty;
    const matchesQuery = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpec && matchesQuery;
  });

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          placeholder="Search doctors, specialty, clinic..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Specialty Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
        {SPECIALTIES.map(spec => (
          <TouchableOpacity
            key={spec}
            style={[styles.chip, selectedSpecialty === spec && styles.activeChip]}
            onPress={() => setSelectedSpecialty(spec)}
          >
            <Text style={[styles.chipText, selectedSpecialty === spec && styles.activeChipText]}>{spec}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Doctor Cards */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filtered.map(doc => (
          <TouchableOpacity
            key={doc.id}
            style={styles.card}
            onPress={() => router.push(`/health/doctors/${doc.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.topRow}>
              <View style={styles.avatarWrap}>
                <Ionicons name="person" size={24} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.name}>{doc.name}</Text>
                  {doc.verifiedBadge && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>✓ Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.specialty}>{doc.specialty}</Text>
                <Text style={styles.quals}>{doc.qualifications.join(", ")} • {doc.experienceYears} yrs exp</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {doc.rating}</Text>
              </View>
            </View>

            <View style={styles.trustBanner}>
              <Ionicons name="shield-checkmark" size={14} color="#065F46" />
              <Text style={styles.trustText}>{doc.verifiedCommunityConsultations} community consultations</Text>
            </View>

            <View style={styles.clinicRow}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.clinicText} numberOfLines={1}>{doc.clinicName}</Text>
            </View>

            <View style={styles.footer}>
              <View>
                <Text style={styles.feeText}>₹{doc.consultationFee}</Text>
                <Text style={styles.slotText}>Next: {doc.nextAvailableSlot}</Text>
              </View>
              <View style={styles.bookBtn}>
                <Text style={styles.bookBtnText}>Book Appointment</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
  input: { flex: 1, fontSize: 14, color: "#111827" },
  chipsScroll: { maxHeight: 40, marginBottom: 8 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E5E7EB" },
  activeChip: { backgroundColor: "#0D9488" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  activeChipText: { color: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  specialty: { fontSize: 13, color: "#0D9488", fontWeight: "600", marginTop: 1 },
  quals: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  verifiedBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { color: "#1D4ED8", fontSize: 10, fontWeight: "bold" },
  ratingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: "bold", color: "#92400E" },
  trustBanner: { backgroundColor: "#ECFDF5", padding: 8, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  trustText: { fontSize: 11, color: "#065F46", fontWeight: "600" },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  clinicText: { fontSize: 12, color: "#6B7280", flex: 1 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  feeText: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  slotText: { fontSize: 11, color: "#059669" },
  bookBtn: { backgroundColor: "#0D9488", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 }
});