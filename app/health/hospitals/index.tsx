import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

type NetworkFilter = "ALL" | "CASHLESS" | "NABL" | "NABH";
type SpecialtyFilter = "All" | "Cardiology" | "Ortho" | "Oncology" | "Neurology" | "Maternity" | "Multi-specialty";

interface Hospital {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  beds: number;
  cashless: boolean;
  nabl: boolean;
  nabh: boolean;
  specialties: string[];
  network: string;
  emergencyAvail: boolean;
  estWait: string;
}

const HOSPITALS: Hospital[] = [
  { id: "h1", name: "Apollo Hospitals", address: "Bannerghatta Road, Bengaluru", distance: "1.2 km", rating: 4.9, beds: 280, cashless: true, nabl: true, nabh: true, specialties: ["Cardiology", "Oncology", "Neurology", "Multi-specialty"], network: "Apollo Network", emergencyAvail: true, estWait: "< 15 min" },
  { id: "h2", name: "Manipal Hospital", address: "HAL Airport Road, Bengaluru", distance: "3.4 km", rating: 4.8, beds: 350, cashless: true, nabl: true, nabh: true, specialties: ["Ortho", "Cardiology", "Maternity", "Multi-specialty"], network: "Manipal Network", emergencyAvail: true, estWait: "< 20 min" },
  { id: "h3", name: "Fortis Hospital", address: "Cunningham Road, Bengaluru", distance: "4.1 km", rating: 4.7, beds: 190, cashless: true, nabl: true, nabh: false, specialties: ["Oncology", "Neurology", "Multi-specialty"], network: "Fortis Network", emergencyAvail: true, estWait: "< 25 min" },
  { id: "h4", name: "BGS Gleneagles Global", address: "Kengeri, Bengaluru", distance: "5.8 km", rating: 4.6, beds: 165, cashless: true, nabl: false, nabh: true, specialties: ["Cardiology", "Ortho", "Maternity"], network: "Global Network", emergencyAvail: false, estWait: "30–45 min" },
  { id: "h5", name: "Narayana Health City", address: "Bommasandra, Bengaluru", distance: "7.2 km", rating: 4.8, beds: 540, cashless: true, nabl: true, nabh: true, specialties: ["Cardiology", "Oncology", "Maternity", "Multi-specialty"], network: "Narayana Network", emergencyAvail: true, estWait: "< 15 min" },
  { id: "h6", name: "Sagar Hospitals", address: "Tilaknagar, Bengaluru", distance: "2.3 km", rating: 4.5, beds: 120, cashless: false, nabl: true, nabh: false, specialties: ["Ortho", "Maternity", "Multi-specialty"], network: "Independent", emergencyAvail: true, estWait: "< 30 min" },
];

export default function HospitalFinderScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>("ALL");
  const [specialtyFilter, setSpecialtyFilter] = useState<SpecialtyFilter>("All");

  const specialties: SpecialtyFilter[] = ["All", "Cardiology", "Ortho", "Oncology", "Neurology", "Maternity", "Multi-specialty"];

  const filtered = HOSPITALS.filter(h => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.address.toLowerCase().includes(search.toLowerCase())) return false;
    if (networkFilter === "CASHLESS" && !h.cashless) return false;
    if (networkFilter === "NABL" && !h.nabl) return false;
    if (networkFilter === "NABH" && !h.nabh) return false;
    if (specialtyFilter !== "All" && !h.specialties.includes(specialtyFilter)) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#0D9488", "#0F766E"]} style={styles.header}>
        <Text style={styles.headerTitle}>Find a Hospital</Text>
        <Text style={styles.headerSub}>Network hospitals near you • Cashless & empanelled</Text>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by hospital name or area..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Network Filters */}
      <View style={styles.filterBar}>
        {(["ALL", "CASHLESS", "NABL", "NABH"] as NetworkFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, networkFilter === f && styles.activeFilterChip]}
            onPress={() => setNetworkFilter(f)}
          >
            <Text style={[styles.filterChipText, networkFilter === f && styles.activeFilterChipText]}>
              {f === "ALL" ? "All" : f === "CASHLESS" ? "💳 Cashless" : f === "NABL" ? "NABL" : "NABH"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Specialty scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specialtyBar} contentContainerStyle={styles.specialtyBarContent}>
        {specialties.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.specChip, specialtyFilter === s && styles.activeSpecChip]}
            onPress={() => setSpecialtyFilter(s)}
          >
            <Text style={[styles.specChipText, specialtyFilter === s && styles.activeSpecChipText]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.resultCount}>{filtered.length} hospital{filtered.length !== 1 ? "s" : ""} found</Text>
        {filtered.map(h => (
          <View key={h.id} style={styles.hospitalCard}>
            {/* Card Header */}
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hospitalName}>{h.name}</Text>
                <View style={styles.addressRow}>
                  <Ionicons name="location" size={12} color="#6B7280" />
                  <Text style={styles.hospitalAddress}>{h.address}</Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <View style={styles.distBadge}>
                  <Ionicons name="navigate" size={11} color="#0D9488" />
                  <Text style={styles.distText}>{h.distance}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.ratingText}>{h.rating}</Text>
                </View>
              </View>
            </View>

            {/* Accreditation badges */}
            <View style={styles.badgeRow}>
              {h.cashless && <View style={styles.cashlessBadge}><Text style={styles.cashlessBadgeText}>💳 Cashless</Text></View>}
              {h.nabl && <View style={styles.accBadge}><Text style={styles.accBadgeText}>NABL</Text></View>}
              {h.nabh && <View style={styles.accBadge}><Text style={styles.accBadgeText}>NABH</Text></View>}
              {h.emergencyAvail && <View style={styles.emergBadge}><Text style={styles.emergBadgeText}>24×7 ER</Text></View>}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{h.beds}</Text>
                <Text style={styles.statLabel}>Beds</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{h.estWait}</Text>
                <Text style={styles.statLabel}>ER Wait</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { fontSize: 11 }]}>{h.network}</Text>
                <Text style={styles.statLabel}>Network</Text>
              </View>
            </View>

            {/* Specialties */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.specialtyChips}>
                {h.specialties.map(s => (
                  <View key={s} style={styles.specialtyChip}>
                    <Text style={styles.specialtyChipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => Alert.alert("Directions", `Opening maps for ${h.name}…`)}
              >
                <Ionicons name="navigate" size={14} color="#0D9488" />
                <Text style={styles.directionsBtnText}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bookOpdBtn}
                onPress={() => router.push("/health/appointments/book" as any)}
              >
                <Text style={styles.bookOpdBtnText}>Book OPD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.intimateClaimBtn}
                onPress={() => router.push("/health/benefits" as any)}
              >
                <Text style={styles.intimateClaimBtnText}>Intimate Claim</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No hospitals found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or search term</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { padding: 16, paddingBottom: 20, gap: 6 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "#99F6E4" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginTop: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B" },
  filterBar: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  activeFilterChip: { backgroundColor: "#CCFBF1", borderColor: "#0D9488" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  activeFilterChipText: { color: "#0F766E", fontWeight: "700" },
  specialtyBar: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", maxHeight: 44 },
  specialtyBarContent: { paddingHorizontal: 12, gap: 6, alignItems: "center" },
  specChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  activeSpecChip: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  specChipText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  activeSpecChipText: { color: "#FFFFFF", fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 40, gap: 12 },
  resultCount: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  hospitalCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  cardTop: { flexDirection: "row", gap: 10 },
  hospitalName: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  hospitalAddress: { fontSize: 11, color: "#6B7280" },
  distBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F0FDFA", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  distText: { fontSize: 11, fontWeight: "700", color: "#0D9488" },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cashlessBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cashlessBadgeText: { fontSize: 11, color: "#1D4ED8", fontWeight: "700" },
  accBadge: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "#DCFCE7" },
  accBadgeText: { fontSize: 11, color: "#166534", fontWeight: "700" },
  emergBadge: { backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  emergBadgeText: { fontSize: 11, color: "#DC2626", fontWeight: "700" },
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10 },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  statLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: "#E2E8F0" },
  specialtyChips: { flexDirection: "row", gap: 6 },
  specialtyChip: { backgroundColor: "#EDE9FE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  specialtyChipText: { fontSize: 11, color: "#7C3AED", fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 8 },
  directionsBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#0D9488", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  directionsBtnText: { fontSize: 12, fontWeight: "700", color: "#0D9488" },
  bookOpdBtn: { flex: 1, backgroundColor: "#0D9488", alignItems: "center", paddingVertical: 9, borderRadius: 10 },
  bookOpdBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  intimateClaimBtn: { flex: 1, backgroundColor: "#EEF2FF", alignItems: "center", paddingVertical: 9, borderRadius: 10 },
  intimateClaimBtnText: { color: "#4F46E5", fontWeight: "700", fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySub: { fontSize: 13, color: "#9CA3AF" },
});
